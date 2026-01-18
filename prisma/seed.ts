import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default branch if not exists
    let defaultBranch = await prisma.branch.findFirst({
        where: { name: 'Default' }
    });

    if (!defaultBranch) {
        defaultBranch = await prisma.branch.create({
            data: {
                id: 'default',
                name: 'Default'
            }
        });
        console.log('✅ Default branch created');
    }

    // Create Super Admin if not exists
    const existingAdmin = await prisma.user.findFirst({
        where: { email: 'admin@flavorpos.com' }
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('Admin123!', 12);
        await prisma.user.create({
            data: {
                email: 'admin@flavorpos.com',
                password: hashedPassword,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                branchId: null, // Super Admin tidak terikat cabang
                isActive: true
            }
        });
        console.log('✅ Super Admin created');
        console.log('   Email: admin@flavorpos.com');
        console.log('   Password: Admin123!');
    } else {
        console.log('ℹ️  Super Admin already exists');
    }

    // Update existing products and ingredients to use default branch
    await prisma.product.updateMany({
        where: { branchId: 'default' },
        data: { branchId: defaultBranch.id }
    });

    await prisma.ingredient.updateMany({
        where: { branchId: 'default' },
        data: { branchId: defaultBranch.id }
    });

    console.log('✅ Existing products/ingredients linked to default branch');
    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
