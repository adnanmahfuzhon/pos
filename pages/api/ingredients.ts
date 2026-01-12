import express from 'express';
import { prisma } from '../../server/db';

const router = express.Router();

// --- INGREDIENTS ---
router.get('/', async (req, res) => {
    const ingredients = await prisma.ingredient.findMany();
    res.json(ingredients);
});

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { priceHistory, recipe, ...data } = req.body; // Exclude relation fields if sent

        const ingredient = await prisma.ingredient.update({
            where: { id },
            data: data
        });
        res.json(ingredient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ingredient' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.ingredient.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete ingredient' });
    }
});

export default router;
