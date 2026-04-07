import React from 'react';
import clsx from 'clsx';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

const variants: Record<BadgeVariant, string> = {
  green: 'bg-[rgba(16,185,129,0.12)] text-[#10b981] border-[rgba(16,185,129,0.25)]',
  amber: 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border-[rgba(245,158,11,0.25)]',
  red: 'bg-[rgba(239,68,68,0.12)] text-[#ef4444] border-[rgba(239,68,68,0.25)]',
  blue: 'bg-[rgba(59,130,246,0.12)] text-[#3b82f6] border-[rgba(59,130,246,0.25)]',
  purple: 'bg-[rgba(139,92,246,0.12)] text-[#8b5cf6] border-[rgba(139,92,246,0.25)]',
  gray: 'bg-[rgba(99,179,237,0.08)] text-[#8ca0c0] border-[rgba(99,179,237,0.15)]',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border tracking-wide uppercase',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

const riskMap: Record<RiskLevel, BadgeVariant> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
  critical: 'red',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={riskMap[level]}>{level}</Badge>;
}
