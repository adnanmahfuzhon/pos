
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  Banknote,
  Coffee,
  AlertTriangle,
  X,
  ChevronRight,
  ReceiptText,
  PackageX,
  Globe
} from 'lucide-react';
import {
  getProducts,
  getIngredients,
  createSale,
  calculateHPP
} from '../store';
import { Product, Ingredient, Sale, PaymentMethod, SalesChannel } from '../types';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [salesChannel, setSalesChannel] = useState<SalesChannel>('Offline');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  useEffect(() => {
    getProducts().then(products => setProducts(products.filter(p => p.isActive))).catch(console.error);
    getIngredients().then(setIngredients).catch(console.error);
  }, []);

  // Auto-switch payment method when channel changes
  useEffect(() => {
    if (salesChannel !== 'Offline' && paymentMethod === 'Cash') {
      setPaymentMethod('Non-Cash');
    }
  }, [salesChannel, paymentMethod]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const getProductPrice = (product: Product) => {
    if (product.channelPrices && product.channelPrices[salesChannel]) {
      return product.channelPrices[salesChannel];
    }
    return product.price; // Fallback to Offline
  };

  const totalAmount = cart.reduce((sum, item) => sum + (getProductPrice(item.product) * item.quantity), 0);

  const checkStockAvailability = (product: Product, additionalQty: number = 1) => {
    const reqs: Record<string, number> = {};
    cart.forEach(item => {
      item.product.ingredients.forEach(pi => {
        reqs[pi.ingredientId] = (reqs[pi.ingredientId] || 0) + (pi.quantity * item.quantity);
      });
    });
    product.ingredients.forEach(pi => {
      reqs[pi.ingredientId] = (reqs[pi.ingredientId] || 0) + (pi.quantity * additionalQty);
    });
    for (const [ingId, needed] of Object.entries(reqs)) {
      const ing = ingredients.find(i => i.id === ingId);
      if (!ing || ing.stock < needed) {
        return {
          valid: false,
          message: `Stok "${ing?.name || 'Bahan'}" sisa ${ing?.stock || 0} ${ing?.unit || ''}.`
        };
      }
    }
    return { valid: true };
  };

  const isCartValid = useMemo(() => {
    if (cart.length === 0) return false;
    const reqs: Record<string, number> = {};
    cart.forEach(item => {
      item.product.ingredients.forEach(pi => {
        reqs[pi.ingredientId] = (reqs[pi.ingredientId] || 0) + (pi.quantity * item.quantity);
      });
    });
    for (const [ingId, needed] of Object.entries(reqs)) {
      const ing = ingredients.find(i => i.id === ingId);
      if (!ing || ing.stock < needed) return false;
    }
    return true;
  }, [cart, ingredients]);

  const addToCart = (product: Product) => {
    const { valid, message } = checkStockAvailability(product, 1);
    if (!valid) {
      setStockWarning(message);
      setTimeout(() => setStockWarning(null), 3000);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.product.id === id);
    if (delta > 0 && item) {
      const { valid, message } = checkStockAvailability(item.product, 1);
      if (!valid) {
        setStockWarning(message);
        setTimeout(() => setStockWarning(null), 3000);
        return;
      }
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckout = async () => {
    if (!isCartValid || isProcessing) return;
    setIsProcessing(true);

    // Backend handles stock stock reduction!
    let totalHPP = 0;
    cart.forEach(cartItem => {
      const itemHPP = calculateHPP(cartItem.product, ingredients);
      totalHPP += (itemHPP * cartItem.quantity);
    });

    const newSale: Sale = {
      id: `TRX-${Date.now()}`,
      timestamp: Date.now(),
      totalAmount,
      totalHPP,
      paymentMethod,
      channel: salesChannel,
      details: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        priceAtSale: getProductPrice(item.product),
        hppAtSale: calculateHPP(item.product, ingredients)
      }))
    };

    try {
      await createSale(newSale);

      // Refresh ingredients to get updated stock
      const updatedIngredients = await getIngredients();
      setIngredients(updatedIngredients);

      setCart([]);
      setIsProcessing(false);
      setIsMobileCartOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      console.error("Checkout failed", e);
      alert("Gagal memproses pesanan");
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex h-[calc(100vh-64px)] lg:h-screen -m-4 md:-m-8 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">

      {/* LEFT: Menu Area */}
      <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
        <header className="flex flex-col gap-6 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Menu Console</h1>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 italic">Mode: {salesChannel}</p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm outline-none font-bold text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Channel Selector */}
          <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm w-fit overflow-x-auto no-scrollbar">
            {(['Offline', 'ShopeeFood', 'GrabFood', 'GoFood'] as SalesChannel[]).map(ch => (
              <button
                key={ch}
                onClick={() => setSalesChannel(ch)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${salesChannel === ch ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                {ch}
              </button>
            ))}
          </div>
        </header>

        {stockWarning && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-xs font-black uppercase tracking-widest leading-relaxed">{stockWarning}</p>
          </div>
        )}

        {showSuccess && (
          <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-xs font-black uppercase tracking-widest">Transaksi Berhasil</p>
          </div>
        )}

        {/* Product Grid View */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6 pb-24">
          {filteredProducts.map(product => {
            const isOut = product.ingredients.some(pi => {
              const ing = ingredients.find(i => i.id === pi.ingredientId);
              return ing && ing.stock < pi.quantity;
            });
            const currentPrice = getProductPrice(product);

            return (
              <div
                key={product.id}
                onClick={() => !isOut && addToCart(product)}
                className={`
                  relative group flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 
                  transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:border-orange-500/50
                  ${isOut ? 'opacity-60 grayscale cursor-not-allowed' : 'active:scale-95'}
                `}
              >
                <div className="aspect-square w-full bg-slate-50 dark:bg-slate-800 relative overflow-hidden shrink-0">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Coffee className="w-8 h-8 md:w-12 md:h-12 text-slate-200 dark:text-slate-700 group-hover:text-orange-500/20 transition-colors" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 md:top-4 md:left-4">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-[7px] md:text-[8px] font-black text-slate-900 dark:text-white uppercase tracking-widest border border-white/20 dark:border-slate-800">
                      {product.category}
                    </span>
                  </div>
                  {isOut && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                      <PackageX className="w-6 h-6 md:w-8 md:h-8 mb-1 md:mb-2 opacity-80" />
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Stok Habis</span>
                    </div>
                  )}
                </div>

                <div className="p-3 md:p-5 flex flex-col flex-1 gap-2 md:gap-4">
                  <div className="flex-1">
                    <h3 className="text-[11px] md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <p className="text-xs md:text-base font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(currentPrice)}
                      </p>
                      {salesChannel !== 'Offline' && (
                        <p className="text-[7px] md:text-[8px] font-bold text-slate-400 line-through">
                          {formatCurrency(product.price)}
                        </p>
                      )}
                    </div>
                    <div className={`
                      w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-sm
                      ${isOut ? 'bg-slate-100 dark:bg-slate-800 text-slate-300' : 'bg-slate-50 dark:bg-slate-800 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'}
                    `}>
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Sidebar Billing */}
      <div className={`
        fixed inset-y-0 right-0 z-[80] lg:relative lg:translate-x-0 lg:z-0
        flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
        transition-all duration-500 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.02)]
        ${isMobileCartOpen ? 'w-full md:w-[380px] translate-x-0' : 'w-0 lg:w-[380px] translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500 rounded-xl">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Billing</h2>
              <p className="text-[8px] text-orange-500 font-bold uppercase tracking-widest mt-0.5 italic">{salesChannel} Order</p>
            </div>
          </div>
          <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2.5 bg-red-50 text-red-500 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/10">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-30">
              <ShoppingCart className="w-16 h-16 mb-6 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Keranjang Kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Coffee className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[12px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{item.product.name}</p>
                    <button onClick={() => updateCartQuantity(item.product.id, -item.quantity)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-orange-600 tracking-tighter">{formatCurrency(getProductPrice(item.product))}</p>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100">
                      <button onClick={() => updateCartQuantity(item.product.id, -1)} className="p-1 text-slate-400 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                      <span className="text-[11px] font-black w-4 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.product.id, 1)} className="p-1 text-slate-400 hover:text-orange-500"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shrink-0">
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pilih Pembayaran</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('Cash')}
                disabled={salesChannel !== 'Offline'}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${paymentMethod === 'Cash' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-50 dark:border-slate-800 bg-slate-50 text-slate-400'} ${salesChannel !== 'Offline' ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
              >
                <Banknote className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Tunai</span>
              </button>
              <button
                onClick={() => setPaymentMethod('Non-Cash')}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${paymentMethod === 'Non-Cash' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-50 dark:border-slate-800 bg-slate-50 text-slate-400'}`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Digital</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bayar</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(totalAmount)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={!isCartValid || isProcessing}
              className={`w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl ${(!isCartValid || isProcessing) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-950 dark:bg-orange-500 text-white hover:bg-black shadow-orange-500/20'}`}
            >
              {isProcessing ? 'Sinkronisasi...' : 'Proses Pesanan'}
              <ChevronRight className={`w-4 h-4 ${(!isCartValid || isProcessing) ? 'hidden' : 'block'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Cart Toggle */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[75]">
        <button onClick={() => setIsMobileCartOpen(true)} className="bg-orange-500 text-white w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center relative">
          <ShoppingCart className="w-7 h-7" />
          {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-white text-orange-500 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-orange-500">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
        </button>
      </div>

      {isMobileCartOpen && <div onClick={() => setIsMobileCartOpen(false)} className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[75]" />}
    </div>
  );
}
