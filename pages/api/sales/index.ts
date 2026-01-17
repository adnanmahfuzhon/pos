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

            // Use transaction for atomic operations
            const result = await prisma.$transaction(async (tx) => {
                // Try to create sale, catch foreign key error and create branch if needed
                try {
                    const sale = await tx.sale.create({
                        data: {
                            id,
                            ...data,
                            branchId: targetBranchId,
                            details: { create: details }
                        },
                        include: { details: true }
                    });
                    return sale;
                } catch (e: any) {
                    if (e.code === 'P2003') {
                        // Branch doesn't exist, create it
                        await tx.branch.create({
                            data: { id: targetBranchId, name: 'Default Branch' }
                        });
                        // Retry sale creation
                        return await tx.sale.create({
                            data: {
                                id,
                                ...data,
                                branchId: targetBranchId,
                                details: { create: details }
                            },
                            include: { details: true }
                        });
                    }
                    throw e;
                }
            });

            // Batch collect all stock decrements
            const stockUpdates: { ingredientId: string; decrementBy: number }[] = [];

            for (const detail of details) {
                const product = await prisma.product.findUnique({
                    where: { id: detail.productId },
                    select: { ingredients: true }
                });

                if (product?.ingredients) {
                    for (const pIng of product.ingredients) {
                        const existing = stockUpdates.find(u => u.ingredientId === pIng.ingredientId);
                        if (existing) {
                            existing.decrementBy += pIng.quantity * detail.quantity;
                        } else {
                            stockUpdates.push({
                                ingredientId: pIng.ingredientId,
                                decrementBy: pIng.quantity * detail.quantity
                            });
                        }
                    }
                }
            }

            // Execute all stock updates in parallel
            await Promise.all(
                stockUpdates.map(u =>
                    prisma.ingredient.update({
                        where: { id: u.ingredientId },
                        data: { stock: { decrement: u.decrementBy } }
                    })
                )
            );

            return res.status(200).json(result);
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
