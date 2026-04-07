import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, style, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx(
        'card-density rounded-[14px] border p-4 backdrop-blur-[2px]',
        'bg-[linear-gradient(180deg,rgba(17,27,46,0.92),rgba(11,19,32,0.94))] border-[rgba(123,187,237,0.18)] shadow-[0_10px_30px_rgba(2,8,20,0.35)]',
        glow && 'shadow-[0_0_28px_rgba(59,130,246,0.14)]',
        onClick && 'cursor-pointer transition-all hover:border-[rgba(139,92,246,0.35)] hover:shadow-[0_16px_40px_rgba(2,8,20,0.55)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={clsx('text-xs font-semibold tracking-widest uppercase text-[#4a6080]', className)}>
      {children}
    </h3>
  );
}
