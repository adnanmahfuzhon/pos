
import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonTransactions() {
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                        <Skeleton variant="rectangular" height={52} className="flex-1" />
                        <Skeleton variant="rectangular" width={180} height={52} />
                    </div>

                    {/* List items */}
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                                <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton variant="rectangular" width={100} height={10} />
                                    <Skeleton variant="rectangular" width={200} height={16} />
                                </div>
                                <Skeleton variant="rectangular" width={120} height={24} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                        <Skeleton variant="rectangular" width={100} height={12} />
                        <div className="space-y-4">
                            <div>
                                <Skeleton variant="rectangular" width={80} height={10} className="mb-2" />
                                <Skeleton variant="rectangular" width="90%" height={32} />
                            </div>
                            <Skeleton variant="rectangular" height={8} className="rounded-full" />
                            <Skeleton variant="rectangular" height={50} className="rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
