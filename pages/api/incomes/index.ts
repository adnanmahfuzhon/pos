import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const incomes = await prisma.income.findMany();
        return res.status(200).json(incomes);
    } else if (req.method === 'POST') {
        try {
            const { id, branchId, ...data } = req.body;
            const targetBranchId = branchId || 'default';

            // Try to create income, catch foreign key error and create branch if needed
            let income;
            try {
                income = await prisma.income.create({
                    data: { id, ...data, branchId: targetBranchId }
                });
            } catch (e: any) {
                if (e.code === 'P2003') {
                    await prisma.branch.create({
                        data: { id: targetBranchId, name: 'Default Branch' }
                    });
                    income = await prisma.income.create({
                        data: { id, ...data, branchId: targetBranchId }
                    });
                } else {
                    throw e;
                }
            }
            return res.status(200).json(income);
        } catch (error: any) {
            console.error('Income creation error:', error);
            return res.status(500).json({
                error: 'Failed to create income',
                details: error.message || 'Unknown error',
                code: error.code || null
            });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
