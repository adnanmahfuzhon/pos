
import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonPOS() {
    return (
        <div className="h-[100vh] flex flex-col lg:flex-row gap-6 p-4 lg:p-8 animate-in fade-in duration-500 overflow-hidden">
            {/* Products Section */}
            <div className="flex-[2] flex flex-col gap-6 min-w-0">
                {/* Header with Search */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                    <Skeleton variant="rectangular" height={52} className="flex-1" />
                    <div className="flex gap-2">
                        <Skeleton variant="rectangular" width={100} height={52} />
                        <Skeleton variant="rectangular" width={100} height={52} />
                    </div>
                </div>

                {/* Categories (if any) or quick filters */}
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} variant="rectangular" width={100} height={40} className="shrink-0 rounded-xl" />
                    ))}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
                                <Skeleton variant="rectangular" width="100%" height={120} className="rounded-3xl" />
                                <div className="space-y-2">
                                    <Skeleton variant="rectangular" width="80%" height={14} />
                                    <Skeleton variant="rectangular" width="50%" height={12} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Section */}
            <div className="flex-1 min-w-[380px] hidden lg:flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <Skeleton variant="rectangular" width={150} height={24} />
                </div>
                <div className="flex-1 p-8">
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton variant="rectangular" width="70%" height={12} />
                                    <Skeleton variant="rectangular" width="40%" height={10} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-10 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex justify-between">
                        <Skeleton variant="rectangular" width={80} height={12} />
                        <Skeleton variant="rectangular" width={120} height={28} />
                    </div>
                    <Skeleton variant="rectangular" width="100%" height={64} className="rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
