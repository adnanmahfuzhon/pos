
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES, hashPassword } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = extractToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

    const isSuperAdmin = payload.role === ROLES.SUPER_ADMIN;
    const isManager = payload.role === ROLES.MANAGER;

    try {
        // Fetch target user to check permissions
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Permission check
        if (isManager) {
            // Manager can only modify STAFF in their own branch
            if (targetUser.role !== ROLES.STAFF || targetUser.branchId !== payload.branchId) {
                return res.status(403).json({ error: 'Forbidden: You can only manage staff in your branch' });
            }
        } else if (!isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (req.method === 'PUT') {
            const { name, email, password, role, branchId, isActive } = req.body;

            // Prepare update data
            const updateData: any = {};
            if (name) updateData.name = name;
            if (email) updateData.email = email.toLowerCase().trim();
            if (typeof isActive === 'boolean') updateData.isActive = isActive;

            // Allow role/branch update only if Super Admin (Managers constrained already)
            if (isSuperAdmin) {
                if (role) updateData.role = role;
                if (branchId !== undefined) updateData.branchId = branchId || null;
            }

            // Handle Password Update
            if (password && password.trim() !== '') {
                updateData.password = await hashPassword(password);
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    branchId: true,
                    isActive: true,
                    createdAt: true,
                    branch: { select: { id: true, name: true } }
                }
            });

            return res.status(200).json(updatedUser);
        }

        if (req.method === 'DELETE') {
            await prisma.user.delete({ where: { id } });
            return res.status(200).json({ message: 'User deleted successfully' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('User request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
