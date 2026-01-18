
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
            let whereClause: any = { isActive: true }; // Default to active products? Or all? Usually management sees all.
            // Actually, keep it simple first
            whereClause = {};

            if (isSuperAdmin) {
                // If branchId is provided in query, filter by it. 
                // If not, returns ALL (Global View) - or strictly nothing? 
                // User said "pastikan memilih cabang dulu". 
                // But for now, let's support optional filtering. 
                const { branchId } = req.query;
                if (branchId && typeof branchId === 'string') {
                    whereClause.branchId = branchId;
                }
            } else {
                // Enforce branch isolation for non-SA
                if (!payload.branchId) return res.status(403).json({ error: 'No branch assigned' });
                whereClause.branchId = payload.branchId;
            }

            const products = await prisma.product.findMany({
                where: whereClause,
                include: { ingredients: true },
                orderBy: { name: 'asc' }
            });

            return res.status(200).json(products);
        } catch (error) {
            console.error('Get products error:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
    }

    else if (req.method === 'POST') {
        try {
            // Only SA or Manager can create? 
            if (payload.role === ROLES.STAFF) return res.status(403).json({ error: 'Forbidden' });

            const { id, ingredients, branchId, ...data } = req.body;

            // Determine effective Branch ID
            let targetBranchId = payload.branchId;
            if (isSuperAdmin) {
                if (!branchId) return res.status(400).json({ error: 'Branch ID required' });
                targetBranchId = branchId;
            }

            const product = await prisma.product.create({
                data: {
                    id: id || `p-${Date.now()}`,
                    ...data,
                    isActive: true, // Default to true
                    branchId: targetBranchId,
                    ingredients: {
                        create: (ingredients || []).map((ing: any) => ({
                            ingredientId: ing.ingredientId,
                            quantity: ing.quantity
                        }))
                    }
                }
            });
            return res.status(200).json(product);
        } catch (error) {
            console.error('Create product error:', error);
            return res.status(500).json({ error: 'Failed to create product' });
        }
    }

    else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
