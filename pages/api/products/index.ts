import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const products = await prisma.product.findMany({
            include: { ingredients: true }
        });
        const parsedProducts = products.map(p => ({
            ...p,
            channelPrices: p.channelPrices ? JSON.parse(p.channelPrices) : {}
        }));
        return res.status(200).json(parsedProducts);
    } else if (req.method === 'POST') {
        try {
            const { id, ingredients, channelPrices, ...data } = req.body;
            const product = await prisma.product.create({
                data: {
                    id,
                    ...data,
                    channelPrices: JSON.stringify(channelPrices || {}),
                    ingredients: {
                        create: ingredients // { ingredientId, quantity }
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
