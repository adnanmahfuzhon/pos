
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Listing all branches...');
    const branches = await prisma.branch.findMany();

    if (branches.length === 0) {
        console.log('❌ No branches found!');
    } else {
        console.table(branches.map(b => ({ id: b.id, name: b.name })));
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
