import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const products = await prisma.product.findMany({
            include: { ingredients: true }
        });
        return res.status(200).json(products);
    } else if (req.method === 'POST') {
        try {
            const { id, ingredients, ...data } = req.body;
            const product = await prisma.product.create({
                data: {
                    id,
                    ...data,
                    ingredients: {
                        create: (ingredients || []).map((ing: any) => ({
                            ingredientId: ing.ingredientId,
                            quantity: ing.quantity
                        }))
                    }
                }
            });
            return res.status(200).json(product);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create product' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
