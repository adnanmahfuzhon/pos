import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueue, syncQueue, QueuedItem } from '../lib/offlineQueue';
import { useToast } from '../context/ToastContext';

export default function OfflineSyncBanner() {
    const isOnline = useOnlineStatus();
    const { showToast, updateToast } = useToast();
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

    // Check pending items on mount and when online status changes
    useEffect(() => {
        const checkQueue = () => {
            const queue = getQueue();
            setPendingCount(queue.length);
        };

        checkQueue();

        // Check periodically
        const interval = setInterval(checkQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && pendingCount > 0 && !isSyncing) {
            handleSync();
        }
    }, [isOnline]);

    const handleSync = async () => {
        if (isSyncing || pendingCount === 0) return;

        setIsSyncing(true);
        const toastId = showToast('Menyinkronkan data...', 'loading');

        try {
            const result = await syncQueue(
                (item) => {
                    // On success for each item
                    setPendingCount(prev => prev - 1);
                },
                (item, error) => {
                    console.error('Sync failed for item:', item.id, error);
                }
            );

            setLastSyncResult(result);

            if (result.synced > 0 && result.failed === 0) {
                updateToast(toastId, `${result.synced} transaksi berhasil disinkronkan!`, 'success');
            } else if (result.failed > 0) {
                updateToast(toastId, `${result.synced} berhasil, ${result.failed} gagal`, 'error');
            } else {
                updateToast(toastId, 'Tidak ada data untuk disinkronkan', 'success');
            }

            // Refresh pending count
            setPendingCount(getQueue().length);
        } catch (error) {
            updateToast(toastId, 'Gagal menyinkronkan data', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // Don't show if online and no pending items
    if (isOnline && pendingCount === 0) return null;

    return (
        <div className={`fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${isOnline
                ? 'bg-orange-500/90 border-orange-400 text-white'
                : 'bg-slate-900/90 border-slate-700 text-white'
            }`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {isOnline ? (
                        <Cloud className="w-5 h-5" />
                    ) : (
                        <CloudOff className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide">
                            {isOnline ? 'Pending Sync' : 'Mode Offline'}
                        </p>
                        <p className="text-[10px] opacity-80">
                            {pendingCount > 0
                                ? `${pendingCount} transaksi menunggu`
                                : 'Tidak ada koneksi internet'}
                        </p>
                    </div>
                </div>

                {isOnline && pendingCount > 0 && (
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </div>
    );
}
