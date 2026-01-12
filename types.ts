
export type IngredientType = 'Raw' | 'Processed' | 'Mix' | 'Packaging';

export interface PriceRecord {
  timestamp: number;
  price: number;
}

export interface Ingredient {
  id: string;
  code: string; // UPC or Scan Code
  name: string;
  type: IngredientType;
  unit: string; // gr, kg, ml, pcs
  pricePerUnit: number;
  stock: number;
  minStock: number;
  recipe?: ProductIngredient[]; // Composition for Processed/Mix types
  priceHistory?: PriceRecord[]; // History of price changes
}

export interface ProductIngredient {
  ingredientId: string;
  quantity: number;
}

export type SalesChannel = 'Offline' | 'ShopeeFood' | 'GrabFood' | 'GoFood';

export interface Product {
  id: string;
  name: string;
  price: number; // Base/Offline price
  channelPrices?: Record<SalesChannel, number>; // Prices for specific channels
  category: string;
  isActive: boolean;
  ingredients: ProductIngredient[];
  imageUrl?: string;
}

export type PaymentMethod = 'Cash' | 'Non-Cash';

export interface SaleDetail {
  productId: string;
  quantity: number;
  priceAtSale: number;
  hppAtSale: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  totalAmount: number;
  totalHPP: number;
  paymentMethod: PaymentMethod;
  channel: SalesChannel;
  details: SaleDetail[];
}

export type ExpenseCategory = 'Bahan' | 'Operasional' | 'Lain-lain';

export interface Expense {
  id: string;
  timestamp: number;
  category: ExpenseCategory;
  itemName: string;
  amount: number;
  linkedIngredientId?: string;
  quantity?: number; // for material purchase
}

export type IncomeCategory = 'Penjualan Luar' | 'Layanan' | 'Lain-lain';

export interface Income {
  id: string;
  timestamp: number;
  category: IncomeCategory;
  sourceName: string;
  amount: number;
}

export interface DashboardStats {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalExpenses: number;
  totalOtherIncome: number;
  estimatedProfit: number;
  lowStockItems: Ingredient[];
}
