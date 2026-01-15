
import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonIngredients() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Skeleton variant="rectangular" width={220} height={36} />
                    <Skeleton variant="rectangular" width={160} height={14} />
                </div>
                <Skeleton variant="rectangular" width={180} height={56} />
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6">
                        <Skeleton variant="circular" width={64} height={64} />
                        <div className="space-y-2 flex-1">
                            <Skeleton variant="rectangular" width={100} height={12} />
                            <Skeleton variant="rectangular" width={60} height={32} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
                <Skeleton variant="rectangular" height={52} className="flex-1" />
                <Skeleton variant="rectangular" width={120} height={52} />
                <Skeleton variant="rectangular" width={120} height={52} />
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                                <Skeleton variant="rectangular" width={150} height={18} />
                                <Skeleton variant="rectangular" width={80} height={12} />
                            </div>
                            <Skeleton variant="circular" width={10} height={10} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton variant="rectangular" height={70} className="rounded-2xl" />
                            <Skeleton variant="rectangular" height={70} className="rounded-2xl" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton variant="rectangular" height={44} className="flex-1 rounded-2xl" />
                            <Skeleton variant="rectangular" height={44} className="flex-1 rounded-2xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
