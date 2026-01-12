import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr) return res.status(400).json({ error: 'Missing ID' });

    if (req.method === 'PUT') {
        try {
            const { id: _, ingredients, ...data } = req.body;

            const product = await prisma.$transaction(async (tx) => {
                // Delete existing ingredients relations
                await tx.productIngredient.deleteMany({ where: { productId: idStr } });

                return tx.product.update({
                    where: { id: idStr },
                    data: {
                        ...data,
                        ingredients: {
                            create: (ingredients || []).map((ing: any) => ({
                                ingredientId: ing.ingredientId,
                                quantity: ing.quantity
                            }))
                        }
                    },
                    include: { ingredients: true }
                });
            });

            return res.status(200).json(product);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to update product' });
        }
    } else if (req.method === 'DELETE') {
        try {
            // Cascade delete manually since not defined in schema
            await prisma.productIngredient.deleteMany({ where: { productId: idStr } });
            await prisma.product.delete({ where: { id: idStr } });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete product' });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
