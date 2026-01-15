
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
    width?: string | number;
    height?: string | number;
}

export default function Skeleton({ className = '', variant = 'rectangular', width, height }: SkeletonProps) {
    const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-800';
    const variantClasses = {
        rectangular: 'rounded-2xl',
        circular: 'rounded-full',
        text: 'rounded-md h-4 w-3/4 mb-2'
    };

    const style = {
        width: width || '100%',
        height: height || (variant === 'text' ? undefined : '100%')
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
}
