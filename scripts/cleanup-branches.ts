
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up duplicate branch names...');

    const branches = await prisma.branch.findMany();
    const seenNames = new Set<string>();

    for (const branch of branches) {
        if (seenNames.has(branch.name)) {
            console.log(`⚠️  Duplicate found: "${branch.name}" (ID: ${branch.id})`);
            const newName = `${branch.name}-${branch.id.substring(0, 4)}`;
            console.log(`   Renaming to: "${newName}"`);

            await prisma.branch.update({
                where: { id: branch.id },
                data: { name: newName }
            });
        } else {
            seenNames.add(branch.name);
        }
    }

    console.log('✅ Branch names cleanup complete.');
}

main()
    .catch((e) => {
        console.error('❌ Cleanup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
