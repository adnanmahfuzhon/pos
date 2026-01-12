
import { Ingredient, Product, Sale, Expense, Income } from './types';

const API_URL = 'http://localhost:3001/api';

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
};

export const getIngredients = async (): Promise<Ingredient[]> => {
  return fetchJson(`${API_URL}/ingredients`);
};

export const createIngredient = async (data: Ingredient): Promise<Ingredient> => {
  return fetchJson(`${API_URL}/ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const updateIngredient = async (id: string, data: Partial<Ingredient>): Promise<Ingredient> => {
  return fetchJson(`${API_URL}/ingredients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteIngredient = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/ingredients/${id}`, { method: 'DELETE' });
};

// Compatibility shim for old "saveIngredients" (bulk save)
// Warning: This implementation loops and creates/updates, which is slow.
// We should refactor the app to use atomic updates.
// For now, let's just log a warning or try to implement it if strictly needed.
// But we agreed to refactor the frontend. So I won't export saveIngredients anymore.
// Or I can keep it but make it just do nothing/log error to force refactor.

export const getProducts = async (): Promise<Product[]> => {
  return fetchJson(`${API_URL}/products`);
};

export const createProduct = async (data: Product): Promise<Product> => {
  return fetchJson(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product> => {
  return fetchJson(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteProduct = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/products/${id}`, { method: 'DELETE' });
};

export const getSales = async (): Promise<Sale[]> => {
  return fetchJson(`${API_URL}/sales`);
};

// Sales are append-only usually
export const createSale = async (data: Sale): Promise<Sale> => {
  return fetchJson(`${API_URL}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteSale = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/sales/${id}`, { method: 'DELETE' });
};

export const getExpenses = async (): Promise<Expense[]> => {
  return fetchJson(`${API_URL}/expenses`);
};

export const createExpense = async (data: Expense): Promise<Expense> => {
  return fetchJson(`${API_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteExpense = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
};

export const getIncomes = async (): Promise<Income[]> => {
  return fetchJson(`${API_URL}/incomes`);
};

export const createIncome = async (data: Income): Promise<Income> => {
  return fetchJson(`${API_URL}/incomes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteIncome = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/incomes/${id}`, { method: 'DELETE' });
};

// Utility
export const calculateHPP = (product: Product, ingredients: Ingredient[]): number => {
  if (!product.ingredients) return 0;
  return product.ingredients.reduce((total, pIng) => {
    const ing = ingredients.find(i => i.id === pIng.ingredientId);
    return total + (ing ? ing.pricePerUnit * pIng.quantity : 0);
  }, 0);
};
