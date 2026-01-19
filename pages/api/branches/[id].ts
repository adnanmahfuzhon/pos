import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Auth check - only Super Admin can modify branches
    const token = extractToken(req.headers.authorization);
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Hanya Super Admin yang bisa mengelola cabang' });
    }

    if (req.method === 'PUT') {
        try {
            const { name, isActive } = req.body;

            const updateData: any = {};
            if (name !== undefined) updateData.name = name.trim();
            if (isActive !== undefined) updateData.isActive = isActive;

            const branch = await prisma.branch.update({
                where: { id },
                data: updateData,
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
            return res.status(200).json(branch);
        } catch (error: any) {
            console.error('Branch update error:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Cabang tidak ditemukan' });
            }
            return res.status(500).json({ error: 'Gagal mengupdate cabang' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Check if branch has related data
            const branch = await prisma.branch.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            users: true,
                            products: true,
                            ingredients: true,
                            sales: true,
                            expenses: true,
                            incomes: true
                        }
                    }
                }
            });

            if (!branch) {
                return res.status(404).json({ error: 'Cabang tidak ditemukan' });
            }

            const totalRelated = branch._count.users + branch._count.products +
                branch._count.ingredients + branch._count.sales +
                branch._count.expenses + branch._count.incomes;

            if (totalRelated > 0) {
                return res.status(400).json({
                    error: `Tidak bisa menghapus cabang ini karena memiliki ${totalRelated} data terkait (user, produk, bahan, transaksi). Hapus atau pindahkan data tersebut terlebih dahulu.`
                });
            }

            await prisma.branch.delete({ where: { id } });
            return res.status(204).end();
        } catch (error: any) {
            console.error('Branch delete error:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Cabang tidak ditemukan' });
            }
            return res.status(500).json({ error: 'Gagal menghapus cabang' });
        }
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
