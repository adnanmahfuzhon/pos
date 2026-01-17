import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const branches = await prisma.branch.findMany();
        return res.status(200).json(branches);
    } else if (req.method === 'POST') {
        try {
            const { id, name, address } = req.body;
            const branch = await prisma.branch.create({
                data: { id, name, address }
            });
            return res.status(200).json(branch);
        } catch (error: any) {
            console.error('Branch creation error:', error);
            return res.status(500).json({
                error: 'Failed to create branch',
                details: error.message || 'Unknown error',
                code: error.code || null
            });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
