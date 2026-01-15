
import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Skeleton variant="rectangular" width={200} height={36} />
                    <Skeleton variant="rectangular" width={150} height={14} />
                </div>
                <Skeleton variant="rectangular" width={180} height={56} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton variant="circular" width={40} height={40} />
                            <Skeleton variant="rectangular" width={60} height={12} />
                        </div>
                        <Skeleton variant="rectangular" width="80%" height={28} />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center justify-between">
                        <Skeleton variant="rectangular" width={150} height={20} />
                        <div className="flex gap-2">
                            <Skeleton variant="rectangular" width={80} height={32} />
                            <Skeleton variant="rectangular" width={80} height={32} />
                        </div>
                    </div>
                    <Skeleton variant="rectangular" width="100%" height={300} />
                </div>

                {/* Side Section */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6">
                    <Skeleton variant="rectangular" width={120} height={16} />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton variant="circular" width={40} height={40} />
                                <div className="flex-1 space-y-2">
                                    <Skeleton variant="rectangular" width="60%" height={12} />
                                    <Skeleton variant="rectangular" width="40%" height={10} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
