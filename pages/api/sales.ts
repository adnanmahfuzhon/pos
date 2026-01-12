import express from 'express';
import { prisma } from '../../server/db';

const router = express.Router();

// --- SALES ---
router.get('/', async (req, res) => {
    const sales = await prisma.sale.findMany({
        include: { details: true }
    });
    res.json(sales);
});

router.post('/', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.saleDetail.deleteMany({ where: { saleId: id } });
        await prisma.sale.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete sale' });
    }
});

export default router;
