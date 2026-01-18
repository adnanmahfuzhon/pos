import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, Search, Edit2, Trash2, X, CheckCircle2, Loader2, Users } from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    _count?: {
        users: number;
        products: number;
        ingredients: number;
    };
}

export default function BranchesPage() {
    const { token, isSuperAdmin, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [branchName, setBranchName] = useState('');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    useEffect(() => {
        if (!isAuthLoading && isAuthenticated && !isSuperAdmin) {
            router.push('/');
        }
        if (isAuthenticated && isSuperAdmin) {
            fetchBranches();
        }
    }, [isAuthLoading, isAuthenticated, isSuperAdmin, router]);

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/branches', { headers });
            if (res.ok) {
                const data = await res.json();
                setBranches(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch branches:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setError('');
        if (!branchName.trim()) {
            setError('Nama cabang wajib diisi');
            return;
        }

        setIsSaving(true);
        try {
            const url = editingId ? `/api/branches/${editingId}` : '/api/branches';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({ name: branchName.trim() })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan cabang');
            }

            if (editingId) {
                setBranches(branches.map(b => b.id === editingId ? data : b));
            } else {
                setBranches([data, ...branches]);
            }

            setIsModalOpen(false);
            resetForm();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus cabang ini? Semua data terkait akan terhapus!')) return;

        try {
            const res = await fetch(`/api/branches/${id}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal menghapus');
            }

            setBranches(branches.filter(b => b.id !== id));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const openEdit = (branch: Branch) => {
        setEditingId(branch.id);
        setBranchName(branch.name);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setBranchName('');
        setError('');
    };

    const filtered = branches.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-slate-400">Anda tidak memiliki akses ke halaman ini</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                        Manajemen Cabang
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">
                        Kelola cabang usaha Anda
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto bg-orange-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Cabang
                </button>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari cabang..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-black text-xs text-slate-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Branches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-slate-900 p-20 text-center rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                        <Building2 className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">
                            Belum ada cabang terdaftar
                        </p>
                    </div>
                ) : (
                    filtered.map(branch => (
                        <div
                            key={branch.id}
                            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEdit(branch)}
                                        className="p-2 text-slate-300 hover:text-orange-500 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(branch.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-4">
                                {branch.name}
                            </h3>

                            {branch._count && (
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full uppercase">
                                        <Users className="w-3 h-3 inline mr-1" />
                                        {branch._count.users} User
                                    </span>
                                    <span className="text-[9px] font-black bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full uppercase">
                                        {branch._count.products} Produk
                                    </span>
                                    <span className="text-[9px] font-black bg-purple-500/10 text-purple-500 px-3 py-1.5 rounded-full uppercase">
                                        {branch._count.ingredients} Bahan
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                    {editingId ? 'Edit Cabang' : 'Tambah Cabang'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                    <p className="text-red-500 text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nama Cabang</label>
                                <input
                                    type="text"
                                    value={branchName}
                                    onChange={e => setBranchName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white uppercase"
                                    placeholder="Contoh: Cabang Jakarta"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-[2] py-5 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-3 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                {isSaving ? 'MEMPROSES...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
