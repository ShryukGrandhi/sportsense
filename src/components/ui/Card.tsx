'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode;
    variant?: 'default' | 'glow' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
    { children, className, variant = 'default', padding = 'md', hover = true, ...props },
    ref
) {
    return (
        <motion.div
            ref={ref}
            className={clsx(
                'rounded-xl border backdrop-blur-md transition-all duration-300',
                'bg-gradient-to-br from-slate-800/80 to-slate-900/80',
                'border-slate-700/50',
                hover && 'hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10',
                variant === 'glow' && 'glow-border',
                variant === 'glass' && 'bg-white/5',
                paddingClasses[padding],
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            {...props}
        >
            {children}
        </motion.div>
    );
});

interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    highlight?: boolean;
}

export function StatCard({ label, value, subValue, trend, highlight }: StatCardProps) {
    return (
        <div
            className={clsx(
                'flex flex-col gap-1 p-4 rounded-lg',
                highlight
                    ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30'
                    : 'bg-slate-800/50'
            )}
        >
            <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className={clsx(
                    'text-2xl font-bold',
                    highlight ? 'text-white' : 'text-slate-100'
                )}>
                    {value}
                </span>
                {subValue && (
                    <span className={clsx(
                        'text-sm',
                        trend === 'up' && 'text-green-400',
                        trend === 'down' && 'text-red-400',
                        !trend && 'text-slate-400'
                    )}>
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );
}
