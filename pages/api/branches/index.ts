import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Auth check - only authenticated users can access
    const token = extractToken(req.headers.authorization);
    const payload = token ? verifyToken(token) : null;

    if (req.method === 'GET') {
        try {
            const branches = await prisma.branch.findMany({
                include: {
                    _count: {
                        select: {
                            users: true,
                            products: true,
                            ingredients: true
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });
            return res.status(200).json(branches);
        } catch (error) {
            console.error('Get branches error:', error);
            return res.status(500).json({ error: 'Failed to fetch branches' });
        }
    }

    // POST, PUT, DELETE require Super Admin
    if (!payload || payload.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Hanya Super Admin yang bisa mengelola cabang' });
    }

    if (req.method === 'POST') {
        try {
            const { name } = req.body;
            if (!name?.trim()) {
                return res.status(400).json({ error: 'Nama cabang wajib diisi' });
            }

            const branch = await prisma.branch.create({
                data: { name: name.trim() },
                include: {
                    _count: {
                        select: {
                            users: true,
                            products: true,
                            ingredients: true
                        }
                    }
                }
            });
            return res.status(201).json(branch);
        } catch (error: any) {
            console.error('Branch creation error:', error);
            return res.status(500).json({ error: 'Gagal membuat cabang' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
