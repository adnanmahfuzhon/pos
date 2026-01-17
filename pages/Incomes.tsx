
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingUp, Search, Wallet, HandCoins, CheckCircle2, X, ShoppingBag, Calendar, Filter, Trash2 } from 'lucide-react';
import { getIncomes, createIncome, updateIncome, deleteIncome, getSales, updateSale, deleteSale, getProducts, getIngredients, calculateHPP } from '../store';
import { Income, IncomeCategory, Sale, Product, SaleDetail, Ingredient } from '../types';

import DateFilter from '../components/DateFilter';
import { Edit2, Minus, Loader2 } from 'lucide-react';
import SkeletonTransactions from '../components/SkeletonTransactions';
import { useToast } from '../context/ToastContext';

export default function Incomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditSaleModalOpen, setIsEditSaleModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'Manual' | 'POS' } | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast, updateToast } = useToast();

  // Date filter states
  const today = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Form states
  const [category, setCategory] = useState<IncomeCategory>('Penjualan Luar');
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState(0);
  const [customDate, setCustomDate] = useState(today);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getIncomes(),
      getSales(),
      getProducts(),
      getIngredients()
    ]).then(([incomes, sales, products, ingredients]) => {
      setIncomes(incomes);
      setSales(sales);
      setProducts(products);
      setIngredients(ingredients);
    }).catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!sourceName || amount <= 0) return;

    const timestamp = new Date(`${customDate}T12:00:00`).getTime();

    setIsSaving(true);
    const toastId = showToast(editingItem ? 'Memperbarui pemasukan...' : 'Menyimpan pemasukan...', 'loading');

    try {
      if (editingItem && editingItem.type === 'Manual') {
        const updated = await updateIncome(editingItem.id, { category, sourceName, amount, timestamp });
        setIncomes(incomes.map(i => i.id === updated.id ? updated : i));
        updateToast(toastId, 'Pemasukan berhasil diperbarui', 'success');
        setIsModalOpen(false);
        setEditingItem(null);
        resetForm();
      } else {
        const newIncome: Income = {
          id: `INC-${Date.now()}`,
          timestamp,
          category,
          sourceName,
          amount
        };
        const created = await createIncome(newIncome);
        setIncomes([created, ...incomes]);
        updateToast(toastId, 'Pemasukan berhasil ditambahkan', 'success');
        setIsModalOpen(false);
        resetForm();
      }
    } catch (e) {
      console.error("Failed to save income", e);
      updateToast(toastId, 'Gagal menyimpan pemasukan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem({ id: item.id, type: item.type });
    if (item.type === 'Manual') {
      const income = incomes.find(i => i.id === item.id);
      if (income) {
        setCategory(income.category);
        setSourceName(income.sourceName);
        setAmount(income.amount);
        setIsModalOpen(true);
      }
    } else {
      const sale = sales.find(s => s.id === item.id);
      if (sale) {
        setSelectedSale(sale);
        setIsEditSaleModalOpen(true);
      }
    }
  };

  const handleUpdateSale = async (updatedDetails: SaleDetail[]) => {
    if (!selectedSale) return;

    let totalAmount = 0;
    let totalHPP = 0;

    updatedDetails.forEach(detail => {
      totalAmount += (detail.priceAtSale * detail.quantity);
      totalHPP += (detail.hppAtSale * detail.quantity);
    });

    setIsSaving(true);
    const toastId = showToast('Memperbarui transaksi...', 'loading');

    try {
      const updated = await updateSale(selectedSale.id, {
        ...selectedSale,
        details: updatedDetails,
        totalAmount,
        totalHPP
      });

      setSales(sales.map(s => s.id === updated.id ? updated : s));
      updateToast(toastId, 'Transaksi berhasil diperbarui', 'success');
      setIsEditSaleModalOpen(false);
      setSelectedSale(null);
      setEditingItem(null);
    } catch (e) {
      console.error("Failed to update sale", e);
      updateToast(toastId, 'Gagal mengupdate transaksi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string, type: 'Manual' | 'POS') => {
    if (confirm(`Hapus catatan ${type === 'POS' ? 'transaksi kasir' : 'pemasukan'} ini?`)) {
      setIsSaving(true);
      const toastId = showToast('Menghapus data...', 'loading');
      try {
        if (type === 'Manual') {
          setIncomes(prev => prev.filter(i => i.id !== id));
          await deleteIncome(id);
        } else {
          setSales(prev => prev.filter(s => s.id !== id));
          await deleteSale(id);
        }
        updateToast(toastId, 'Data berhasil dihapus', 'success');
      } catch (e) {
        console.error("Failed to delete item", e);
        updateToast(toastId, 'Gagal menghapus data', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const resetForm = () => {
    setCategory('Penjualan Luar');
    setSourceName('');
    setAmount(0);
    setCustomDate(today);
    setEditingItem(null);
  };

  const combinedList = useMemo(() => {
    const list = [
      ...incomes.map(i => ({ ...i, type: 'Manual' as const })),
      ...sales.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        category: 'Penjualan Kasir' as any,
        sourceName: `Trx ${s.id.slice(-6)}`,
        amount: s.totalAmount,
        type: 'POS' as const
      }))
    ];
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [incomes, sales]);

  const filtered = useMemo(() => {
    return combinedList.filter(item => {
      const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
      const matchesSearch = item.sourceName.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      return matchesSearch && matchesDate;
    });
  }, [combinedList, search, startDate, endDate]);

  const stats = useMemo(() => {
    const posTotal = filtered.filter(i => i.type === 'POS').reduce((sum, s) => sum + s.amount, 0);
    const manualTotal = filtered.filter(i => i.type === 'Manual').reduce((sum, i) => sum + i.amount, 0);

    // Channel breakdown
    const channelTotals: Record<string, number> = {
      'Offline': 0,
      'ShopeeFood': 0,
      'GrabFood': 0,
      'GoFood': 0
    };

    filtered.forEach(item => {
      if (item.type === 'POS') {
        const sale = sales.find(s => s.id === item.id);
        if (sale && sale.channel) {
          channelTotals[sale.channel] = (channelTotals[sale.channel] || 0) + sale.totalAmount;
        }
      }
    });

    return { posTotal, manualTotal, combinedTotal: posTotal + manualTotal, channelTotals };
  }, [filtered, sales]);

  if (isLoading) return <SkeletonTransactions />;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pemasukan</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Audit Periode & Rekap Penjualan</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-orange-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Input Pendapatan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats.channelTotals).map(([channel, total]) => {
          const colors: Record<string, string> = {
            'Offline': 'bg-slate-500',
            'ShopeeFood': 'bg-orange-500',
            'GrabFood': 'bg-green-500',
            'GoFood': 'bg-red-500'
          };
          const bgColors: Record<string, string> = {
            'Offline': 'bg-slate-50 dark:bg-slate-800/50',
            'ShopeeFood': 'bg-orange-50 dark:bg-orange-500/5',
            'GrabFood': 'bg-green-50 dark:bg-green-500/5',
            'GoFood': 'bg-red-50 dark:bg-red-500/5'
          };
          const percentage = stats.posTotal > 0 ? (total / stats.posTotal) * 100 : 0;

          return (
            <div key={channel} className={`${bgColors[channel]} p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-2 h-2 rounded-full ${colors[channel]}`}></div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{channel}</span>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{formatCurrency(total)}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[channel]} transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{Math.round(percentage)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-black text-xs text-slate-900 dark:text-white"
              />
            </div>

            <DateFilter
              startDate={startDate}
              endDate={endDate}
              onFilterChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              color="orange"
            />
          </div>

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-20 text-center rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                <Filter className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
                <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">Tidak ada data untuk periode ini</p>
              </div>
            ) : (
              filtered.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:shadow-md transition-all">
                  <div className={`p-4 rounded-2xl border shrink-0 ${item.type === 'POS' ? 'bg-green-50 dark:bg-green-500/10 text-green-500 border-green-100 dark:border-green-500/20' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 border-orange-100 dark:border-orange-500/20'}`}>
                    {item.type === 'POS' ? <ShoppingBag className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                  </div>
                  <div
                    onClick={() => {
                      if (item.type === 'POS') {
                        const fullSale = sales.find(s => s.id === item.id);
                        if (fullSale) {
                          setSelectedSale(fullSale);
                          setIsDetailOpen(true);
                        }
                      }
                    }}
                    className={`flex-1 min-w-0 ${item.type === 'POS' ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${item.type === 'POS' ? 'text-green-500' : 'text-orange-400'}`}>{item.category}</span>
                      <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatDate(item.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 dark:text-white tracking-tight uppercase text-sm truncate">{item.sourceName}</h4>
                      {item.type === 'POS' ? (
                        <>
                          {(() => {
                            const sale = sales.find(s => s.id === item.id);
                            if (!sale) return null;
                            const channelColors: Record<string, string> = {
                              'Offline': 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                              'ShopeeFood': 'bg-orange-100 text-orange-600 dark:bg-orange-500/20',
                              'GrabFood': 'bg-green-100 text-green-600 dark:bg-green-500/20',
                              'GoFood': 'bg-red-100 text-red-600 dark:bg-red-500/20'
                            };
                            return (
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${channelColors[sale.channel] || 'bg-slate-100 text-slate-500'}`}>
                                {sale.channel}
                              </span>
                            );
                          })()}
                        </>
                      ) : (
                        <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase">Manual</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0">
                    <p className={`text-xl font-black ${item.type === 'POS' ? 'text-green-700 dark:text-green-400' : 'text-green-600 dark:text-green-500'}`}>+{formatCurrency(item.amount)}</p>
                    <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        className="p-3 text-slate-300 hover:text-orange-500 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id, item.type); }}
                        className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 sticky top-4">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 italic">Ringkasan Filtered</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-1">Total Pemasukan</p>
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(stats.combinedTotal)}</span>
              </div>

              <div className="pt-6 border-t border-slate-50 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Penjualan Kasir</span>
                  <span className="text-xs font-black text-green-700 dark:text-green-400">{formatCurrency(stats.posTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Input Manual</span>
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400">{formatCurrency(stats.manualTotal)}</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-100 dark:border-green-500/20">
                <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-tight italic">Tampilan data mencakup periode {startDate} hingga {endDate}.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SALE DETAIL MODAL */}
      {isDetailOpen && selectedSale && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500 rounded-2xl text-white shadow-lg shadow-green-500/20">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Detail Penjualan</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trx: {selectedSale.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Pesanan</h3>
                <div className="space-y-3">
                  {selectedSale.details.map((detail, idx) => {
                    const product = products.find(p => p.id === detail.productId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{product?.name || 'Produk Tidak Dikenal'}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{detail.quantity} x {formatCurrency(detail.priceAtSale)}</p>
                        </div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(detail.quantity * detail.priceAtSale)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Metode Bayar</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{selectedSale.paymentMethod}</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Channel</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{selectedSale.channel}</p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Transaksi</p>
                <p className="text-3xl font-black text-green-500 tracking-tighter">{formatCurrency(selectedSale.totalAmount)}</p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SALE MODAL */}
      {isEditSaleModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Edit Pesanan</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trx: {selectedSale.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditSaleModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Pesanan</h3>
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <select
                      onChange={(e) => {
                        const prodId = e.target.value;
                        if (!prodId) return;
                        const product = products.find(p => p.id === prodId);
                        if (!product || !selectedSale) return;

                        const existingIdx = selectedSale.details.findIndex(d => d.productId === prodId);
                        const newDetails = [...selectedSale.details];

                        if (existingIdx > -1) {
                          newDetails[existingIdx] = { ...newDetails[existingIdx], quantity: newDetails[existingIdx].quantity + 1 };
                        } else {
                          newDetails.push({
                            productId: product.id,
                            quantity: 1,
                            priceAtSale: product.channelPrices?.[selectedSale.channel] || product.price,
                            hppAtSale: calculateHPP(product, ingredients) // Note: ingredients not available in this file? Let's check imports.
                          });
                        }
                        setSelectedSale({ ...selectedSale, details: newDetails });
                        e.target.value = "";
                      }}
                      className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-[10px] font-black uppercase appearance-none cursor-pointer"
                    >
                      <option value="">+ Tambah Item</option>
                      {products.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedSale.details.map((detail, idx) => {
                    const product = products.find(p => p.id === detail.productId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{product?.name || 'Produk'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{formatCurrency(detail.priceAtSale)} / Item</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                          <button
                            onClick={() => {
                              const newDetails = [...selectedSale.details];
                              newDetails[idx] = { ...detail, quantity: Math.max(0, detail.quantity - 1) };
                              setSelectedSale({ ...selectedSale, details: newDetails.filter(d => d.quantity > 0) });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-black w-6 text-center text-slate-900 dark:text-white">{detail.quantity}</span>
                          <button
                            onClick={() => {
                              const newDetails = [...selectedSale.details];
                              newDetails[idx] = { ...detail, quantity: detail.quantity + 1 };
                              setSelectedSale({ ...selectedSale, details: newDetails });
                            }}
                            className="p-1.5 text-slate-400 hover:text-orange-500 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {selectedSale.details.length === 0 && (
                    <div className="p-10 text-center bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20">
                      <p className="text-[10px] font-black text-red-500 uppercase">Pesanan kosong. Klik simpan untuk menghapus transaksi ini.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Baru</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {formatCurrency(selectedSale.details.reduce((sum, d) => sum + (d.priceAtSale * d.quantity), 0))}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (selectedSale.details.length === 0) {
                    deleteItem(selectedSale.id, 'POS');
                    setIsEditSaleModalOpen(false);
                  } else {
                    handleUpdateSale(selectedSale.details);
                  }
                }}
                className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-orange-600 transition-all shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pemasukan Manual</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Catat Dana Masuk Lainnya</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Kategori</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Penjualan Luar', 'Layanan', 'Lain-lain'] as IncomeCategory[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-4 rounded-xl border-2 transition-all font-black text-[9px] uppercase tracking-tighter ${category === cat ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Sumber Dana</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white uppercase"
                  placeholder="Nama Sumber..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white text-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Tanggal</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white uppercase text-xs h-full"
                  />
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-5 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] py-5 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-3 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {isSaving ? 'MEMPROSES...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
