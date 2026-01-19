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
  RefreshCw,
  ShoppingCart,
  Percent,
  Award,
  Store,
  Smartphone,
  Bike,
  Car,
  Globe,
  Building2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  getSales,
  getExpenses,
  getIngredients,
  getIncomes,
  getProducts
} from '../store';
import { Ingredient, Sale, Expense, Income, Product } from '../types';

import DateFilter from '../components/DateFilter';
import { formatDateToWIB } from '../lib/date';

import SkeletonDashboard from '../components/SkeletonDashboard';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const { user, isSuperAdmin, selectedBranchId, setSelectedBranchId, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Redirect Staff to POS
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user?.role === 'STAFF') {
      router.push('/pos');
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  // Fetch Branches for Super Admin (Restore Feature)
  const [branches, setBranches] = useState<any[]>([]);
  useEffect(() => {
    if (isSuperAdmin && isAuthenticated) {
      fetch('/api/branches')
        .then(res => res.json())
        .then(data => setBranches(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [isSuperAdmin, isAuthenticated]);

  // Date Filter states
  const today = formatDateToWIB(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [salesData, expensesData, incomesData, ingredientsData, productsData] = await Promise.all([
        getSales(),
        getExpenses(),
        getIncomes(),
        getIngredients(),
        getProducts()
      ]);
      setSales(salesData);
      setExpenses(expensesData);
      setIncomes(incomesData);
      setIngredients(ingredientsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine effective branch ID for filtering
  const effectiveBranchId = isSuperAdmin ? selectedBranchId : user?.branchId;

  // Filter Data based on Date Range AND Branch
  const filteredSales = useMemo(() =>
    sales.filter(s => {
      const date = formatDateToWIB(s.timestamp);
      const matchesDate = date >= startDate && date <= endDate;
      const matchesBranch = !effectiveBranchId || s.branchId === effectiveBranchId || (effectiveBranchId === 'default' && !s.branchId); // Handle legacy data
      return matchesDate && matchesBranch;
    }), [sales, startDate, endDate, effectiveBranchId]);

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      const date = formatDateToWIB(e.timestamp);
      const matchesDate = date >= startDate && date <= endDate;
      const matchesBranch = !effectiveBranchId || e.branchId === effectiveBranchId || (effectiveBranchId === 'default' && !e.branchId);
      return matchesDate && matchesBranch;
    }), [expenses, startDate, endDate, effectiveBranchId]);

  const filteredIncomes = useMemo(() =>
    incomes.filter(i => {
      const date = formatDateToWIB(i.timestamp);
      const matchesDate = date >= startDate && date <= endDate;
      const matchesBranch = !effectiveBranchId || i.branchId === effectiveBranchId || (effectiveBranchId === 'default' && !i.branchId);
      return matchesDate && matchesBranch;
    }), [incomes, startDate, endDate, effectiveBranchId]);

  // Financial Calculations
  const posRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const otherRevenue = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalRevenue = posRevenue + otherRevenue;

  const totalHPP = filteredSales.reduce((sum, s) => sum + s.totalHPP, 0);
  const totalOpExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedProfit = totalRevenue - totalHPP - totalOpExpenses;

  // Enhanced Metrics
  const transactionCount = filteredSales.length;
  const averageOrderValue = transactionCount > 0 ? posRevenue / transactionCount : 0;
  const grossMargin = posRevenue > 0 ? ((posRevenue - totalHPP) / posRevenue * 100) : 0;

  const lowStockItems = ingredients.filter(i => i.stock <= i.minStock);

  // Channel Breakdown
  const channelData = useMemo(() => {
    const channels: Record<string, { revenue: number; count: number }> = {
      'Offline': { revenue: 0, count: 0 },
      'ShopeeFood': { revenue: 0, count: 0 },
      'GrabFood': { revenue: 0, count: 0 },
      'GoFood': { revenue: 0, count: 0 }
    };
    filteredSales.forEach(s => {
      if (channels[s.channel]) {
        channels[s.channel].revenue += s.totalAmount;
        channels[s.channel].count += 1;
      }
    });
    return Object.entries(channels).map(([name, data]) => ({
      name,
      value: data.revenue,
      count: data.count,
      percentage: posRevenue > 0 ? (data.revenue / posRevenue * 100).toFixed(1) : '0'
    }));
  }, [filteredSales, posRevenue]);

  // Daily Trend Data
  const trendData = useMemo(() => {
    const dailyData: Record<string, { revenue: number; expenses: number; profit: number }> = {};

    filteredSales.forEach(s => {
      const day = new Date(s.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!dailyData[day]) dailyData[day] = { revenue: 0, expenses: 0, profit: 0 };
      dailyData[day].revenue += s.totalAmount;
    });

    filteredIncomes.forEach(i => {
      const day = new Date(i.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!dailyData[day]) dailyData[day] = { revenue: 0, expenses: 0, profit: 0 };
      dailyData[day].revenue += i.amount;
    });

    filteredExpenses.forEach(e => {
      const day = new Date(e.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!dailyData[day]) dailyData[day] = { revenue: 0, expenses: 0, profit: 0 };
      dailyData[day].expenses += e.amount;
    });

    return Object.entries(dailyData).map(([day, data]) => ({
      day,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses
    })).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredSales, filteredIncomes, filteredExpenses]);

  // Top Products
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};

    filteredSales.forEach(sale => {
      sale.details?.forEach(detail => {
        const product = products.find(p => p.id === detail.productId);
        if (product) {
          if (!productSales[product.id]) {
            productSales[product.id] = { name: product.name, qty: 0, revenue: 0 };
          }
          productSales[product.id].qty += detail.quantity;
          productSales[product.id].revenue += detail.priceAtSale * detail.quantity;
        }
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales, products]);

  const maxProductQty = topProducts.length > 0 ? topProducts[0].qty : 1;

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

  const channelColors: Record<string, string> = {
    'Offline': '#f97316',
    'ShopeeFood': '#ea580c',
    'GrabFood': '#22c55e',
    'GoFood': '#ef4444'
  };

  const channelIcons: Record<string, any> = {
    'Offline': Store,
    'ShopeeFood': Smartphone,
    'GrabFood': Bike,
    'GoFood': Car
  };

  if (isLoading || isAuthLoading) return <SkeletonDashboard />;
  if (!isAuthenticated || user?.role === 'STAFF') return null; // Avoid flash of content before redirect

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  // Backup & Restore Database - Now uses API calls
  const exportDatabase = async () => {
    try {
      const [ingredientsData, productsData, salesData, expensesData, incomesData, branchesData] = await Promise.all([
        getIngredients(),
        getProducts(),
        getSales(),
        getExpenses(),
        getIncomes(),
        fetch('/api/branches').then(r => r.json())
      ]);
      const database = {
        branches: Array.isArray(branchesData) ? branchesData : [],
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
      {/* Super Admin - Branch Comparison View (Only when NO specific branch is selected) */}
      {isSuperAdmin && !selectedBranchId && (
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-orange-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">Overview Seluruh Cabang</h2>
                <p className="text-orange-400 font-bold text-xs uppercase tracking-widest">Perbandingan Performa Outlet</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Branch Comparison Chart */}
              <div className="h-64 bg-slate-800/50 rounded-3xl p-6 border border-slate-700">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Omzet per Cabang</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    // Mock data for comparison - since we don't have real multi-branch data yet
                    { name: 'Pusat', revenue: totalRevenue },
                    { name: 'Cabang 2', revenue: 0 },
                    { name: 'Cabang 3', revenue: 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Branch Performance Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white font-black rounded-lg text-xs">1</span>
                    <div>
                      <p className="text-sm font-bold text-white uppercase">Cabang Pusat (Default)</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{transactionCount} Transaksi</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-green-400">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="p-6 text-center border border-dashed border-slate-700 rounded-2xl">
                  <p className="text-xs text-slate-500 italic">Belum ada data cabang lain.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 md:gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Dashboard Audit</h1>
          <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-2 italic">
            {isSuperAdmin && !selectedBranchId ? 'Overview Semua Cabang' : 'Monitoring Laba & Sinkronisasi Database'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Super Admin Branch Selector */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value || '')}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter Bar */}
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
      </header>

      {/* SUPER ADMIN: Branch Performance Breakdown */}
      {isSuperAdmin && !selectedBranchId && (
        <div className="mb-8 p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Building2 className="w-64 h-64" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-8 relative z-10">Performa Cabang</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
            {(() => {
              // Group sales by branch
              const branchStats: Record<string, { revenue: number; count: number }> = {};
              filteredSales.forEach(sale => {
                const bId = sale.branchId || 'Unknown';
                if (!branchStats[bId]) branchStats[bId] = { revenue: 0, count: 0 };
                branchStats[bId].revenue += sale.totalAmount;
                branchStats[bId].count += 1;
              });

              // Get branch name from branches state
              const getBranchName = (id: string) => {
                const branch = branches.find(b => b.id === id);
                return branch?.name || id;
              };

              return Object.entries(branchStats).map(([bId, stats]) => (
                <div
                  key={bId}
                  className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  onClick={() => setSelectedBranchId(bId)}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-xs uppercase">
                      {getBranchName(bId).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{stats.count} Transaksi</p>
                      <p className="font-black text-sm uppercase truncate">{getBranchName(bId)}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black tracking-tighter">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.revenue)}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Pendapatan Periode" value={formatCurrency(totalRevenue)} icon={DollarSign} trend={`${startDate} - ${endDate}`} color="orange" />
        <StatCard title="Total HPP" value={formatCurrency(totalHPP)} icon={FileText} trend="Berdasarkan Produk Terjual" color="gray" />
        <StatCard title="Pengeluaran" value={formatCurrency(totalOpExpenses)} icon={TrendingDown} trend="Operasional & Bahan" color="red" />
        <StatCard title="Estimasi Laba" value={formatCurrency(estimatedProfit)} icon={TrendingUp} trend="Profit Bersih" color={estimatedProfit >= 0 ? "green" : "red"} />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Total Transaksi" value={transactionCount.toString()} icon={ShoppingCart} trend="POS Transactions" color="orange" />
        <StatCard title="Rata-rata Order" value={formatCurrency(averageOrderValue)} icon={Award} trend="Average Order Value" color="blue" />
        <StatCard title="Gross Margin" value={`${grossMargin.toFixed(1)}%`} icon={Percent} trend="(Pendapatan - HPP) / Pendapatan" color={grossMargin >= 30 ? "green" : "orange"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-10">
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Distribusi Keuangan</h3>
              <div className="flex items-center self-start md:self-auto gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 rounded-xl text-[10px] font-black text-green-600 dark:text-green-400 uppercase border border-green-100 dark:border-green-500/20">
                <ShieldCheck className="w-4 h-4" /> Database Prisma
              </div>
            </div>
            <div className="h-64 md:h-96 w-full">
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

          {/* Daily Trend Chart */}
          {trendData.length > 1 && (
            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Trend Harian</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 800, fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 800, fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#colorRevenue)" name="Pendapatan" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpenses)" name="Pengeluaran" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

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
          {/* Channel Performance */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                <Globe className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Performa Channel</h3>
            </div>
            <div className="space-y-3">
              {channelData.map((channel) => {
                const ChannelIcon = channelIcons[channel.name] || Store;
                const channelColor = channelColors[channel.name] || '#f97316';
                return (
                  <div key={channel.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ChannelIcon className="w-4 h-4" style={{ color: channelColor }} />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{channel.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400">{channel.count} trx</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mr-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${channel.percentage}%`,
                            backgroundColor: channelColor
                          }}
                        />
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{channel.percentage}%</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{formatCurrency(channel.value)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-xl">
                  <Award className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Produk Terlaris</h3>
              </div>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ${index === 0 ? 'bg-orange-500' : index === 1 ? 'bg-slate-500' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                      }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${(product.qty / maxProductQty) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{product.qty}x</span>
                      </div>
                    </div>
                    <p className="text-xs font-black text-green-500">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Restore (Opsional)</label>
                  <select
                    id="restoreTargetBranch"
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-orange-500"
                    defaultValue=""
                  >
                    <option value="">Gunakan ID Asli (Default)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>Inject ke: {b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const targetBranchEl = document.getElementById('restoreTargetBranch') as HTMLSelectElement;
                      const targetBranchId = targetBranchEl?.value;

                      const confirmMsg = targetBranchId
                        ? `⚠️ INJECT DATA ke Cabang ID: ${targetBranchId}?\n\nSemua data dari file akan dimasukkan ke cabang ini. Data yang ada akan di-update.`
                        : "⚠️ RESTORE DATABASE?\n\nData akan dikembalikan sesuai ID aslinya di file backup.";

                      if (!confirm(confirmMsg)) {
                        e.target.value = ''; // Reset
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const jsonData = JSON.parse(event.target?.result as string);

                          const query = targetBranchId ? `?targetBranchId=${targetBranchId}` : '';
                          const res = await fetch(`/api/admin/restore${query}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('pos_token') || 'dev-bypass-token'}`
                            },
                            body: JSON.stringify(jsonData)
                          });

                          const result = await res.json();
                          if (res.ok) {
                            alert(`✅ Restore Berhasil!\n\nTarget: ${result.targetBranch}\nDetail: ${JSON.stringify(result.details, null, 2)}`);
                            window.location.reload();
                          } else {
                            alert(`❌ Gagal: ${result.error}`);
                          }
                        } catch (err: any) {
                          alert("❌ Error: " + err.message);
                        }
                        e.target.value = ''; // Reset
                      };
                      reader.readAsText(file);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <button className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all group">
                    <Upload className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Restore / Inject Data</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleClearDatabase}
                    className="w-full py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 flex items-center justify-center gap-3 transition-all group"
                  >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Reset Seluruh Data</span>
                  </button>
                </div>
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
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 border-blue-100 dark:border-blue-500/20',
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
