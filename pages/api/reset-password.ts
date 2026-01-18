import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/auth';

/**
 * One-time endpoint to reset Super Admin password
 * DELETE THIS FILE AFTER USE!
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Find the first user (using id as orderBy since createdAt might not exist)
        const user = await prisma.user.findFirst();

        if (!user) {
            return res.status(404).json({ error: 'No user found' });
        }

        // Hash new password
        const hashedPassword = await hashPassword('Admin123!');

        // Get email/username
        const email = (user as any).email || (user as any).username || 'admin@flavorpos.com';

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword
            }
        });

        // Return HTML page with credentials
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Password Reset</title></head>
      <body style="font-family: Arial; padding: 50px; background: #1e293b; color: white;">
        <h1 style="color: #f97316;">✅ Password Berhasil Di-Reset!</h1>
        <p><strong>Username/Email:</strong> ${email}</p>
        <p><strong>Password Baru:</strong> Admin123!</p>
        <br>
        <a href="/login" style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;">Ke Halaman Login</a>
        <br><br>
        <p style="color: #888; font-size: 12px;">⚠️ Hapus file pages/api/reset-password.ts setelah selesai!</p>
      </body>
      </html>
    `);
    } catch (error: any) {
        console.error('Reset password error:', error);
        return res.status(500).json({ error: error.message });
    }
}
