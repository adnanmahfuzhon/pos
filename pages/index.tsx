import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Download,
  Upload,
  Database,
  History,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  getSales,
  getExpenses,
  getIngredients,
  getIncomes,
  getProducts
} from '../store';
import { Ingredient, Sale, Expense, Income, Product } from '../types';

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Date Filter states
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const [salesData, expensesData, incomesData, ingredientsData] = await Promise.all([
        getSales(),
        getExpenses(),
        getIncomes(),
        getIngredients()
      ]);
      setSales(salesData);
      setExpenses(expensesData);
      setIncomes(incomesData);
      setIngredients(ingredientsData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  // Filtered Data based on Date Range
  const filteredSales = useMemo(() =>
    sales.filter(s => {
      const d = new Date(s.timestamp).toISOString().split('T')[0];
      return d >= startDate && d <= endDate;
    }), [sales, startDate, endDate]);

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.timestamp).toISOString().split('T')[0];
      return d >= startDate && d <= endDate;
    }), [expenses, startDate, endDate]);

  const filteredIncomes = useMemo(() =>
    incomes.filter(i => {
      const d = new Date(i.timestamp).toISOString().split('T')[0];
      return d >= startDate && d <= endDate;
    }), [incomes, startDate, endDate]);

  // Financial Calculations
  const posRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const otherRevenue = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalRevenue = posRevenue + otherRevenue;

  const totalHPP = filteredSales.reduce((sum, s) => sum + s.totalHPP, 0);
  const totalOpExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedProfit = totalRevenue - totalHPP - totalOpExpenses;

  const lowStockItems = ingredients.filter(i => i.stock <= i.minStock);

  // Activity Log (Combined & Chronological)
  const activityLog = useMemo(() => {
    const logs = [
      ...filteredSales.map(s => ({ id: s.id, type: 'Sale', title: 'Penjualan POS', amount: s.totalAmount, ts: s.timestamp, color: 'text-green-500' })),
      ...filteredIncomes.map(i => ({ id: i.id, type: 'Income', title: i.sourceName, amount: i.amount, ts: i.timestamp, color: 'text-blue-500' })),
      ...filteredExpenses.map(e => ({ id: e.id, type: 'Expense', title: e.itemName, amount: -e.amount, ts: e.timestamp, color: 'text-red-500' }))
    ];
    return logs.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [filteredSales, filteredIncomes, filteredExpenses]);

  const chartData = [
    { name: 'POS', value: posRevenue, color: '#f97316' },
    { name: 'Lainnya', value: otherRevenue, color: '#3b82f6' },
    { name: 'HPP', value: totalHPP, color: '#94a3b8' },
    { name: 'Beban', value: totalOpExpenses, color: '#ef4444' },
    { name: 'Laba', value: Math.max(0, estimatedProfit), color: '#22c55e' }
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  // Backup & Restore Database - Now uses API calls
  const exportDatabase = async () => {
    try {
      const [ingredientsData, productsData, salesData, expensesData, incomesData] = await Promise.all([
        getIngredients(),
        getProducts(),
        getSales(),
        getExpenses(),
        getIncomes()
      ]);
      const database = {
        ingredients: ingredientsData,
        products: productsData,
        sales: salesData,
        expenses: expensesData,
        incomes: incomesData,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FlavorPOS_Backup_${today}.json`;
      link.click();
    } catch (error) {
      console.error("Failed to export database:", error);
      alert("Gagal melakukan backup database.");
    }
  };

  const importDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("Ganti seluruh database dengan data backup? Data saat ini akan hilang.\n\n⚠️ FITUR INI MEMERLUKAN ENDPOINT KHUSUS YANG BELUM DIIMPLEMENTASIKAN.\n\nUntuk sekarang, silakan gunakan Prisma Studio untuk mengelola data secara langsung.")) {
          // This would require bulk insert endpoints - for now just show message
          alert("Fitur restore saat ini belum tersedia untuk database Prisma. Silakan gunakan: npx prisma studio");
        }
      } catch (err) {
        alert("Format file tidak valid.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = () => {
    const confirm1 = confirm("⚠️ PERINGATAN: Fitur ini memerlukan endpoint khusus.\n\nUntuk menghapus data, gunakan: npx prisma studio\n\nAtau hapus file prisma/dev.db dan jalankan ulang: npx prisma db push");
    // Since we don't have a bulk delete endpoint, just show instructions
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Dashboard Audit</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-2 italic">Monitoring Laba & Sinkronisasi Database</p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-orange-500" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none"
            />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">s/d</span>
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-orange-500" />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Pendapatan Periode" value={formatCurrency(totalRevenue)} icon={DollarSign} trend={`${startDate} - ${endDate}`} color="orange" />
        <StatCard title="Total HPP" value={formatCurrency(totalHPP)} icon={FileText} trend="Berdasarkan Produk Terjual" color="gray" />
        <StatCard title="Pengeluaran" value={formatCurrency(totalOpExpenses)} icon={TrendingDown} trend="Operasional & Bahan" color="red" />
        <StatCard title="Estimasi Laba" value={formatCurrency(estimatedProfit)} icon={TrendingUp} trend="Profit Bersih" color={estimatedProfit >= 0 ? "green" : "red"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Distribusi Keuangan Periode</h3>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 rounded-xl text-[10px] font-black text-green-600 dark:text-green-400 uppercase border border-green-100 dark:border-green-500/20">
                <ShieldCheck className="w-4 h-4" /> Database Prisma
              </div>
            </div>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 800, fontSize: 10 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 800, fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }} />
                  <Bar dataKey="value" radius={[14, 14, 0, 0]} barSize={50}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Log Table */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <History className="w-5 h-5 text-slate-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Log Aktivitas Terbaru</h3>
              </div>
              <Link href="/incomes" className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">Lihat Semua History</Link>
            </div>

            <div className="space-y-1">
              {activityLog.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-5">
                    <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{log.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(log.ts).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-black ${log.color}`}>{log.amount > 0 ? '+' : ''}{formatCurrency(log.amount)}</p>
                </div>
              ))}
              {activityLog.length === 0 && (
                <div className="py-20 text-center text-slate-300 dark:text-slate-700 italic text-xs">Tidak ada aktivitas pada rentang tanggal ini.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-8">
          {/* Inventory Status Card */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Status<br />Gudang</h3>
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl shadow-sm"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-slate-400 space-y-4">
                <ShieldCheck className="w-16 h-16 text-green-500 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Seluruh Stok Aman</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[400px] pr-4 custom-scrollbar">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-5 rounded-3xl border bg-orange-50/50 dark:bg-slate-800/50 border-orange-100 dark:border-slate-700 group hover:border-orange-500 transition-all">
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase truncate w-32">{item.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: `${(item.stock / item.minStock) * 100}%` }}></div>
                        </div>
                        <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase">{item.stock} / {item.minStock}</p>
                      </div>
                    </div>
                    <Link href="/ingredients" className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-orange-500 shadow-xl shadow-orange-500/10 hover:scale-110 transition-transform"><ArrowRight className="w-4 h-4" /></Link>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800">
              <Link href="/ingredients" className="w-full py-5 bg-slate-950 dark:bg-orange-500 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-[2rem] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-orange-500/10">
                Laporan Stok
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Database Management Card */}
          <div className="bg-slate-950 p-10 rounded-[3rem] border-t-8 border-orange-500 shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
              <Database className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-black text-white tracking-tight uppercase">Manajemen Data</h3>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Simpan cadangan database atau pulihkan data dari file JSON.</p>

              <button
                onClick={exportDatabase}
                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all group"
              >
                <Download className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Backup Database</span>
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={importDatabase}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <button className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all group">
                  <Upload className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Restore Database</span>
                </button>
              </div>

              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleClearDatabase}
                  className="w-full py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 flex items-center justify-center gap-3 transition-all group"
                >
                  <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reset Seluruh Data</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
              <p className="text-[9px] font-bold text-orange-400 uppercase tracking-tight italic">Data disimpan di database SQLite lokal (prisma/dev.db).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colors: any = {
    orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 border-orange-100 dark:border-orange-500/20',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-500 border-red-100 dark:border-red-500/20',
    green: 'bg-green-50 dark:bg-green-500/10 text-green-500 border-green-100 dark:border-green-500/20',
    gray: 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl group">
      <div className="flex items-start justify-between">
        <div className={`p-5 rounded-3xl border shadow-sm group-hover:scale-110 transition-transform ${colors[color]}`}><Icon className="w-6 h-6" /></div>
        <span className="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full uppercase border border-slate-100 dark:border-slate-700">{trend}</span>
      </div>
      <div className="mt-8">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</h4>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
      </div>
    </div>
  );
}
