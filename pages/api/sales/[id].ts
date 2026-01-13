import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr) return res.status(400).json({ error: 'Missing ID' });

    if (req.method === 'PUT') {
        try {
            const { details: newDetails, ...data } = req.body;

            // 1. Fetch current state outside transaction to calculate net changes
            const oldSale = await prisma.sale.findUnique({
                where: { id: idStr },
                include: { details: true }
            });
            if (!oldSale) throw new Error('Sale not found');

            // 2. Fetch all unique product IDs involved
            const productIds = Array.from(new Set([
                ...oldSale.details.map(d => d.productId),
                ...newDetails.map((d: any) => d.productId)
            ]));

            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                include: { ingredients: true }
            });

            const productMap = new Map(products.map(p => [p.id, p]));

            // 3. Calculate net stock changes for each ingredient
            // Positive = increment (restoring stock), Negative = decrement (consuming stock)
            const ingredientChanges = new Map<string, number>();

            // Reverse old sale impacts
            for (const detail of oldSale.details) {
                const product = productMap.get(detail.productId);
                if (product?.ingredients) {
                    for (const pIng of product.ingredients) {
                        const change = pIng.quantity * detail.quantity;
                        ingredientChanges.set(pIng.ingredientId, (ingredientChanges.get(pIng.ingredientId) || 0) + change);
                    }
                }
            }

            // Apply new sale impacts
            for (const detail of newDetails) {
                const product = productMap.get(detail.productId);
                if (product?.ingredients) {
                    for (const pIng of product.ingredients) {
                        const change = pIng.quantity * detail.quantity;
                        ingredientChanges.set(pIng.ingredientId, (ingredientChanges.get(pIng.ingredientId) || 0) - change);
                    }
                }
            }

            // 4. Perform database operations in a lean transaction
            const updatedSale = await prisma.$transaction(async (tx) => {
                // Update ingredients based on net changes
                for (const [ingredientId, change] of ingredientChanges.entries()) {
                    if (change !== 0) {
                        await tx.ingredient.update({
                            where: { id: ingredientId },
                            data: { stock: { increment: change } }
                        });
                    }
                }

                // Delete old details
                await tx.saleDetail.deleteMany({ where: { saleId: idStr } });

                // Update sale and create new details
                return await tx.sale.update({
                    where: { id: idStr },
                    data: {
                        ...data,
                        details: {
                            create: newDetails
                        }
                    },
                    include: { details: true }
                });
            });

            return res.status(200).json(updatedSale);
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: error.message || 'Failed to update sale' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const sale = await prisma.sale.findUnique({
                where: { id: idStr },
                include: { details: true }
            });

            if (!sale) return res.status(404).json({ error: 'Sale not found' });

            // Calculate stock restoration
            const productIds = sale.details.map(d => d.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                include: { ingredients: true }
            });
            const productMap = new Map(products.map(p => [p.id, p]));

            const ingredientRestorations = new Map<string, number>();
            for (const detail of sale.details) {
                const product = productMap.get(detail.productId);
                if (product?.ingredients) {
                    for (const pIng of product.ingredients) {
                        const change = pIng.quantity * detail.quantity;
                        ingredientRestorations.set(pIng.ingredientId, (ingredientRestorations.get(pIng.ingredientId) || 0) + change);
                    }
                }
            }

            await prisma.$transaction(async (tx) => {
                for (const [ingredientId, amount] of ingredientRestorations.entries()) {
                    await tx.ingredient.update({
                        where: { id: ingredientId },
                        data: { stock: { increment: amount } }
                    });
                }
                await tx.saleDetail.deleteMany({ where: { saleId: idStr } });
                await tx.sale.delete({ where: { id: idStr } });
            });

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to delete sale' });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
