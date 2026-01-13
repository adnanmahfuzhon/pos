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
    Sun
} from 'lucide-react';

const Sidebar = ({ isOpen, toggle, theme, toggleTheme, router }: {
    isOpen: boolean;
    toggle: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    router: any;
}) => {

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: ShoppingCart, label: 'Kasir (POS)', path: '/POS' },
        { icon: Coffee, label: 'Daftar Menu', path: '/Products' },
        { icon: Milk, label: 'Gudang Bahan', path: '/Ingredients' },
        { icon: TrendingUp, label: 'Pemasukan', path: '/Incomes' },
        { icon: Receipt, label: 'Pengeluaran', path: '/Expenses' },
    ];

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
                        <h1 className="text-xl font-bold tracking-tight">
                            Flavor<span className="text-orange-500">POS</span>
                        </h1>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = router.pathname === item.path;
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
                            </Link>
                        )
                    })}
                </nav>

                <div className={`absolute bottom-0 left-0 w-full p-6 border-t ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm">
                            <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Administrator</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sistem Online</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default function AppLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className={`min-h-screen flex transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <Sidebar
                isOpen={isSidebarOpen}
                toggle={() => setIsSidebarOpen(!isSidebarOpen)}
                theme={theme}
                toggleTheme={toggleTheme}
                router={router}
            />

            {/* Bottom Navigation for Mobile */}
            <nav className={`fixed bottom-0 left-0 right-0 z-[100] lg:hidden flex items-center justify-around p-3 border-t backdrop-blur-xl transition-all
              ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                {[
                    { icon: LayoutDashboard, label: 'Dash', path: '/' },
                    { icon: ShoppingCart, label: 'POS', path: '/POS' },
                    { icon: Milk, label: 'Gudang', path: '/Ingredients' },
                    { icon: TrendingUp, label: 'Income', path: '/Incomes' },
                    { icon: Menu, label: 'Menu', onClick: () => setIsSidebarOpen(true) }
                ].map((item, idx) => {
                    const isActive = router.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="flex flex-col items-center">
                            {item.path ? (
                                <Link
                                    href={item.path}
                                    className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400'}`}
                                >
                                    <Icon className="w-5 h-5" />
                                </Link>
                            ) : (
                                <button
                                    onClick={item.onClick}
                                    className="p-2.5 rounded-2xl text-slate-400"
                                >
                                    <Icon className="w-5 h-5" />
                                </button>
                            )}
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
                    </div>
                    <div className="w-10"></div>
                </header>

                <div className="p-4 md:p-8 flex-1 overflow-x-hidden pb-24 lg:pb-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
