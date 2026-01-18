
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

            const incomes = await prisma.income.findMany({
                where: whereClause,
                orderBy: { timestamp: 'desc' },
                take: 100
            });
            return res.status(200).json(incomes);
        } catch (error) {
            console.error('Get incomes error:', error);
            return res.status(500).json({ error: 'Failed to fetch incomes' });
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

            // [NEW] Validate Branch Existence
            const branchExists = await prisma.branch.findUnique({
                where: { id: targetBranchId as string }
            });
            if (!branchExists) return res.status(400).json({ error: `Invalid Branch ID (${targetBranchId}). Re-select branch.` });

            const income = await prisma.income.create({
                data: {
                    ...data,
                    branchId: targetBranchId,
                    timestamp: data.timestamp || Date.now()
                }
            });
            return res.status(200).json(income);
        } catch (error) {
            console.error('Create income error:', error);
            return res.status(500).json({ error: 'Failed to create income' });
        }
    }

    else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
