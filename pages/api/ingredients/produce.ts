import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { ingredientId, quantity } = req.body;

    if (!ingredientId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid parameters: ingredientId and quantity (positive) are required.' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch the target ingredient
            const targetIng: any = await tx.ingredient.findUnique({
                where: { id: ingredientId }
            });

            if (!targetIng) {
                throw new Error('Ingredient not found');
            }

            if (targetIng.type !== 'Processed' && targetIng.type !== 'Mix') {
                throw new Error('Only Processed or Mix types can be produced.');
            }

            const recipe = targetIng.recipe as any[]; // Array of { ingredientId, quantity }
            if (!recipe || !Array.isArray(recipe) || recipe.length === 0) {
                throw new Error('No recipe defined for this ingredient.');
            }

            // 2. Validate and decrement raw materials
            for (const item of recipe) {
                const rawIng = await tx.ingredient.findUnique({
                    where: { id: item.ingredientId }
                });

                if (!rawIng) {
                    throw new Error(`Raw material not found: ${item.ingredientId}`);
                }

                const needed = item.quantity * quantity;
                if (rawIng.stock < needed) {
                    throw new Error(`Insufficient stock for "${rawIng.name}". Needed: ${needed} ${rawIng.unit}, Available: ${rawIng.stock} ${rawIng.unit}.`);
                }

                // Decrement stock
                await tx.ingredient.update({
                    where: { id: rawIng.id },
                    data: { stock: { decrement: needed } }
                });
            }

            // 3. Increment target stock
            const updatedTarget = await tx.ingredient.update({
                where: { id: ingredientId },
                data: { stock: { increment: quantity } }
            });

            return updatedTarget;
        });

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Production failed:', error.message);
        return res.status(400).json({ error: error.message });
    }
}
