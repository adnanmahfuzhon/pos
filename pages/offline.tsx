import React from 'react';
import Link from 'next/link';
import { WifiOff, Home, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md w-full">
                <div className="w-24 h-24 bg-orange-500/20 rounded-3xl mx-auto flex items-center justify-center mb-8">
                    <WifiOff className="w-12 h-12 text-orange-500" />
                </div>

                <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Offline Mode</h1>

                <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                    Anda sedang tidak terhubung ke internet.
                    Halaman ini tidak tersedia dalam mode offline.
                </p>

                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 mb-8">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">
                        Tips
                    </p>
                    <p className="text-sm text-slate-300">
                        Halaman yang pernah Anda kunjungi sebelumnya mungkin masih bisa diakses secara offline.
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center justify-center gap-3"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Coba Lagi
                    </button>

                    <Link
                        href="/"
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center justify-center gap-3"
                    >
                        <Home className="w-4 h-4" />
                        Kembali ke Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
