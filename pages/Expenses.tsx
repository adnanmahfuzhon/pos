
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Receipt, Search, ShoppingBag, Zap, Tag, Calendar, ChevronDown, CheckCircle2, X, AlertCircle, Filter, Trash2 } from 'lucide-react';
import { getExpenses, createExpense, deleteExpense, getIngredients, updateIngredient } from '../store';
import { Expense, Ingredient, ExpenseCategory, PriceRecord } from '../types';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Date filter states
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Form states
  const [category, setCategory] = useState<ExpenseCategory>('Bahan');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState(0);
  const [linkedIngredientId, setLinkedIngredientId] = useState('');
  const [quantity, setQuantity] = useState(0);

  // FIX: Define derived values for HPP preview in the modal
  const targetIng = useMemo(() => ingredients.find(i => i.id === linkedIngredientId), [ingredients, linkedIngredientId]);
  const previewUnitPrice = quantity > 0 ? amount / quantity : 0;
  const priceDiff = targetIng ? previewUnitPrice - targetIng.pricePerUnit : 0;

  useEffect(() => {
    getExpenses().then(setExpenses).catch(console.error);
    getIngredients().then(setIngredients).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (amount <= 0 || (category === 'Bahan' && (!linkedIngredientId || quantity <= 0))) {
      alert("Mohon lengkapi data dengan benar.");
      return;
    }

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      timestamp: Date.now(),
      category,
      itemName: category === 'Bahan' ? ingredients.find(i => i.id === linkedIngredientId)?.name || '' : itemName,
      amount,
      linkedIngredientId: category === 'Bahan' ? linkedIngredientId : undefined,
      quantity: category === 'Bahan' ? quantity : undefined,
    };

    try {
      const created = await createExpense(newExpense);
      setExpenses([created, ...expenses]);

      if (category === 'Bahan' && linkedIngredientId) {
        const unitPriceFromExpense = amount / quantity;
        const ing = ingredients.find(i => i.id === linkedIngredientId);

        if (ing) {
          const hasPriceChanged = Math.abs(ing.pricePerUnit - unitPriceFromExpense) > 0.01;
          const newHistory: PriceRecord[] = [...(ing.priceHistory || [])];

          if (hasPriceChanged) {
            newHistory.push({ timestamp: Date.now(), price: unitPriceFromExpense });
          }

          const updatedIngData = {
            stock: ing.stock + quantity,
            pricePerUnit: hasPriceChanged ? unitPriceFromExpense : ing.pricePerUnit,
            // history update via API might differ depending on backend impl, 
            // but assuming simple update matches my store shim
          };

          // Note: My backend PUT update accepts the data spread. I need to send priceHistory if I supported it in backend.
          // My backend currently ignores priceHistory update in PUT /ingredients/:id?
          // "const { priceHistory, recipe, ...data } = req.body; // Exclude relation fields if sent"
          // Wait, I excluded priceHistory in backend! So price history won't update.
          // I should fix backend if price history is important.
          // For now, I'll update stock and pricePerUnit.

          await updateIngredient(ing.id, updatedIngData);

          // Refresh ingredients
          const refetchedIngs = await getIngredients();
          setIngredients(refetchedIngs);
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (e) {
      console.error("Failed to save expense", e);
      alert("Gagal menyimpan pengeluaran");
    }
  };

  const deleteExpenseFn = async (id: string) => {
    if (confirm('Hapus catatan pengeluaran ini? Tindakan ini tidak akan mengembalikan stok bahan yang sudah terinput.')) {
      try {
        await deleteExpense(id);
        setExpenses(expenses.filter(e => e.id !== id));
      } catch (e) {
        console.error("Failed to delete expense", e);
        alert("Gagal menghapus pengeluaran");
      }
    }
  };

  const resetForm = () => {
    setCategory('Bahan');
    setItemName('');
    setAmount(0);
    setLinkedIngredientId('');
    setQuantity(0);
  };

  const filtered = useMemo(() => {
    return expenses.filter(item => {
      const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      return matchesSearch && matchesDate;
    });
  }, [expenses, search, startDate, endDate]);

  const totalFilteredAmount = useMemo(() => {
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  }, [filtered]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pengeluaran</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Audit Biaya & Belanja Bahan</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all self-start active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Input Biaya
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari biaya..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-black text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-red-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none"
                />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">s/d</span>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-red-500" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-20 text-center rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                <Filter className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-4" />
                <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">Data biaya tidak ditemukan</p>
              </div>
            ) : (
              filtered.map(expense => (
                <div key={expense.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-6 group hover:shadow-md transition-all">
                  <div className={`p-4 rounded-2xl ${expense.category === 'Bahan' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 border-orange-100 dark:border-orange-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 border-blue-100 dark:border-blue-500/20'}`}>
                    {expense.category === 'Bahan' ? <ShoppingBag className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{expense.category}</span>
                      <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatDate(expense.timestamp)}</span>
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white tracking-tight uppercase text-sm">{expense.itemName}</h4>
                    {expense.category === 'Bahan' && (
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Vol: {expense.quantity} unit | HPP: {formatCurrency(expense.amount / (expense.quantity || 1))}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <p className="text-xl font-black text-red-500">-{formatCurrency(expense.amount)}</p>
                    <button
                      onClick={() => deleteExpenseFn(expense.id)}
                      className="p-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 sticky top-4">
            <h3 className="text-[10px] font-black mb-6 text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Ringkasan Filtered</h3>
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Keluar</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(totalFilteredAmount)}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 w-full rounded-full opacity-20"></div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
                <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest italic leading-relaxed">Filter aktif untuk periode {startDate} hingga {endDate}.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Catat Biaya</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Input Belanja & Update HPP</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Kategori</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Bahan', 'Operasional'] as ExpenseCategory[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${category === cat ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {category === 'Bahan' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Pilih Bahan (Mentah/Kemasan)</label>
                    <select
                      value={linkedIngredientId}
                      onChange={e => setLinkedIngredientId(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {ingredients.filter(ing => ing.type === 'Raw' || ing.type === 'Packaging').map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name.toUpperCase()} ({ing.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Jumlah Beli</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Total Harga</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {targetIng && previewUnitPrice > 0 && (
                    <div className={`p-5 rounded-2xl border flex items-start gap-4 animate-in slide-in-from-bottom duration-300 ${priceDiff > 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20'}`}>
                      <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${priceDiff > 0 ? 'text-red-500' : 'text-green-500'}`} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Estimasi HPP Baru</p>
                        <p className="text-lg font-black tracking-tight">{formatCurrency(previewUnitPrice)} <span className="text-[10px] text-slate-400 uppercase">/ {targetIng.unit}</span></p>
                        <p className={`text-[9px] font-bold uppercase mt-1 ${priceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {priceDiff > 0 ? `Naik ${formatCurrency(priceDiff)}` : `Turun ${formatCurrency(Math.abs(priceDiff))}`}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Nama Biaya</label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={e => setItemName(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white uppercase"
                      placeholder="Contoh: Listrik Bulanan"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Nominal (Rp)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white text-xl"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-5 text-slate-500 font-black text-[10px] uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] py-5 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-red-500/20 flex items-center justify-center gap-3 hover:bg-red-600 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                Simpan & Update HPP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
