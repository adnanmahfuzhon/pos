
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = extractToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const isSuperAdmin = payload.role === ROLES.SUPER_ADMIN;

    if (req.method === 'GET') {
        try {
            let whereClause: any = {};

            if (isSuperAdmin) {
                const { branchId } = req.query;
                if (branchId && typeof branchId === 'string') {
                    whereClause.branchId = branchId;
                }
            } else {
                if (!payload.branchId) return res.status(403).json({ error: 'No branch assigned' });
                whereClause.branchId = payload.branchId;
            }

            const expenses = await prisma.expense.findMany({
                where: whereClause,
                orderBy: { timestamp: 'desc' }, // Latest first
                take: 100 // Limit for performance? Maybe.
            });
            return res.status(200).json(expenses);
        } catch (error) {
            console.error('Get expenses error:', error);
            return res.status(500).json({ error: 'Failed to fetch expenses' });
        }
    }

    else if (req.method === 'POST') {
        try {
            const { branchId, ...data } = req.body;
            let targetBranchId = payload.branchId;

            if (isSuperAdmin) {
                if (!branchId) return res.status(400).json({ error: 'Branch ID required' });
                targetBranchId = branchId;
            }

            const expense = await prisma.expense.create({
                data: {
                    ...data,
                    branchId: targetBranchId,
                    timestamp: data.timestamp || Date.now()
                }
            });
            return res.status(200).json(expense);
        } catch (error) {
            console.error('Create expense error:', error);
            return res.status(500).json({ error: 'Failed to create expense' });
        }
    }

    else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
