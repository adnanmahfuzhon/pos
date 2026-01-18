import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyPassword, signToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);
        const usernameOrEmail = email?.toLowerCase().trim();

        // Validate input
        if (!usernameOrEmail || !password) {
            return res.status(400).json({ error: 'Username/Email dan password diperlukan' });
        }

        // Find user by email
        let user = await (prisma.user as any).findUnique({
            where: { email: usernameOrEmail },
            include: { branch: true },
        });

        if (!user) {
            return res.status(401).json({ error: 'Username/Email atau password salah' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Username/Email atau password salah' });
        }

        // Generate JWT token - create payload manually for compatibility
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            branchId: user.branchId
        };
        const token = signToken(tokenPayload);

        // Return user data and token
        const { password: _, ...safeUser } = user;
        return res.status(200).json({
            user: safeUser,
            branch: user.branch,
            token,
        });
    } catch (error: any) {
        console.error('Login error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return res.status(500).json({
            error: 'Terjadi kesalahan server',
            details: error.message
        });
    }
}
