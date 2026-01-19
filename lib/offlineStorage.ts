/**
 * Offline Storage Utility
 * Caches products and ingredients for offline use
 */

const PRODUCTS_CACHE_KEY = 'flavorpos_products_cache';
const INGREDIENTS_CACHE_KEY = 'flavorpos_ingredients_cache';
const CACHE_TIMESTAMP_KEY = 'flavorpos_cache_timestamp';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedProduct {
    id: string;
    name: string;
    price: number;
    category: string;
    isActive: boolean;
}

export interface CachedIngredient {
    id: string;
    name: string;
    stock: number;
    unit: string;
    pricePerUnit: number;
}

// Products Cache
export function getCachedProducts(): CachedProduct[] {
    if (typeof window === 'undefined') return [];
    const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
}

export function setCachedProducts(products: CachedProduct[]): void {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
}

// Ingredients Cache
export function getCachedIngredients(): CachedIngredient[] {
    if (typeof window === 'undefined') return [];
    const cached = localStorage.getItem(INGREDIENTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
}

export function setCachedIngredients(ingredients: CachedIngredient[]): void {
    localStorage.setItem(INGREDIENTS_CACHE_KEY, JSON.stringify(ingredients));
}

// Check if cache is still valid
export function isCacheValid(): boolean {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp) < CACHE_EXPIRY_MS;
}

// Clear all caches
export function clearOfflineCache(): void {
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    localStorage.removeItem(INGREDIENTS_CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}
