import express from 'express';
import { prisma } from '../../server/db';

const router = express.Router();

// --- INCOMES ---
router.get('/', async (req, res) => {
    const incomes = await prisma.income.findMany();
    res.json(incomes);
});

router.post('/', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.income.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete income' });
    }
});

export default router;
