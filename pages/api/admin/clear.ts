import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.setHeader('Allow', ['DELETE', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // Auth Check - Super Admin
    const token = extractToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = verifyToken(token);
    if (!payload || payload.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden: Super Admin only' });
    }

    try {
        const { targetBranchId } = req.query;

        let whereClause: any = {};
        if (typeof targetBranchId === 'string' && targetBranchId) {
            whereClause = { branchId: targetBranchId };
        }

        // Clean transactions & expenses
        await prisma.saleDetail.deleteMany({
            where: whereClause.branchId ? { sale: { branchId: whereClause.branchId } } : {}
        });
        await prisma.sale.deleteMany({ where: whereClause });
        await prisma.expense.deleteMany({ where: whereClause });
        await prisma.income.deleteMany({ where: whereClause });

        return res.status(200).json({
            success: true,
            message: 'Seluruh data transaksi, pengeluaran, dan pemasukan berhasil dibersihkan.'
        });

    } catch (error: any) {
        console.error('Clear database error:', error);
        return res.status(500).json({ error: error.message || 'Failed to clear database' });
    }
}
