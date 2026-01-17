import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const expenses = await prisma.expense.findMany();
        return res.status(200).json(expenses);
    } else if (req.method === 'POST') {
        try {
            const { id, branchId, ...data } = req.body;
            const expense = await prisma.expense.create({
                data: { id, ...data, branchId: branchId || 'default' }
            });
            return res.status(200).json(expense);
        } catch (error: any) {
            console.error('Expense creation error:', error);
            return res.status(500).json({
                error: 'Failed to create expense',
                details: error.message || 'Unknown error',
                code: error.code || null
            });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
