import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES } from '../../../lib/auth';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb', // Allow larger payloads for restore
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // 1. Auth Check - STRICTLY SUPER ADMIN
    const token = extractToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = verifyToken(token);
    if (!payload || payload.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden: Super Admin only' });
    }

    try {
        const { targetBranchId } = req.query;
        const backupData = req.body;

        if (!backupData) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const { branches = [], ingredients = [], products = [], sales = [], expenses = [], incomes = [] } = backupData;
        const effectiveBranchId = (typeof targetBranchId === 'string' && targetBranchId) ? targetBranchId : null;

        const results = {
            branches: 0,
            ingredients: 0,
            products: 0,
            sales: 0,
            expenses: 0,
            incomes: 0
        };

        // Chunking helper to process items in parallel batches without exceeding connection limits or timing out
        const processInChunks = async <T>(items: T[], chunkSize: number, fn: (item: T) => Promise<void>) => {
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);
                await Promise.all(chunk.map(fn));
            }
        };

        // 1. Branches
        if (branches.length > 0) {
            await processInChunks(branches, 10, async (item: any) => {
                const { id, _count, createdAt, updatedAt, ...data } = item;
                if (!effectiveBranchId || id === effectiveBranchId) {
                    await prisma.branch.upsert({
                        where: { id },
                        update: data,
                        create: { id, ...data }
                    });
                }
            });
            results.branches = branches.length;
        }

        // Ensure target branch exists if specified
        if (effectiveBranchId) {
            const branchExists = await prisma.branch.findUnique({ where: { id: effectiveBranchId } });
            if (!branchExists) {
                await prisma.branch.create({
                    data: {
                        id: effectiveBranchId,
                        name: `Restored Branch (${effectiveBranchId})`
                    }
                });
            }
        }

        // 2. Ingredients
        if (ingredients.length > 0) {
            await processInChunks(ingredients, 15, async (item: any) => {
                const { id, _count, createdAt, updatedAt, branch, ...data } = item;
                if (effectiveBranchId) data.branchId = effectiveBranchId;

                await prisma.ingredient.upsert({
                    where: { id },
                    update: data,
                    create: { id, ...data }
                });
            });
            results.ingredients = ingredients.length;
        }

        // 3. Products
        if (products.length > 0) {
            await processInChunks(products, 10, async (item: any) => {
                const { id, ingredients: prodIngredients, _count, createdAt, updatedAt, branch, ...data } = item;
                if (effectiveBranchId) data.branchId = effectiveBranchId;

                await prisma.product.upsert({
                    where: { id },
                    update: data,
                    create: { id, ...data }
                });

                if (Array.isArray(prodIngredients) && prodIngredients.length > 0) {
                    await prisma.productIngredient.deleteMany({ where: { productId: id } });
                    await prisma.productIngredient.createMany({
                        data: prodIngredients.map((pi: any) => ({
                            productId: id,
                            ingredientId: pi.ingredientId,
                            quantity: Number(pi.quantity)
                        }))
                    });
                }
            });
            results.products = products.length;
        }

        // 4. Sales & Details
        if (sales.length > 0) {
            await processInChunks(sales, 15, async (item: any) => {
                const { id, details, _count, createdAt, updatedAt, branch, ...data } = item;
                if (effectiveBranchId) data.branchId = effectiveBranchId;

                await prisma.sale.upsert({
                    where: { id },
                    update: data,
                    create: { id, ...data }
                });

                if (Array.isArray(details) && details.length > 0) {
                    await prisma.saleDetail.deleteMany({ where: { saleId: id } });
                    await prisma.saleDetail.createMany({
                        data: details.map((d: any) => ({
                            saleId: id,
                            productId: d.productId,
                            quantity: Number(d.quantity),
                            priceAtSale: Number(d.priceAtSale),
                            hppAtSale: Number(d.hppAtSale || 0)
                        }))
                    });
                }
            });
            results.sales = sales.length;
        }

        // 5. Expenses
        if (expenses.length > 0) {
            await processInChunks(expenses, 15, async (item: any) => {
                const { id, _count, createdAt, updatedAt, branch, ...data } = item;
                if (effectiveBranchId) data.branchId = effectiveBranchId;

                await prisma.expense.upsert({
                    where: { id },
                    update: data,
                    create: { id, ...data }
                });
            });
            results.expenses = expenses.length;
        }

        // 6. Incomes
        if (incomes.length > 0) {
            await processInChunks(incomes, 15, async (item: any) => {
                const { id, _count, createdAt, updatedAt, branch, ...data } = item;
                if (effectiveBranchId) data.branchId = effectiveBranchId;

                await prisma.income.upsert({
                    where: { id },
                    update: data,
                    create: { id, ...data }
                });
            });
            results.incomes = incomes.length;
        }

        return res.status(200).json({
            success: true,
            message: 'Data successfully restored',
            details: results,
            targetBranch: effectiveBranchId || 'Original'
        });

    } catch (error: any) {
        console.error('Restore failed:', error);
        return res.status(500).json({ error: error.message || 'Restore failed' });
    }
}
