import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- INGREDIENTS ---
app.get('/api/ingredients', async (req, res) => {
    const ingredients = await prisma.ingredient.findMany();
    res.json(ingredients);
});

app.post('/api/ingredients', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        const ingredient = await prisma.ingredient.create({
            data: { id, ...data }
        });
        res.json(ingredient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create ingredient' });
    }
});

app.put('/api/ingredients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { priceHistory, recipe, ...data } = req.body; // Exclude relation fields if sent
        // We might need to handle recipe updates if it's a processed ingredient
        // For now simple update of scalar fields. Ideally we update recipe too.

        const ingredient = await prisma.ingredient.update({
            where: { id },
            data: data
        });
        res.json(ingredient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ingredient' });
    }
});

app.delete('/api/ingredients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.ingredient.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete ingredient' });
    }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    const products = await prisma.product.findMany({
        include: { ingredients: true }
    });
    // Parse existing JSON string channelPrices to object for frontend compatibility if needed
    // But frontend expects object, Prisma returns string for that field if defined as String.
    // Actually, if we defined channelPrices as String in schema, we need to parse it.

    const parsedProducts = products.map(p => ({
        ...p,
        channelPrices: p.channelPrices ? JSON.parse(p.channelPrices) : {}
    }));
    res.json(parsedProducts);
});

app.post('/api/products', async (req, res) => {
    try {
        const { id, ingredients, channelPrices, ...data } = req.body;
        const product = await prisma.product.create({
            data: {
                id,
                ...data,
                channelPrices: JSON.stringify(channelPrices || {}),
                ingredients: {
                    create: ingredients // { ingredientId, quantity }
                }
            }
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ingredients, channelPrices, ...data } = req.body;

        const product = await prisma.$transaction(async (tx) => {
            // Delete existing ingredients relations
            await tx.productIngredient.deleteMany({ where: { productId: id } });

            return tx.product.update({
                where: { id },
                data: {
                    ...data,
                    channelPrices: JSON.stringify(channelPrices || {}),
                    ingredients: {
                        create: ingredients
                    }
                },
                include: { ingredients: true }
            });
        });

        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Cascade delete manually since not defined in schema
        await prisma.productIngredient.deleteMany({ where: { productId: id } });
        await prisma.product.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// --- SALES ---
app.get('/api/sales', async (req, res) => {
    const sales = await prisma.sale.findMany({
        include: { details: true }
    });
    res.json(sales);
});

app.post('/api/sales', async (req, res) => {
    try {
        const { id, details, ...data } = req.body;
        const sale = await prisma.sale.create({
            data: {
                id,
                ...data,
                details: {
                    create: details
                }
            },
            include: { details: true }
        });

        // Update stock
        for (const detail of details) {
            const product = await prisma.product.findUnique({
                where: { id: detail.productId },
                include: { ingredients: true }
            });

            if (product && product.ingredients) {
                for (const pIng of product.ingredients) {
                    await prisma.ingredient.update({
                        where: { id: pIng.ingredientId },
                        data: { stock: { decrement: pIng.quantity * detail.quantity } }
                    });
                }
            }
        }

        res.json(sale);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create sale' });
    }
});

app.delete('/api/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.saleDetail.deleteMany({ where: { saleId: id } });
        await prisma.sale.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete sale' });
    }
});

// --- EXPENSES ---
app.get('/api/expenses', async (req, res) => {
    const expenses = await prisma.expense.findMany();
    res.json(expenses);
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        const expense = await prisma.expense.create({
            data: { id, ...data }
        });
        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.expense.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// --- INCOMES ---
app.get('/api/incomes', async (req, res) => {
    const incomes = await prisma.income.findMany();
    res.json(incomes);
});

app.post('/api/incomes', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        const income = await prisma.income.create({
            data: { id, ...data }
        });
        res.json(income);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create income' });
    }
});

app.delete('/api/incomes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.income.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete income' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
