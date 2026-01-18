
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

            const ingredients = await prisma.ingredient.findMany({
                where: whereClause,
                orderBy: { name: 'asc' }
            });
            return res.status(200).json(ingredients);
        } catch (error) {
            console.error('Get ingredients error:', error);
            return res.status(500).json({ error: 'Failed to fetch ingredients' });
        }
    }

    else if (req.method === 'POST') {
        try {
            if (payload.role === ROLES.STAFF && !payload.permissions?.includes('can_manage_ingredients')) {
                // Usually staff don't create ingredients, but maybe permissions allow it?
                // Let's stick to safe defaults: Only SA and Manager
                if (payload.role === ROLES.STAFF) return res.status(403).json({ error: 'Forbidden' });
            }
            // Actually, sticking to Role based is safer for now.
            if (payload.role === ROLES.STAFF) return res.status(403).json({ error: 'Forbidden' });

            const { branchId, ...data } = req.body;
            let targetBranchId = payload.branchId;

            if (isSuperAdmin) {
                if (!branchId) return res.status(400).json({ error: 'Branch ID required' });
                targetBranchId = branchId;
            }

            const ingredient = await prisma.ingredient.create({
                data: {
                    ...data,
                    branchId: targetBranchId
                }
            });
            return res.status(200).json(ingredient);
        } catch (error) {
            console.error('Create ingredient error:', error);
            return res.status(500).json({ error: 'Failed to create ingredient' });
        }
    }

    else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
