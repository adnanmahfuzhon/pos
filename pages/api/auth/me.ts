import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Extract token from header
        const token = extractToken(req.headers.authorization);
        if (!token) {
            return res.status(401).json({ error: 'Token tidak ditemukan' });
        }

        // Verify token
        const payload = verifyToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Token tidak valid atau sudah expired' });
        }

        // Get fresh user data from database
        const user = await (prisma.user as any).findFirst({
            where: { id: payload.userId },
            include: { branch: true },
        });

        if (!user) {
            return res.status(401).json({ error: 'User tidak ditemukan' });
        }

        // Return user (without password)
        const { password: _, ...safeUser } = user;
        return res.status(200).json({
            user: safeUser,
            branch: user.branch,
        });
    } catch (error) {
        console.error('Auth me error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
}
