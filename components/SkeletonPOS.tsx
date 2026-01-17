
import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonPOS() {
    return (
        <div className="flex h-[calc(100vh-128px)] lg:h-screen -m-4 md:-m-8 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
            {/* LEFT: Menu Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 overflow-y-auto">
                {/* Header with Search */}
                <header className="flex flex-col gap-6 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div>
                            <Skeleton variant="rectangular" width={200} height={28} className="rounded-xl" />
                            <Skeleton variant="rectangular" width={120} height={12} className="mt-2 rounded-lg" />
                        </div>
                        <Skeleton variant="rectangular" width={280} height={48} className="rounded-2xl" />
                    </div>
                    {/* Channel Selector */}
                    <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm w-fit">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} variant="rectangular" width={80} height={40} className="rounded-xl" />
                        ))}
                    </div>
                </header>

                {/* Category Accordions */}
                <div className="space-y-4 pb-24">
                    {[1, 2, 3].map(cat => (
                        <div key={cat} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-4 md:p-5">
                                <div className="flex items-center gap-3">
                                    <Skeleton variant="rectangular" width={80} height={28} className="rounded-xl" />
                                    <Skeleton variant="rectangular" width={50} height={16} className="rounded-lg" />
                                </div>
                                <Skeleton variant="circular" width={20} height={20} />
                            </div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6 p-4 md:p-6 pt-0">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                                        <div className="aspect-square w-full">
                                            <Skeleton variant="rectangular" width="100%" height="100%" />
                                        </div>
                                        <div className="p-3 md:p-5 space-y-3">
                                            <Skeleton variant="rectangular" width="80%" height={14} className="rounded-lg" />
                                            <div className="flex justify-between items-center">
                                                <Skeleton variant="rectangular" width="50%" height={16} className="rounded-lg" />
                                                <Skeleton variant="rectangular" width={32} height={32} className="rounded-xl" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Sidebar Billing */}
            <div className="hidden lg:flex flex-col w-[380px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="rectangular" width={44} height={44} className="rounded-xl" />
                        <div className="space-y-1">
                            <Skeleton variant="rectangular" width={80} height={18} className="rounded-lg" />
                            <Skeleton variant="rectangular" width={100} height={10} className="rounded-lg" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                            <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="rectangular" width="70%" height={12} className="rounded-lg" />
                                <Skeleton variant="rectangular" width="40%" height={10} className="rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-8 pb-32 lg:pb-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                    <Skeleton variant="rectangular" width="100%" height={16} className="rounded-lg" />
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton variant="rectangular" width="100%" height={56} className="rounded-2xl" />
                        <Skeleton variant="rectangular" width="100%" height={56} className="rounded-2xl" />
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b">
                        <Skeleton variant="rectangular" width={80} height={12} className="rounded-lg" />
                        <Skeleton variant="rectangular" width={120} height={28} className="rounded-lg" />
                    </div>
                    <Skeleton variant="rectangular" width="100%" height={64} className="rounded-3xl" />
                </div>
            </div>
        </div>
    );
}
