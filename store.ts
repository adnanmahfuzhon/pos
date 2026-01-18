
import { Ingredient, Product, Sale, Expense, Income } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pos_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
};

const fetchJson = async (url: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    // Attempt to read error message from body
    try {
      const errBody = await res.json();
      throw new Error(errBody.error || `API Error: ${res.statusText}`);
    } catch (e: any) {
      throw new Error(e.message || `API Error: ${res.statusText}`);
    }
  }
  return res.json();
};

const appendQuery = (url: string, params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

export const getIngredients = async (branchId?: string): Promise<Ingredient[]> => {
  return fetchJson(appendQuery(`${API_URL}/ingredients`, { branchId }));
};

export const createIngredient = async (data: Ingredient): Promise<Ingredient> => {
  return fetchJson(`${API_URL}/ingredients`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateIngredient = async (id: string, data: Partial<Ingredient>): Promise<Ingredient> => {
  return fetchJson(`${API_URL}/ingredients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteIngredient = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/ingredients/${id}`, { method: 'DELETE' });
};

export const produceIngredient = async (ingredientId: string, quantity: number): Promise<Ingredient> => {
  return fetchJson(`${API_URL}/ingredients/produce`, {
    method: 'POST',
    body: JSON.stringify({ ingredientId, quantity })
  });
};

export const getProducts = async (branchId?: string): Promise<Product[]> => {
  return fetchJson(appendQuery(`${API_URL}/products`, { branchId }));
};

export const createProduct = async (data: Product): Promise<Product> => {
  return fetchJson(`${API_URL}/products`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product> => {
  return fetchJson(`${API_URL}/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteProduct = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/products/${id}`, { method: 'DELETE' });
};

export const getSales = async (branchId?: string): Promise<Sale[]> => {
  return fetchJson(appendQuery(`${API_URL}/sales`, { branchId }));
};

export const createSale = async (data: Sale): Promise<Sale> => {
  return fetchJson(`${API_URL}/sales`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateSale = async (id: string, data: Partial<Sale>): Promise<Sale> => {
  return fetchJson(`${API_URL}/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteSale = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/sales/${id}`, { method: 'DELETE' });
};

export const getExpenses = async (branchId?: string): Promise<Expense[]> => {
  return fetchJson(appendQuery(`${API_URL}/expenses`, { branchId }));
};

export const createExpense = async (data: Expense): Promise<Expense> => {
  return fetchJson(`${API_URL}/expenses`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const deleteExpense = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
};

export const getIncomes = async (branchId?: string): Promise<Income[]> => {
  return fetchJson(appendQuery(`${API_URL}/incomes`, { branchId }));
};

export const createIncome = async (data: Income): Promise<Income> => {
  return fetchJson(`${API_URL}/incomes`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateIncome = async (id: string, data: Partial<Income>): Promise<Income> => {
  return fetchJson(`${API_URL}/incomes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteIncome = async (id: string): Promise<void> => {
  return fetchJson(`${API_URL}/incomes/${id}`, { method: 'DELETE' });
};

export const calculateHPP = (product: Product, ingredients: Ingredient[]): number => {
  if (!product.ingredients) return 0;
  return product.ingredients.reduce((total, pIng) => {
    const ing = ingredients.find(i => i.id === pIng.ingredientId);
    return total + (ing ? ing.pricePerUnit * pIng.quantity : 0);
  }, 0);
};
