import express from 'express';
import { prisma } from '../../server/db';

const router = express.Router();

// --- PRODUCTS ---
router.get('/', async (req, res) => {
    const products = await prisma.product.findMany({
        include: { ingredients: true }
    });

    const parsedProducts = products.map(p => ({
        ...p,
        channelPrices: p.channelPrices ? JSON.parse(p.channelPrices) : {}
    }));
    res.json(parsedProducts);
});

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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

export default router;
