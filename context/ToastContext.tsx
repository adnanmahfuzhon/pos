
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => string;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        if (type !== 'loading') {
            setTimeout(() => removeToast(id), 3000);
        }
        return id;
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}
            <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-xs">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto flex items-center justify-between gap-4 p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300
              ${toast.type === 'success' ? 'bg-green-500 border-green-600 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-500 border-red-600 text-white' : ''}
              ${toast.type === 'info' ? 'bg-blue-500 border-blue-600 text-white' : ''}
              ${toast.type === 'loading' ? 'bg-slate-800 border-slate-700 text-white' : ''}
            `}
                    >
                        <div className="flex items-center gap-3">
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {toast.type === 'info' && <Info className="w-5 h-5" />}
                            {toast.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                            <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
                        </div>
                        {toast.type !== 'loading' && (
                            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 p-1 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
