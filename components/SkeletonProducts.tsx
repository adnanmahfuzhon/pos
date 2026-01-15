
import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonProducts() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Skeleton variant="rectangular" width={240} height={36} />
                    <Skeleton variant="rectangular" width={180} height={14} />
                </div>
                <div className="flex gap-4">
                    <Skeleton variant="rectangular" width={260} height={56} className="rounded-2xl" />
                    <Skeleton variant="rectangular" width={160} height={56} className="rounded-[1.5rem]" />
                </div>
            </div>

            {/* Table Desktop / Card List Mobile */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Desktop View */}
                <div className="hidden lg:block">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between">
                        <Skeleton variant="rectangular" width={100} height={10} />
                        <Skeleton variant="rectangular" width={100} height={10} />
                        <Skeleton variant="rectangular" width={100} height={10} />
                        <Skeleton variant="rectangular" width={100} height={10} />
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="px-8 py-6 flex items-center gap-6">
                                <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton variant="rectangular" width={150} height={14} />
                                    <Skeleton variant="rectangular" width={80} height={10} />
                                </div>
                                <Skeleton variant="rectangular" width={100} height={20} className="rounded-xl" />
                                <Skeleton variant="rectangular" width={80} height={20} />
                                <Skeleton variant="rectangular" width={80} height={20} />
                                <div className="flex gap-2">
                                    <Skeleton variant="rectangular" width={40} height={40} className="rounded-xl" />
                                    <Skeleton variant="rectangular" width={40} height={40} className="rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-800">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="p-6 flex items-center gap-4">
                            <Skeleton variant="rectangular" width={64} height={64} className="rounded-2xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="rectangular" width="40%" height={10} />
                                <Skeleton variant="rectangular" width="80%" height={14} />
                                <div className="flex justify-between items-center pt-2">
                                    <Skeleton variant="rectangular" width={60} height={16} />
                                    <Skeleton variant="rectangular" width={50} height={12} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
