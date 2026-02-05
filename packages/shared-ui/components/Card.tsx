import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-slate-200
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Card with header
interface CardWithHeaderProps extends CardProps {
  title: string;
  action?: ReactNode;
}

export function CardWithHeader({
  title,
  action,
  children,
  className = '',
}: CardWithHeaderProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Stat Card
interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: 'default' | 'success' | 'warning' | 'danger';
}

const valueColorStyles = {
  default: 'text-slate-800',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
};

export function StatCard({
  label,
  value,
  valueColor = 'default',
}: StatCardProps) {
  return (
    <Card padding="sm" className="p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColorStyles[valueColor]}`}>
        {value}
      </p>
    </Card>
  );
}
