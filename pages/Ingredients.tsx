
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Milk, Package, Layers, Droplets, AlertTriangle,
  X, Search, CheckCircle2, Edit2, Scan, CameraOff,
  ChevronDown, Trash2, Save, Minus, Calculator, Info,
  LineChart as LineChartIcon, ArrowUpRight, ArrowDownRight,
  TrendingUp, Calendar, History
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient, produceIngredient } from '../store';
import { Ingredient, IngredientType, ProductIngredient } from '../types';
import SkeletonIngredients from '../components/SkeletonIngredients';

declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

export default function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProductionOpen, setIsProductionOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedIngForDetail, setSelectedIngForDetail] = useState<Ingredient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Scanner & Quick Update states
  const [selectedIngId, setSelectedIngId] = useState('');
  const [scanQty, setScanQty] = useState(0);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<IngredientType>('Raw');
  const [unit, setUnit] = useState('gr');
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [recipe, setRecipe] = useState<ProductIngredient[]>([]);
  const [showIngDropdown, setShowIngDropdown] = useState(false);
  const [isAutoCalc, setIsAutoCalc] = useState(true);
  const [batchHelper, setBatchHelper] = useState<{ id: string, rawQty: number, yieldQty: number } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getIngredients()
      .then(setIngredients)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // AUTOMATIC HPP CALCULATION FOR PROCESSED/MIX
  useEffect(() => {
    if (isAutoCalc && (type === 'Processed' || type === 'Mix') && recipe.length > 0) {
      const calculatedHPP = recipe.reduce((total, r) => {
        const ing = ingredients.find(i => i.id === r.ingredientId);
        return total + (ing ? ing.pricePerUnit * r.quantity : 0);
      }, 0);
      setPricePerUnit(calculatedHPP);
    }
  }, [recipe, type, ingredients, isAutoCalc]);

  const startCamera = async () => {
    try {
      const constraints = { video: { facingMode: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Izin kamera diperlukan.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isScanOpen) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isScanOpen]);

  const openModal = (ing?: Ingredient) => {
    if (ing) {
      setEditingIngredient(ing);
      setCode(ing.code || '');
      setName(ing.name);
      setType(ing.type);
      setUnit(ing.unit);
      setPricePerUnit(ing.pricePerUnit);
      setStock(ing.stock);
      setMinStock(ing.minStock);
      setRecipe(ing.recipe || []);
      setIsAutoCalc(ing.type === 'Processed' || ing.type === 'Mix');
    } else {
      setEditingIngredient(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || !code) return;

    const unitPriceChanged = editingIngredient ? Math.abs(editingIngredient.pricePerUnit - pricePerUnit) > 0.01 : true;
    const newHistory = editingIngredient?.priceHistory ? [...editingIngredient.priceHistory] : [];

    if (unitPriceChanged) {
      newHistory.push({ timestamp: Date.now(), price: pricePerUnit });
    }

    const ingredientData: Ingredient = {
      id: editingIngredient ? editingIngredient.id : `ing-${Date.now()}`,
      code,
      name,
      type,
      unit,
      pricePerUnit,
      stock,
      minStock,
      recipe: (type === 'Processed' || type === 'Mix') ? recipe : undefined,
      priceHistory: newHistory
    };

    try {
      if (editingIngredient) {
        const updated = await updateIngredient(ingredientData.id, ingredientData);
        setIngredients(ingredients.map(i => i.id === updated.id ? updated : i));
      } else {
        const created = await createIngredient(ingredientData);
        setIngredients([...ingredients, created]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (e) {
      console.error("Failed to save ingredient", e);
      alert("Gagal menyimpan bahan");
    }
  };

  const deleteIngredientFn = async (id: string) => {
    if (confirm('Hapus bahan baku ini?')) {
      try {
        await deleteIngredient(id);
        const updated = ingredients.filter(i => i.id !== id);
        setIngredients(updated);
      } catch (e) {
        console.error("Failed to delete", e);
        alert("Gagal menghapus bahan");
      }
    }
  };

  const handleQuickStockUpdate = async () => {
    const targetIng = ingredients.find(i => i.id === selectedIngId);
    if (!targetIng || scanQty <= 0) return;

    try {
      if (targetIng.type === 'Processed' || targetIng.type === 'Mix') {
        // Use atomic production API
        await produceIngredient(targetIng.id, scanQty);
      } else {
        // Regular stock increment
        const newStock = targetIng.stock + scanQty;
        await updateIngredient(targetIng.id, { stock: newStock });
      }

      const refreshed = await getIngredients();
      setIngredients(refreshed);

      setScanResult(`Berhasil: ${targetIng.name} +${scanQty}`);
      setScanQty(0);
      setTimeout(() => {
        setScanResult(null);
        setIsScanOpen(false);
        setIsProductionOpen(false);
      }, 1500);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Gagal update stok");
    }
  };

  const addIngredientToRecipe = (ingId: string) => {
    if (recipe.find(r => r.ingredientId === ingId)) return;
    setRecipe([...recipe, { ingredientId: ingId, quantity: 1 }]);
    setShowIngDropdown(false);
  };

  const updateRecipeQty = (ingId: string, qty: number) => {
    setRecipe(recipe.map(r => r.ingredientId === ingId ? { ...r, quantity: qty } : r));
  };

  const resetForm = () => {
    setCode(''); setName(''); setType('Raw'); setUnit('gr'); setPricePerUnit(0); setStock(0); setMinStock(0); setRecipe([]); setIsAutoCalc(true);
  };

  const getTypeIcon = (type: IngredientType) => {
    switch (type) {
      case 'Raw': return <Droplets className="w-5 h-5" />;
      case 'Packaging': return <Package className="w-5 h-5" />;
      case 'Mix': return <Layers className="w-5 h-5" />;
      case 'Processed': return <Milk className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const openDetail = (ing: Ingredient) => {
    setSelectedIngForDetail(ing);
    setIsDetailOpen(true);
  };

  const stats = useMemo(() => {
    const counts = { Kritis: 0, Menipis: 0, Stabil: 0 };
    ingredients.forEach(item => {
      if (item.stock <= (item.minStock * 0.2)) counts.Kritis++;
      else if (item.stock <= item.minStock) counts.Menipis++;
      else counts.Stabil++;
    });
    return counts;
  }, [ingredients]);

  const filtered = useMemo(() => {
    return ingredients.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'All' || i.type === filterType;

      let status = 'Stabil';
      if (i.stock <= (i.minStock * 0.2)) status = 'Kritis';
      else if (i.stock <= i.minStock) status = 'Menipis';

      const matchesStatus = filterStatus === 'All' || status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [ingredients, search, filterType, filterStatus]);

  if (isLoading) return <SkeletonIngredients />;

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Gudang Bahan</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Inventaris Real-Time • Monitoring Harga</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { setIsScanOpen(true); setSelectedIngId(''); }}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
          >
            <Scan className="w-4 h-4" />
            Update Stok Cepat
          </button>
          <button
            onClick={() => { setIsProductionOpen(true); setSelectedIngId(''); setScanQty(0); }}
            className="bg-slate-950 dark:bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-slate-800 hover:bg-black transition-all shadow-xl active:scale-95"
          >
            <Calculator className="w-4 h-4 text-orange-500" />
            Input Produksi
          </button>
          <button
            onClick={() => openModal()}
            className="bg-orange-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Bahan Baru
          </button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100"><AlertTriangle className="w-8 h-8" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bahan Kritis</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.Kritis}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-orange-50 text-orange-500 rounded-2xl border border-orange-100"><Info className="w-8 h-8" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stok Menipis</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.Menipis}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-green-50 text-green-500 rounded-2xl border border-green-100"><CheckCircle2 className="w-8 h-8" /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stok Stabil</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.Stabil}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
            <input
              type="text"
              placeholder="Cari nama atau kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none text-xs font-black text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipe:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none"
              >
                <option value="All">SEMUA</option>
                <option value="Raw">MENTAH</option>
                <option value="Processed">OLAHAN</option>
                <option value="Mix">CAMPURAN</option>
                <option value="Packaging">KEMASAN</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none"
              >
                <option value="All">SEMUA STATUS</option>
                <option value="Kritis">KRITIS</option>
                <option value="Menipis">MENIPIS</option>
                <option value="Stabil">STABIL</option>
              </select>
            </div>
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20">
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Informasi Bahan</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Tipe</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Harga Unit</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Stok Aktif</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map(item => {
                const isLow = item.stock <= item.minStock;
                const isCritical = item.stock <= (item.minStock * 0.2);
                const history = item.priceHistory || [];
                const lastPrice = history.length >= 1 ? history[history.length - 1].price : item.pricePerUnit;
                const prevPrice = history.length >= 2 ? history[history.length - 2].price : lastPrice;
                const priceTrend = lastPrice - prevPrice;

                return (
                  <tr key={item.id} onClick={() => openDetail(item)} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl border ${isCritical ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'}`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white tracking-tight uppercase text-sm">{item.name}</p>
                          <p className="text-[9px] font-bold text-orange-600 tracking-widest mt-0.5">{item.code || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{item.type}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <p className="font-black text-sm text-slate-900 dark:text-white">{formatCurrency(item.pricePerUnit)}</p>
                        {priceTrend !== 0 && (
                          <div className={`flex items-center gap-1 text-[8px] font-black uppercase mt-1 ${priceTrend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {priceTrend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            {formatCurrency(Math.abs(priceTrend))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-sm">
                      <span className={isCritical ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-slate-900 dark:text-white'}>
                        {item.stock.toLocaleString()} <span className="text-[8px] text-slate-400 uppercase ml-1">{item.unit}</span>
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {isCritical ? (
                        <span className="text-[8px] font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded-full">KRITIS</span>
                      ) : isLow ? (
                        <span className="text-[8px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded-full">MENIPIS</span>
                      ) : (
                        <span className="text-[8px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded-full">STABIL</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openModal(item)} className="p-2.5 text-slate-400 hover:text-orange-500 transition-all"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteIngredientFn(item.id)} className="p-2.5 text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Card View for Mobile */}
        <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-800">
          {filtered.map(item => {
            const isLow = item.stock <= item.minStock;
            const isCritical = item.stock <= (item.minStock * 0.2);
            return (
              <div
                key={item.id}
                onClick={() => openDetail(item)}
                className="p-6 space-y-4 active:bg-slate-50 dark:active:bg-slate-800 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl border ${isCritical ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white tracking-tight uppercase text-xs">{item.name}</p>
                      <p className="text-[8px] font-bold text-orange-600 tracking-widest mt-0.5">{item.code || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(item.pricePerUnit)}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">PER {item.unit}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{item.type}</span>
                    {isCritical ? (
                      <span className="text-[8px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full">KRITIS</span>
                    ) : isLow ? (
                      <span className="text-[8px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded-full">MENIPIS</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-black ${isCritical ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                      {item.stock.toLocaleString()} <span className="text-[8px] text-slate-400 uppercase ml-0.5 font-bold">{item.unit}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAIL MODAL WITH PRICE CHART */}
      {isDetailOpen && selectedIngForDetail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-orange-500 rounded-3xl text-white shadow-xl shadow-orange-500/20">
                  {getTypeIcon(selectedIngForDetail.type)}
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1 italic">Detail Inventaris</p>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{selectedIngForDetail.name}</h2>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Stok Saat Ini</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedIngForDetail.stock.toLocaleString()} <span className="text-xs text-slate-400 uppercase font-bold">{selectedIngForDetail.unit}</span></p>
                </div>
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">HPP Unit (Terakhir)</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(selectedIngForDetail.pricePerUnit)}</p>
                </div>
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Batas Minimum</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedIngForDetail.minStock.toLocaleString()} <span className="text-xs text-slate-400 uppercase font-bold">{selectedIngForDetail.unit}</span></p>
                </div>
              </div>

              {/* Price History Chart */}
              <div className="bg-slate-950 p-10 rounded-[2.5rem] border-t-8 border-orange-500 shadow-2xl space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-orange-500" />
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Tren Harga Bahan Baku</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Periode Aktif</span>
                    </div>
                  </div>
                </div>

                <div className="h-72 w-full">
                  {selectedIngForDetail.priceHistory && selectedIngForDetail.priceHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedIngForDetail.priceHistory}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis
                          dataKey="timestamp"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#475569', fontWeight: 700, fontSize: 10 }}
                          tickFormatter={(ts) => new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          dy={15}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#475569', fontWeight: 700, fontSize: 10 }}
                          tickFormatter={(val) => `Rp ${val.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '20px',
                            color: '#fff',
                            padding: '16px'
                          }}
                          labelFormatter={(ts) => new Date(ts).toLocaleString('id-ID')}
                          formatter={(val: number) => [formatCurrency(val), 'Harga']}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#f97316"
                          strokeWidth={4}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700 space-y-4">
                      <History className="w-12 h-12 opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-20 text-center">Belum ada riwayat perubahan harga.<br />Data akan muncul setelah input pengeluaran bahan.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Composition Preview if Processed/Mix */}
              {(selectedIngForDetail.type === 'Processed' || selectedIngForDetail.type === 'Mix') && selectedIngForDetail.recipe && (
                <div className="space-y-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <Calculator className="w-5 h-5 text-slate-400" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Komposisi Bahan & Produksi</h3>
                    </div>

                    <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-500/10 p-3 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={scanQty}
                          onChange={e => setScanQty(Number(e.target.value))}
                          placeholder="Qty..."
                          className="w-20 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-500/30 rounded-xl px-3 py-2 font-black text-xs text-center outline-none"
                        />
                        <span className="text-[10px] font-black text-orange-600 uppercase">{selectedIngForDetail.unit}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (scanQty <= 0) return;
                          try {
                            await produceIngredient(selectedIngForDetail.id, scanQty);
                            const refreshed = await getIngredients();
                            setIngredients(refreshed);
                            setSelectedIngForDetail(refreshed.find(i => i.id === selectedIngForDetail.id) || null);
                            setScanQty(0);
                            alert("Produksi Berhasil!");
                          } catch (e: any) {
                            alert(e.message || "Gagal memproses produksi");
                          }
                        }}
                        className="bg-orange-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                      >
                        PROSES PRODUKSI
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedIngForDetail.recipe.map(r => {
                      const componentIng = ingredients.find(i => i.id === r.ingredientId);
                      return (
                        <div key={r.ingredientId} className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white">{componentIng?.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Stok: {componentIng?.stock} {componentIng?.unit} | HPP: {formatCurrency(componentIng?.pricePerUnit || 0)} / {componentIng?.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-orange-500">{r.quantity} <span className="text-[9px] uppercase">{componentIng?.unit}</span></p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Biaya: {formatCurrency((componentIng?.pricePerUnit || 0) * r.quantity)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PRODUCTION MODAL */}
      {isProductionOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Entry Produksi</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Konversi Bahan Mentah ke Olahan</p>
                </div>
              </div>
              <button onClick={() => setIsProductionOpen(false)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Bahan Olahan/Mix</label>
                  <select
                    value={selectedIngId}
                    onChange={e => { setSelectedIngId(e.target.value); setScanQty(0); }}
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none font-black text-lg text-slate-900 dark:text-white appearance-none transition-all focus:ring-4 focus:ring-orange-500/10"
                  >
                    <option value="">-- PILIH BAHAN --</option>
                    {ingredients.filter(i => i.type === 'Processed' || i.type === 'Mix').map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name.toUpperCase()} ({ing.unit})</option>
                    ))}
                  </select>
                </div>

                {selectedIngId && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Jumlah Produksi Baru</label>
                      <div className="flex items-center justify-center gap-8 bg-slate-50 dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setScanQty(Math.max(0, scanQty - 1))} className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-sm active:scale-90"><Minus className="w-6 h-6" /></button>
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            value={scanQty}
                            onChange={e => setScanQty(Number(e.target.value))}
                            className="bg-transparent w-32 text-center font-black text-5xl text-slate-900 dark:text-white outline-none"
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{ingredients.find(i => i.id === selectedIngId)?.unit}</span>
                        </div>
                        <button onClick={() => setScanQty(scanQty + 1)} className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-all shadow-sm active:scale-90"><Plus className="w-6 h-6" /></button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Pratinjau Pengurangan Bahan Mentah
                      </h3>
                      <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-slate-800 space-y-4 shadow-inner">
                        {(() => {
                          const target = ingredients.find(i => i.id === selectedIngId);
                          if (!target?.recipe || !Array.isArray(target.recipe)) return (
                            <p className="text-[10px] text-slate-500 font-bold uppercase italic text-center py-4">Resep belum diatur untuk bahan ini.</p>
                          );

                          return target.recipe.map((r: any) => {
                            const raw = ingredients.find(i => i.id === r.ingredientId);
                            const needed = r.quantity * scanQty;
                            const isEnough = (raw?.stock || 0) >= needed;

                            return (
                              <div key={r.ingredientId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div>
                                  <p className="text-white font-black text-xs uppercase">{raw?.name || 'Unknown'}</p>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Tersedia: {raw?.stock || 0} {raw?.unit}</p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-black ${isEnough ? 'text-green-400' : 'text-red-500'}`}>
                                    -{needed} <span className="text-[9px] uppercase">{raw?.unit}</span>
                                  </p>
                                  {!isEnough && <p className="text-[8px] font-black text-red-500 uppercase mt-0.5">STOK KURANG!</p>}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleQuickStockUpdate}
                disabled={!selectedIngId || scanQty <= 0 || (() => {
                  const target = ingredients.find(i => i.id === selectedIngId);
                  if (!target?.recipe || !Array.isArray(target.recipe)) return true;
                  return target.recipe.some((r: any) => {
                    const raw = ingredients.find(i => i.id === r.ingredientId);
                    return (raw?.stock || 0) < (r.quantity * scanQty);
                  });
                })()}
                className="w-full py-7 bg-orange-500 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-orange-600 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-4 active:scale-95 shadow-orange-500/30"
              >
                <Save className="w-6 h-6" /> Konfirmasi & Proses Produksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK STOCK UPDATE MODAL */}
      {isScanOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Update Stok Cepat</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gudang & Produksi Langsung</p>
              </div>
              <button onClick={() => setIsScanOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border border-slate-800 shadow-xl">
                {!isCameraActive ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 space-y-3">
                    <button onClick={startCamera} className="text-[10px] font-black uppercase tracking-widest bg-slate-800 px-6 py-3 rounded-xl text-white hover:bg-slate-700 transition-colors">Aktifkan Kamera Scan</button>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 border-2 border-orange-500/20 m-6 rounded-2xl pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-xl shadow-lg shadow-orange-500/30"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-xl shadow-lg shadow-orange-500/30"></div>
                </div>
              </div>

              {scanResult && (
                <div className="p-4 rounded-2xl text-[10px] font-black uppercase bg-green-500 text-white flex items-center gap-3 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-5 h-5" /> {scanResult}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Bahan</label>
                  <select
                    value={selectedIngId}
                    onChange={e => setSelectedIngId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="">-- PILIH BAHAN --</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name.toUpperCase()} ({ing.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Tambah Stok</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-6 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setScanQty(Math.max(0, scanQty - 1))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Minus className="w-5 h-5" /></button>
                    <input
                      type="number"
                      value={scanQty}
                      onChange={e => setScanQty(Number(e.target.value))}
                      className="bg-transparent w-full text-center font-black text-xl text-slate-900 dark:text-white outline-none py-2"
                    />
                    <button onClick={() => setScanQty(scanQty + 1)} className="p-2 text-slate-400 hover:text-orange-500 transition-colors"><Plus className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>

              {selectedIngId && ingredients.find(i => i.id === selectedIngId)?.type !== 'Raw' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tight">Menambah bahan ini akan otomatis memotong stok bahan baku sesuai resep.</p>
                </div>
              )}

              <button
                onClick={handleQuickStockUpdate}
                disabled={!selectedIngId || scanQty <= 0}
                className="w-full py-6 bg-slate-950 dark:bg-orange-500 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black dark:hover:bg-orange-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95 shadow-orange-500/20"
              >
                <Save className="w-4 h-4" /> Simpan Update Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[95vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingIngredient ? 'Edit Bahan' : 'Bahan Baru'}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest italic">Konfigurasi & Otomatisasi HPP</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 custom-scrollbar">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Kode Barcode / UPC</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-orange-600" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipe Bahan</label>
                    <select value={type} onChange={e => setType(e.target.value as IngredientType)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-slate-900 dark:text-white">
                      <option value="Raw">MENTAH (RAW)</option>
                      <option value="Processed">OLAHAN (PROCESSED)</option>
                      <option value="Mix">CAMPURAN (MIX)</option>
                      <option value="Packaging">KEMASAN (PACK)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap Bahan</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-slate-900 dark:text-white uppercase" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Satuan Unit</label>
                    <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="gr, ml, pcs" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-center" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Harga Unit (HPP)</label>
                      {(type === 'Processed' || type === 'Mix') && (
                        <button
                          onClick={() => setIsAutoCalc(!isAutoCalc)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${isAutoCalc ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                        >
                          <Calculator className="w-3 h-3" /> {isAutoCalc ? 'Otomatis' : 'Manual'}
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={pricePerUnit}
                      onChange={e => { setPricePerUnit(Number(e.target.value)); setIsAutoCalc(false); }}
                      disabled={isAutoCalc && (type === 'Processed' || type === 'Mix')}
                      className={`w-full px-5 py-4 border rounded-xl outline-none font-black text-right transition-all ${isAutoCalc && (type === 'Processed' || type === 'Mix') ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-orange-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Stok Saat Ini</label>
                    <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} className="w-full px-5 py-5 bg-slate-950 text-white rounded-xl outline-none font-black text-center text-xl shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-red-500">Alert Batas Minim</label>
                    <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} className="w-full px-5 py-5 bg-red-50 dark:bg-red-500/10 border-red-200 border text-red-600 rounded-xl outline-none font-black text-center text-xl" />
                  </div>
                </div>
              </div>

              {/* RECIPE AREA */}
              <div className="space-y-6">
                {(type === 'Processed' || type === 'Mix') ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Komposisi Bahan (Untuk 1 {unit})</label>
                      <div className="relative">
                        <button onClick={() => setShowIngDropdown(!showIngDropdown)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">Pilih Bahan Baku <ChevronDown className="w-3 h-3" /></button>
                        {showIngDropdown && (
                          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[110] p-3">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                              {ingredients.filter(i => (i.type === 'Raw' || i.type === 'Packaging') && i.id !== editingIngredient?.id).map(ing => (
                                <button key={ing.id} onClick={() => addIngredientToRecipe(ing.id)} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 hover:bg-orange-500 hover:text-white rounded-xl text-left transition-all">
                                  <span className="text-[10px] font-black uppercase">{ing.name}</span>
                                  <span className="text-[8px] font-bold opacity-60">{ing.unit}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 flex-1 shadow-inner space-y-3">
                      {recipe.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 opacity-30 py-10 scale-90">
                          <Layers className="w-12 h-12 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Pilih bahan baku untuk<br />menghitung HPP otomatis.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recipe.map(r => {
                            const ing = ingredients.find(i => i.id === r.ingredientId);
                            const sameUnit = ing?.unit === unit;
                            return (
                              <div key={r.ingredientId} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${sameUnit ? 'bg-orange-50/50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{ing?.name}</p>
                                    {sameUnit && <span className="text-[7px] bg-orange-500 text-white px-1 py-0.5 rounded font-black">SINKRON</span>}
                                  </div>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Biaya: {formatCurrency(ing?.pricePerUnit || 0)}/{ing?.unit}</p>

                                  {/* BATCH CALCULATOR TOOL */}
                                  {batchHelper?.id === r.ingredientId ? (
                                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-3 animate-in fade-in duration-300">
                                      <p className="text-[8px] font-black uppercase text-orange-600">Kalkulator Batch (Misal: 1kg ayam = 90pcs)</p>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          <input
                                            type="number"
                                            placeholder="Stok Mentah"
                                            className="w-full bg-white dark:bg-slate-900 border border-orange-200 rounded-lg px-2 py-1 text-[10px] font-black"
                                            onChange={(e) => setBatchHelper({ ...batchHelper, rawQty: Number(e.target.value) })}
                                          />
                                        </div>
                                        <span className="text-orange-400 font-bold">/</span>
                                        <div className="flex-1">
                                          <input
                                            type="number"
                                            placeholder="Hasil Pcs"
                                            className="w-full bg-white dark:bg-slate-900 border border-orange-200 rounded-lg px-2 py-1 text-[10px] font-black"
                                            onChange={(e) => setBatchHelper({ ...batchHelper, yieldQty: Number(e.target.value) })}
                                          />
                                        </div>
                                        <button
                                          onClick={() => {
                                            if (batchHelper.yieldQty > 0) {
                                              updateRecipeQty(r.ingredientId, batchHelper.rawQty / batchHelper.yieldQty);
                                            }
                                            setBatchHelper(null);
                                          }}
                                          className="bg-orange-500 text-white p-2 rounded-lg"
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setBatchHelper({ id: r.ingredientId, rawQty: 0, yieldQty: 0 })}
                                      className="mt-2 text-[8px] font-black uppercase text-orange-500 flex items-center gap-1 hover:opacity-70"
                                    >
                                      <Calculator className="w-3 h-3" /> Hitung Batch / Hasil
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="number" value={r.quantity} onChange={e => updateRecipeQty(r.ingredientId, Number(e.target.value))} className="w-20 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg font-black text-center text-[11px]" />
                                  <span className="text-[9px] font-black text-slate-400 uppercase w-8">{ing?.unit}</span>
                                </div>
                                <button onClick={() => setRecipe(recipe.filter(x => x.ingredientId !== r.ingredientId))} className="p-1.5 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )
                          })}
                          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estimasi HPP Per {unit}</p>
                            <p className="text-sm font-black text-orange-600">{formatCurrency(pricePerUnit)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 flex flex-col items-center justify-center text-center opacity-40">
                    <Package className="w-16 h-16 text-slate-300 mb-6" />
                    <h4 className="text-slate-500 font-black text-[9px] uppercase tracking-widest leading-relaxed">Produksi otomatis diaktifkan<br />jika tipe OLAHAN/MIX dipilih.</h4>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black text-[10px] uppercase bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl transition-colors hover:bg-slate-50">Batal</button>
              <button onClick={handleSave} className="flex-[2] py-5 bg-slate-950 dark:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 shadow-orange-500/20">
                <CheckCircle2 className="w-5 h-5" /> Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
