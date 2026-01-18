import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, hasMinimumRole, ROLES, hashPassword, UserRole } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verify authentication
    const token = extractToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Check role permissions
    const isSuperAdmin = payload.role === ROLES.SUPER_ADMIN;
    const isManager = payload.role === ROLES.MANAGER;

    if (req.method === 'GET') {
        try {
            let users;
            if (isSuperAdmin) {
                // Super Admin can see all users
                users = await prisma.user.findMany({
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        branchId: true,
                        isActive: true,
                        createdAt: true,
                        branch: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
            } else if (isManager) {
                // Manager can only see staff in their branch
                users = await prisma.user.findMany({
                    where: {
                        branchId: payload.branchId,
                        role: ROLES.STAFF
                    },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        branchId: true,
                        isActive: true,
                        createdAt: true,
                        branch: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
            } else {
                return res.status(403).json({ error: 'Forbidden' });
            }

            return res.status(200).json(users);
        } catch (error) {
            console.error('Get users error:', error);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { email, password, name, role, branchId } = req.body;

            // Validate required fields
            if (!email || !password || !name || !role) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Check role creation permissions
            if (isSuperAdmin) {
                // Super Admin can create any role
            } else if (isManager) {
                // Manager can only create STAFF for their own branch
                if (role !== ROLES.STAFF) {
                    return res.status(403).json({ error: 'Anda hanya bisa menambah Staff' });
                }
                if (branchId !== payload.branchId) {
                    return res.status(403).json({ error: 'Anda hanya bisa menambah Staff di cabang Anda' });
                }
            } else {
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Check if email already exists
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return res.status(400).json({ error: 'Email sudah terdaftar' });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Create user
            const user = await prisma.user.create({
                data: {
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    name,
                    role,
                    branchId: role === ROLES.SUPER_ADMIN ? null : branchId,
                    isActive: true
                },
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

            return res.status(201).json(user);
        } catch (error) {
            console.error('Create user error:', error);
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
