import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const sales = await prisma.sale.findMany({
            include: { details: true }
        });
        return res.status(200).json(sales);
    } else if (req.method === 'POST') {
        try {
            const { id, details, branchId, ...data } = req.body;
            const targetBranchId = branchId || 'default';

            // Ensure branch exists
            await prisma.branch.upsert({
                where: { id: targetBranchId },
                update: {},
                create: { id: targetBranchId, name: 'Default Branch' }
            });

            const sale = await prisma.sale.create({
                data: {
                    id,
                    ...data,
                    branchId: targetBranchId,
                    details: {
                        create: details
                    }
                },
                include: { details: true }
            });

            // Update stock
            for (const detail of details) {
                const product = await prisma.product.findUnique({
                    where: { id: detail.productId },
                    include: { ingredients: true }
                });

                if (product && product.ingredients) {
                    for (const pIng of product.ingredients) {
                        await prisma.ingredient.update({
                            where: { id: pIng.ingredientId },
                            data: { stock: { decrement: pIng.quantity * detail.quantity } }
                        });
                    }
                }
            }

            return res.status(200).json(sale);
        } catch (error: any) {
            console.error('Sale creation error:', error);
            return res.status(500).json({
                error: 'Failed to create sale',
                details: error.message || 'Unknown error',
                code: error.code || null
            });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
