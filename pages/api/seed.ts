import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { hashPassword, ROLES } from '../../lib/auth';

/**
 * API endpoint to seed initial data
 * POST /api/seed - Creates default branch and Super Admin
 * This should only be called once after deployment
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const results: string[] = [];

        // Create default branch if not exists
        let defaultBranch = await prisma.branch.findFirst({
            where: { id: 'default' }
        });

        if (!defaultBranch) {
            defaultBranch = await prisma.branch.create({
                data: {
                    id: 'default',
                    name: 'Cabang Utama'
                }
            });
            results.push('✅ Cabang default berhasil dibuat');
        } else {
            results.push('ℹ️ Cabang default sudah ada');
        }

        // Create Super Admin if not exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: 'admin@flavorpos.com' }
        });

        if (!existingAdmin) {
            const hashedPassword = await hashPassword('Admin123!');
            await prisma.user.create({
                data: {
                    email: 'admin@flavorpos.com',
                    password: hashedPassword,
                    name: 'Super Admin',
                    role: ROLES.SUPER_ADMIN,
                    branchId: null,
                    isActive: true
                }
            });
            results.push('✅ Super Admin berhasil dibuat');
            results.push('📧 Email: admin@flavorpos.com');
            results.push('🔑 Password: Admin123!');
        } else {
            results.push('ℹ️ Super Admin sudah ada');
        }

        // Link orphaned products/ingredients to default branch
        const updatedProducts = await prisma.product.updateMany({
            where: {
                OR: [
                    { branchId: 'default' },
                    { branchId: { equals: '' } }
                ]
            },
            data: { branchId: defaultBranch.id }
        });

        const updatedIngredients = await prisma.ingredient.updateMany({
            where: {
                OR: [
                    { branchId: 'default' },
                    { branchId: { equals: '' } }
                ]
            },
            data: { branchId: defaultBranch.id }
        });

        if (updatedProducts.count > 0 || updatedIngredients.count > 0) {
            results.push(`✅ ${updatedProducts.count} produk dan ${updatedIngredients.count} bahan dihubungkan ke cabang default`);
        }

        return res.status(200).json({
            success: true,
            message: 'Seeding selesai!',
            results
        });
    } catch (error: any) {
        console.error('Seed error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Seeding gagal'
        });
    }
}
