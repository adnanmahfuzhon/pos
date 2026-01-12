import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr) return res.status(400).json({ error: 'Missing ID' });

    if (req.method === 'PUT') {
        try {
            const { priceHistory, recipe, ...data } = req.body;
            const ingredient = await prisma.ingredient.update({
                where: { id: idStr },
                data: data
            });
            return res.status(200).json(ingredient);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update ingredient' });
        }
    } else if (req.method === 'DELETE') {
        try {
            await prisma.ingredient.delete({ where: { id: idStr } });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete ingredient' });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
