import express from 'express';
import { prisma } from '../../server/db';

const router = express.Router();

// --- EXPENSES ---
router.get('/', async (req, res) => {
    const expenses = await prisma.expense.findMany();
    res.json(expenses);
});

router.post('/', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.expense.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

export default router;
