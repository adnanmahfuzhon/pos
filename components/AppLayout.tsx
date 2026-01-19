import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    ShoppingCart,
    Milk,
    Receipt,
    Menu,
    User,
    Coffee,
    TrendingUp,
    Moon,
    Sun,
    LogOut,
    Users,
    Building2,
    ChevronDown,
    Eye,
    WifiOff,
    Wifi
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import OfflineSyncBanner from './OfflineSyncBanner';

interface NavItem {
    icon: any;
    label: string;
    path: string;
    menuKey?: string;
    viewOnly?: boolean;
}

const Sidebar = ({ isOpen, toggle, theme, toggleTheme, router, navItems, user, branch, onLogout, isSuperAdmin, selectedBranchName }: {
    isOpen: boolean;
    toggle: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    router: any;
    navItems: NavItem[];
    user: any;
    branch: any;
    onLogout: () => void;
    isSuperAdmin: boolean;
    selectedBranchName: string | null;
}) => {

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-md"
                    onClick={toggle}
                />
            )}
            <aside className={`fixed top-0 left-0 h-full w-64 border-r z-50 transition-all duration-300 lg:translate-x-0 
        ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-slate-800'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
                            <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        Flavor<span className="text-orange-500">POS</span> <span className="text-xs text-gray-500">v2.1</span>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>

                {/* Branch indicator for Super Admin */}
                {isSuperAdmin && selectedBranchName && (
                    <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-black text-orange-500 uppercase tracking-wide truncate">
                                {selectedBranchName}
                            </span>
                        </div>
                    </div>
                )}

                <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {navItems.map((item) => {
                        const isActive = router.pathname === item.path || router.pathname.toLowerCase() === item.path.toLowerCase();
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => window.innerWidth < 1024 && toggle()}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'}
                `}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-semibold text-sm">{item.label}</span>
                                {item.viewOnly && (
                                    <Eye className="w-3 h-3 ml-auto opacity-50" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className={`absolute bottom-0 left-0 w-full p-4 border-t ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm">
                            <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                                {user?.name || 'User'}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                {user?.role?.replace('_', ' ') || 'Guest'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar
                    </button>
                </div>
            </aside>
        </>
    );
};

export default function AppLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading, user, branch, logout, canView, isSuperAdmin, selectedBranchId, setSelectedBranchId } = useAuth();
    const isOnline = useOnlineStatus();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [branches, setBranches] = useState<any[]>([]);
    const [pendingBranchId, setPendingBranchId] = useState<string>(''); // For modal dropdown

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Handle hydration mismatch by waiting for mount
    useEffect(() => {
        const saved = localStorage.getItem('pos_theme') as 'light' | 'dark';
        if (saved) setTheme(saved);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('pos_theme', theme);
    }, [theme]);

    // Fetch branches for Super Admin
    useEffect(() => {
        if (isSuperAdmin && isAuthenticated) {
            fetch('/api/branches')
                .then(res => res.json())
                .then(data => setBranches(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [isSuperAdmin, isAuthenticated]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Build navigation items based on role
    const navItems: NavItem[] = [];

    if (canView('dashboard')) {
        navItems.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/', menuKey: 'dashboard' });
    }

    if (canView('pos')) {
        navItems.push({
            icon: ShoppingCart,
            label: isSuperAdmin ? 'Lihat POS' : 'Kasir (POS)',
            path: '/pos',
            viewOnly: isSuperAdmin
        });
    }

    if (canView('products')) {
        navItems.push({
            icon: Coffee,
            label: isSuperAdmin ? 'Lihat Menu' : 'Daftar Menu',
            path: '/products',
            viewOnly: isSuperAdmin
        });
    }

    if (canView('ingredients')) {
        navItems.push({
            icon: Milk,
            label: isSuperAdmin ? 'Lihat Gudang' : 'Gudang Bahan',
            path: '/ingredients',
            viewOnly: isSuperAdmin
        });
    }

    if (canView('incomes')) {
        navItems.push({
            icon: TrendingUp,
            label: isSuperAdmin ? 'Lihat Pemasukan' : 'Pemasukan',
            path: '/incomes',
            viewOnly: isSuperAdmin
        });
    }

    if (canView('expenses')) {
        navItems.push({
            icon: Receipt,
            label: isSuperAdmin ? 'Lihat Pengeluaran' : 'Pengeluaran',
            path: '/expenses',
            viewOnly: isSuperAdmin
        });
    }

    if (canView('users')) {
        navItems.push({ icon: Users, label: 'Manajemen User', path: '/users' });
    }

    if (canView('branches')) {
        navItems.push({ icon: Building2, label: 'Manajemen Cabang', path: '/branches' });
    }

    // Get selected branch name
    const selectedBranchName = isSuperAdmin
        ? branches.find(b => b.id === selectedBranchId)?.name || branch?.name
        : branch?.name;

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Coffee className="w-12 h-12 text-orange-500" />
                    <span className="text-slate-400 text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    // Super Admin Branch Selection Guard
    const protectedRoutes = ['/pos', '/products', '/ingredients', '/incomes', '/expenses'];
    const isProtectedRoute = protectedRoutes.some(route => router.pathname.startsWith(route));
    const showBranchSelectionPrompt = isSuperAdmin && !selectedBranchId && isProtectedRoute;

    if (showBranchSelectionPrompt) {
        const handleConfirmBranch = () => {
            if (pendingBranchId) {
                setSelectedBranchId(pendingBranchId);
                // Page will auto-reload with correct branch context
            }
        };

        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
                <div className="max-w-md w-full bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20 mb-8">
                        <Building2 className="w-10 h-10 text-white animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight mb-4">Pilih Cabang Dulu</h1>
                    <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                        Sebagai Super Admin, Anda harus memilih cabang spesifik sebelum mengakses menu ini.
                    </p>

                    {/* Branch Dropdown */}
                    <select
                        value={pendingBranchId}
                        onChange={(e) => setPendingBranchId(e.target.value)}
                        className="w-full p-4 mb-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">-- Pilih Cabang --</option>
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleConfirmBranch}
                        disabled={!pendingBranchId}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${pendingBranchId
                            ? 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        Konfirmasi & Lanjutkan
                    </button>

                    <Link href="/" className="mt-4 block w-full py-3 text-slate-400 hover:text-orange-500 text-xs font-bold uppercase tracking-widest transition-colors">
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <Sidebar
                isOpen={isSidebarOpen}
                toggle={() => setIsSidebarOpen(!isSidebarOpen)}
                theme={theme}
                toggleTheme={toggleTheme}
                router={router}
                navItems={navItems}
                user={user}
                branch={branch}
                onLogout={logout}
                isSuperAdmin={isSuperAdmin}
                selectedBranchName={selectedBranchName}
            />

            {/* Bottom Navigation for Mobile */}
            <nav className={`fixed bottom-0 left-0 right-0 z-[100] lg:hidden flex items-center justify-around p-3 border-t backdrop-blur-xl transition-all
              ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                {navItems.slice(0, 5).map((item, idx) => {
                    const isActive = router.pathname === item.path || router.pathname.toLowerCase() === item.path.toLowerCase();
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="flex flex-col items-center">
                            <Link
                                href={item.path}
                                className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400'}`}
                            >
                                <Icon className="w-5 h-5" />
                            </Link>
                        </div>
                    );
                })}
            </nav>

            <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b lg:hidden
          ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-gray-100'}`}>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:opacity-70 text-current">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-orange-500" />
                        <span className="font-bold">FlavorPOS</span>
                        {!isOnline && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                <WifiOff className="w-3 h-3" /> Offline
                            </span>
                        )}
                    </div>
                    <div className="w-10"></div>
                </header>

                <div className="p-4 md:p-8 flex-1 overflow-x-hidden pb-24 lg:pb-8">
                    {children}
                </div>
            </main>

            {/* Offline Sync Banner */}
            <OfflineSyncBanner />
        </div>
    );
}
