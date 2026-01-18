
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting Super Admin password...');

    const email = 'admin@flavorpos.com';
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            isActive: true,
            role: 'SUPER_ADMIN'
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            branchId: null,
            isActive: true
        }
    });

    console.log(`✅ Super Admin password reset for ${email}`);
    console.log(`🔑 New Password: ${password}`);
}

main()
    .catch((e) => {
        console.error('❌ Reset failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
