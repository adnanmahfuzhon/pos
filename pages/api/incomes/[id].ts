import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr) return res.status(400).json({ error: 'Missing ID' });

    if (req.method === 'PUT') {
        try {
            const { id: _, ...data } = req.body;
            const income = await prisma.income.update({
                where: { id: idStr },
                data: data
            });
            return res.status(200).json(income);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update income' });
        }
    } else if (req.method === 'DELETE') {
        try {
            await prisma.income.delete({ where: { id: idStr } });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete income' });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
