import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr) return res.status(400).json({ error: 'Missing ID' });

    if (req.method === 'PUT') {
        try {
            const { details: newDetails, ...data } = req.body;

            return await prisma.$transaction(async (tx) => {
                // 1. Get old sale to reverse stock
                const oldSale = await tx.sale.findUnique({
                    where: { id: idStr },
                    include: { details: true }
                });

                if (!oldSale) throw new Error('Sale not found');

                // 2. Reverse old stock reduction
                for (const detail of oldSale.details) {
                    const product = await tx.product.findUnique({
                        where: { id: detail.productId },
                        include: { ingredients: true }
                    });

                    if (product && product.ingredients) {
                        for (const pIng of product.ingredients) {
                            await tx.ingredient.update({
                                where: { id: pIng.ingredientId },
                                data: { stock: { increment: pIng.quantity * detail.quantity } }
                            });
                        }
                    }
                }

                // 3. Delete old details
                await tx.saleDetail.deleteMany({ where: { saleId: idStr } });

                // 4. Update sale and create new details
                const updatedSale = await tx.sale.update({
                    where: { id: idStr },
                    data: {
                        ...data,
                        details: {
                            create: newDetails
                        }
                    },
                    include: { details: true }
                });

                // 5. Apply new stock reduction
                for (const detail of newDetails) {
                    const product = await tx.product.findUnique({
                        where: { id: detail.productId },
                        include: { ingredients: true }
                    });

                    if (product && product.ingredients) {
                        for (const pIng of product.ingredients) {
                            await tx.ingredient.update({
                                where: { id: pIng.ingredientId },
                                data: { stock: { decrement: pIng.quantity * detail.quantity } }
                            });
                        }
                    }
                }

                return res.status(200).json(updatedSale);
            });
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: error.message || 'Failed to update sale' });
        }
    } else if (req.method === 'DELETE') {
        try {
            return await prisma.$transaction(async (tx) => {
                const sale = await tx.sale.findUnique({
                    where: { id: idStr },
                    include: { details: true }
                });

                if (sale) {
                    // Restore stock
                    for (const detail of sale.details) {
                        const product = await tx.product.findUnique({
                            where: { id: detail.productId },
                            include: { ingredients: true }
                        });

                        if (product && product.ingredients) {
                            for (const pIng of product.ingredients) {
                                await tx.ingredient.update({
                                    where: { id: pIng.ingredientId },
                                    data: { stock: { increment: pIng.quantity * detail.quantity } }
                                });
                            }
                        }
                    }
                }

                await tx.saleDetail.deleteMany({ where: { saleId: idStr } });
                await tx.sale.delete({ where: { id: idStr } });
                return res.status(200).json({ success: true });
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete sale' });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
