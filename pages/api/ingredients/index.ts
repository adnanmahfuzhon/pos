import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const ingredients = await prisma.ingredient.findMany();
        return res.status(200).json(ingredients);
    } else if (req.method === 'POST') {
        try {
            const { id, ...data } = req.body;
            const ingredient = await prisma.ingredient.create({
                data: { id, ...data }
            });
            return res.status(200).json(ingredient);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create ingredient' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
