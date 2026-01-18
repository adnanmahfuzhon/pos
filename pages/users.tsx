import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Search, Edit2, Trash2, X, CheckCircle2, Loader2, Shield, User, Building2 } from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    name: string;
    role: string;
    branchId: string | null;
    isActive: boolean;
    createdAt: string;
    branch?: { id: string; name: string } | null;
}

interface Branch {
    id: string;
    name: string;
}

const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager Cabang',
    STAFF: 'Staff'
};

const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    MANAGER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    STAFF: 'bg-green-500/10 text-green-500 border-green-500/20'
};

export default function UsersPage() {
    const { user: currentUser, isSuperAdmin, isManager, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    // Edit Mode State
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    // Redirect Staff to POS
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated && currentUser?.role === 'STAFF') {
            router.push('/pos');
        }
    }, [isAuthLoading, isAuthenticated, currentUser, router]);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'STAFF',
        branchId: ''
    });

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    useEffect(() => {
        fetchUsers();
        fetchBranches();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', { headers });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error('Failed to fetch users:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/branches', { headers });
            if (res.ok) {
                const data = await res.json();
                setBranches(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch branches:', e);
        }
    };

    const handleSave = async () => {
        setError('');
        if (!formData.email || !formData.name) {
            setError('Nama dan Email wajib diisi');
            return;
        }

        // Password required only for new users
        if (!editingUser && !formData.password) {
            setError('Password wajib diisi untuk user baru');
            return;
        }

        if (formData.role !== 'SUPER_ADMIN' && !formData.branchId) {
            setError('Pilih cabang untuk user ini');
            return;
        }

        setIsSaving(true);
        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Gagal menyimpan user');
            }

            // Refresh list
            fetchUsers();

            setIsModalOpen(false);
            resetForm();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (user: UserData) => {
        if (!window.confirm(`Yakin ingin menghapus user "${user.name}"?`)) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers
            });

            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Gagal menghapus user');
            }
        } catch (e) {
            console.error('Delete failed:', e);
        }
    };

    const handleToggleActive = async (user: UserData) => {
        const newStatus = !user.isActive;
        if (!window.confirm(`Yakin ingin mengubah status user ini menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}?`)) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ isActive: newStatus })
            });

            if (res.ok) {
                fetchUsers();
            }
        } catch (e) {
            console.error('Toggle status failed:', e);
        }
    };

    const handleEdit = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '', // Leave empty to keep unchanged
            name: user.name,
            role: user.role,
            branchId: user.branchId || ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            name: '',
            role: 'STAFF',
            branchId: isManager ? (currentUser?.branchId || '') : ''
        });
        setError('');
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

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
                        {isSuperAdmin ? 'Manajemen User' : 'Staff Cabang'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">
                        {isSuperAdmin ? 'Kelola semua pengguna sistem' : 'Kelola staff di cabang Anda'}
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
                    Tambah User
                </button>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari user..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-black text-xs text-slate-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-20 text-center rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                        <Users className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">
                            Belum ada user terdaftar
                        </p>
                    </div>
                ) : (
                    filtered.map(u => (
                        <div
                            key={u.id}
                            className={`bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border ${u.isActive ? 'border-slate-100 dark:border-slate-800' : 'border-red-500/20 bg-red-50/50 dark:bg-red-500/5'} shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-colors`}
                        >
                            <div className={`p-4 rounded-2xl border ${roleColors[u.role]}`}>
                                {u.role === 'SUPER_ADMIN' ? (
                                    <Shield className="w-6 h-6" />
                                ) : (
                                    <User className="w-6 h-6" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${roleColors[u.role]}`}>
                                        {roleLabels[u.role]}
                                    </span>
                                    {!u.isActive && (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                            Nonaktif
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-black text-slate-900 dark:text-white tracking-tight uppercase text-lg">
                                    {u.name}
                                </h4>
                                <p className="text-xs font-bold text-slate-400">{u.email}</p>
                                {u.branch && (
                                    <div className="flex items-center gap-1 mt-2">
                                        <Building2 className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{u.branch.name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Action Buttons */}
                                <button
                                    onClick={() => handleToggleActive(u)}
                                    className={`p-3 rounded-2xl border transition-all ${u.isActive ? 'text-green-500 border-green-500/20 hover:bg-green-50' : 'text-red-500 border-red-500/20 hover:bg-red-50'}`}
                                    title={u.isActive ? "Nonaktifkan User" : "Aktifkan User"}
                                >
                                    {u.isActive ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>

                                <button
                                    onClick={() => handleEdit(u)}
                                    className="p-3 text-blue-500 border border-blue-500/20 rounded-2xl hover:bg-blue-50 transition-all"
                                    title="Edit User"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => handleDelete(u)}
                                    className="p-3 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-50 transition-all"
                                    title="Hapus User"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                    {editingUser ? 'Edit User' : 'Tambah User Baru'}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {editingUser ? 'Ubah data pengguna' : 'Buat akun pengguna'}
                                </p>
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
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white"
                                    placeholder="Nama user..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white"
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Password {editingUser && '(Kosongkan jika tidak diubah)'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white"
                                    placeholder={editingUser ? "Biarkan kosong..." : "Min 6 karakter"}
                                />
                            </div>

                            {/* Role & Branch Selection (Only Super Admin can change Role) */}
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Role</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(roleLabels).map(([key, label]) => (
                                            <button
                                                key={key}
                                                onClick={() => setFormData({ ...formData, role: key })}
                                                className={`py-4 rounded-xl border-2 transition-all font-black text-[9px] uppercase tracking-tighter ${formData.role === key
                                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600'
                                                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.role !== 'SUPER_ADMIN' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cabang</label>
                                    <select
                                        value={formData.branchId}
                                        onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                        disabled={isManager} // Manager cannot change branch
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-black text-slate-900 dark:text-white uppercase text-xs disabled:opacity-50"
                                    >
                                        <option value="">Pilih Cabang</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                {isSaving ? 'MEMPROSES...' : 'Simpan User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
