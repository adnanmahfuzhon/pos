import express from 'express';
import cors from 'cors';

// Import routers
// Note: We are importing from pages/api to follow the user's requested structure.
import ingredientsRouter from '../pages/api/ingredients';
import productsRouter from '../pages/api/products';
import salesRouter from '../pages/api/sales';
import expensesRouter from '../pages/api/expenses';
import incomesRouter from '../pages/api/incomes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/incomes', incomesRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
