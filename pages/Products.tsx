
import React, { useState, useEffect } from 'react';
import { Plus, Coffee, Search, Trash2, Edit2, X, Save, ShieldCheck, ChevronDown, ImageIcon, Link as LinkIcon, MoreHorizontal, Globe, Image as ImageIconLucide } from 'lucide-react';
import { getProducts, getIngredients, createProduct, updateProduct, deleteProduct, calculateHPP } from '../store';
import { Product, Ingredient, ProductIngredient, SalesChannel } from '../types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [channelPrices, setChannelPrices] = useState<Record<SalesChannel, number>>({
    Offline: 0,
    ShopeeFood: 0,
    GrabFood: 0,
    GoFood: 0
  });
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [recipe, setRecipe] = useState<ProductIngredient[]>([]);
  const [showIngDropdown, setShowIngDropdown] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getIngredients().then(setIngredients).catch(console.error);
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setPrice(product.price);
      setChannelPrices(product.channelPrices || {
        Offline: product.price,
        ShopeeFood: product.price,
        GrabFood: product.price,
        GoFood: product.price
      });
      setCategory(product.category);
      setImageUrl(product.imageUrl || '');
      setRecipe(product.ingredients);
    } else {
      setEditingProduct(null);
      setName('');
      setPrice(0);
      setChannelPrices({
        Offline: 0,
        ShopeeFood: 0,
        GrabFood: 0,
        GoFood: 0
      });
      setCategory('');
      setImageUrl('');
      setRecipe([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || price <= 0) return;
    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `p-${Date.now()}`,
      name,
      price,
      channelPrices,
      category,
      imageUrl,
      isActive: true,
      ingredients: recipe
    };

    try {
      if (editingProduct) {
        const updated = await updateProduct(newProduct.id, newProduct);
        setProducts(products.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createProduct(newProduct);
        setProducts([...products, created]);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error("Failed to save product", e);
      alert("Gagal menyimpan produk");
    }
  };

  const deleteProductFn = async (id: string) => {
    if (confirm('Hapus menu ini dari katalog?')) {
      try {
        await deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (e) {
        console.error("Failed to delete product", e);
        alert("Gagal menghapus produk");
      }
    }
  };

  const addIngredientToRecipe = (ingId: string) => {
    if (recipe.find(r => r.ingredientId === ingId)) return;
    setRecipe([...recipe, { ingredientId: ingId, quantity: 1 }]);
    setShowIngDropdown(false);
  };

  const removeIngredientFromRecipe = (ingId: string) => {
    setRecipe(recipe.filter(r => r.ingredientId !== ingId));
  };

  const updateRecipeQty = (ingId: string, qty: number) => {
    setRecipe(recipe.map(r => r.ingredientId === ingId ? { ...r, quantity: qty } : r));
  };

  const currentHPP = recipe.reduce((total, r) => {
    const ing = ingredients.find(i => i.id === r.ingredientId);
    return total + (ing ? ing.pricePerUnit * r.quantity : 0);
  }, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleChannelPriceChange = (channel: SalesChannel, value: number) => {
    setChannelPrices(prev => ({ ...prev, [channel]: value }));
    if (channel === 'Offline') setPrice(value);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Katalog Menu</h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1 italic">Manajemen Produk & Multi-Channel Pricing</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari menu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="bg-orange-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Menu
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Produk</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kategori</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Harga Offline</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">HPP Est.</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Multi-Price</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredProducts.map(product => {
                const hpp = calculateHPP(product, ingredients);
                const hasMultiPrice = product.channelPrices && Object.values(product.channelPrices).some(p => p !== product.price);

                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-inner">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          ) : (
                            <Coffee className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 dark:text-white tracking-tight uppercase truncate">{product.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {product.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        {product.category || 'Unset'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(product.price)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-sm font-black text-orange-600 dark:text-orange-400">{formatCurrency(hpp)}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${hasMultiPrice ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                        <Globe className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{hasMultiPrice ? 'Aktif' : 'Standar'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(product)}
                          className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-orange-500 rounded-xl transition-all hover:shadow-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProductFn(product.id)}
                          className="p-3 bg-red-50 dark:bg-red-500/10 text-red-400 hover:text-red-500 rounded-xl transition-all hover:shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          {filteredProducts.map(product => {
            const hpp = calculateHPP(product, ingredients);
            const hasMultiPrice = product.channelPrices && Object.values(product.channelPrices).some(p => p !== product.price);
            return (
              <div
                key={product.id}
                onClick={() => openModal(product)}
                className="p-6 space-y-4 active:bg-slate-50 dark:active:bg-slate-800 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-inner">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{product.category || 'Unset'}</span>
                      {hasMultiPrice && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <Globe className="w-2.5 h-2.5" />
                          <span className="text-[7px] font-black uppercase">Multi</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white tracking-tight uppercase text-xs truncate">{product.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(product.price)}</p>
                      <p className="text-[10px] font-black text-orange-600 dark:text-orange-400">HPP: {formatCurrency(hpp)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingProduct ? 'Edit Menu' : 'Menu Baru'}</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 italic">Konfigurasi Harga Per Channel</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12 custom-scrollbar">
              <div className="space-y-10">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nama Produk</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] outline-none font-black text-xl text-slate-900 dark:text-white placeholder-slate-400"
                        placeholder="Nama Menu..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Kategori</label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-xs uppercase"
                        >
                          <option value="">PILIH KATEGORI</option>
                          <option value="Coffee">COFFEE</option>
                          <option value="Non-Coffee">NON-COFFEE</option>
                          <option value="Food">FOOD</option>
                          <option value="Snack">SNACK</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Link Gambar (URL)</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Image Preview Card */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex items-center gap-8">
                    <div className="w-32 h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={() => setImageUrl('')} />
                      ) : (
                        <ImageIconLucide className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Pratinjau Visual</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">Pastikan link gambar yang Anda masukkan dapat diakses secara publik.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pengaturan Harga Jual</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(['Offline', 'ShopeeFood', 'GrabFood', 'GoFood'] as SalesChannel[]).map(ch => (
                        <div key={ch} className="space-y-2">
                          <label className={`text-[9px] font-black uppercase tracking-widest ${ch === 'Offline' ? 'text-orange-500' : 'text-slate-400'}`}>{ch}</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={channelPrices[ch]}
                              onChange={e => handleChannelPriceChange(ch, Number(e.target.value))}
                              className={`w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-900 border rounded-xl outline-none font-black text-sm ${ch === 'Offline' ? 'border-orange-500 text-orange-600' : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 bg-slate-950 rounded-[2.5rem] border-t-8 border-orange-500 shadow-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2">HPP Per Porsi (EST)</span>
                      <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(currentHPP)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-green-400 uppercase tracking-widest block mb-2">Margin Offline</span>
                      <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(price - currentHPP)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resep / Bahan Baku</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowIngDropdown(!showIngDropdown)}
                        className="px-6 py-3 bg-slate-900 dark:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                      >
                        Pilih Bahan <ChevronDown className="w-4 h-4" />
                      </button>
                      {showIngDropdown && (
                        <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[110] p-4 animate-in zoom-in duration-200">
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                            {ingredients.map(ing => (
                              <button
                                key={ing.id}
                                onClick={() => addIngredientToRecipe(ing.id)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 hover:bg-orange-500 hover:text-white rounded-xl text-left transition-all"
                              >
                                <p className="text-[10px] font-black uppercase tracking-tight">{ing.name}</p>
                                <p className="text-[8px] font-bold opacity-60 mt-1 uppercase">{ing.unit} | {formatCurrency(ing.pricePerUnit)}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-inner min-h-[400px]">
                    {recipe.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-30">
                        <Coffee className="w-16 h-16 mb-4 text-slate-400 dark:text-white" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Daftar Bahan Kosong</p>
                      </div>
                    ) : (
                      recipe.map(r => {
                        const ing = ingredients.find(i => i.id === r.ingredientId);
                        return (
                          <div key={r.ingredientId} className="flex items-center gap-6 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{ing?.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={r.quantity}
                                onChange={e => updateRecipeQty(r.ingredientId, Number(e.target.value))}
                                className="w-20 px-3 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-center font-black text-sm"
                              />
                              <span className="text-[10px] text-slate-400 font-black uppercase w-8">{ing?.unit}</span>
                            </div>
                            <button onClick={() => removeIngredientFromRecipe(r.ingredientId)} className="p-2 text-red-300 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-6 bg-white dark:bg-slate-900 text-slate-400 font-black text-[11px] uppercase rounded-[2rem] border">Batal</button>
              <button onClick={handleSave} className="flex-[2] py-6 bg-orange-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-[2rem] shadow-2xl flex items-center justify-center gap-4">
                <Save className="w-6 h-6" /> Simpan Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
