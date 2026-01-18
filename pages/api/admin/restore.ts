
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { extractToken, verifyToken, ROLES } from '../../../lib/auth';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Allow larger payloads for restore
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

        // Use transaction for data integrity
        await prisma.$transaction(async (tx) => {
            // 1. Branches (First priority)
            if (branches.length > 0) {
                for (const item of branches) {
                    const { id, ...data } = item;
                    // Only restore if we are doing a Full Restore OR if this is the target branch
                    if (!effectiveBranchId || id === effectiveBranchId) {
                        delete data.createdAt;
                        delete data.updatedAt;
                        await tx.branch.upsert({
                            where: { id: id },
                            update: data,
                            create: { id, ...data }
                        });
                    }
                }
                results.branches = branches.length;
            }

            // Ensure target branch exists if specified (fallback)
            if (effectiveBranchId) {
                const branchExists = await tx.branch.findUnique({ where: { id: effectiveBranchId } });
                if (!branchExists) {
                    await tx.branch.create({
                        data: {
                            id: effectiveBranchId,
                            name: `Restored Branch (${effectiveBranchId})`
                        }
                    });
                }
            }

            // 2. Ingredients
            if (ingredients.length > 0) {
                for (const item of ingredients) {
                    const { id, ...data } = item;
                    // Clean data
                    delete data.createdAt;
                    delete data.updatedAt;

                    if (effectiveBranchId) data.branchId = effectiveBranchId;

                    await tx.ingredient.upsert({
                        where: { id: id },
                        update: data,
                        create: { id, ...data }
                    });
                }
                results.ingredients = ingredients.length;
            }

            // 3. Products
            if (products.length > 0) {
                for (const item of products) {
                    const { id, ingredients: prodIngredients, ...data } = item;
                    delete data.createdAt;
                    delete data.updatedAt;

                    if (effectiveBranchId) data.branchId = effectiveBranchId;

                    // Handle Product Ingredients relation
                    // First create/update product
                    await tx.product.upsert({
                        where: { id: id },
                        update: data,
                        create: { id, ...data }
                    });

                    // Update relations if included
                    if (Array.isArray(prodIngredients)) {
                        // Delete existing relations for this product to avoid duplicates/conflicts
                        await tx.productIngredient.deleteMany({ where: { productId: id } });

                        // Re-create relations
                        for (const pi of prodIngredients) {
                            await tx.productIngredient.create({
                                data: {
                                    productId: id,
                                    ingredientId: pi.ingredientId,
                                    quantity: pi.quantity
                                }
                            });
                        }
                    }
                }
                results.products = products.length;
            }

            // 4. Sales
            if (sales.length > 0) {
                for (const item of sales) {
                    const { id, details, ...data } = item;
                    delete data.createdAt; // Keep original timestamp usually

                    if (effectiveBranchId) data.branchId = effectiveBranchId;

                    await tx.sale.upsert({
                        where: { id: id },
                        update: data,
                        create: { id, ...data }
                    });

                    if (Array.isArray(details)) {
                        await tx.saleDetail.deleteMany({ where: { saleId: id } });
                        for (const d of details) {
                            await tx.saleDetail.create({
                                data: {
                                    saleId: id,
                                    productId: d.productId,
                                    quantity: d.quantity,
                                    priceAtSale: d.priceAtSale,
                                    hppAtSale: d.hppAtSale
                                }
                            });
                        }
                    }
                }
                results.sales = sales.length;
            }

            // 5. Expenses
            if (expenses.length > 0) {
                for (const item of expenses) {
                    const { id, ...data } = item;
                    delete data.createdAt;
                    if (effectiveBranchId) data.branchId = effectiveBranchId;

                    await tx.expense.upsert({
                        where: { id: id },
                        update: data,
                        create: { id, ...data }
                    });
                }
                results.expenses = expenses.length;
            }

            // 6. Incomes
            if (incomes.length > 0) {
                for (const item of incomes) {
                    const { id, ...data } = item;
                    delete data.createdAt;
                    if (effectiveBranchId) data.branchId = effectiveBranchId;

                    await tx.income.upsert({
                        where: { id: id },
                        update: data,
                        create: { id, ...data }
                    });
                }
                results.incomes = incomes.length;
            }
        }, {
            maxWait: 20000,
            timeout: 60000
        });

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
