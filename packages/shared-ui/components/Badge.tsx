import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        px-2 py-0.5 rounded-full text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Utility for session/status badges
export type SessionStatus = 'created' | 'in_progress' | 'completed';

const statusConfig: Record<SessionStatus, { variant: BadgeVariant; label: string }> = {
  created: { variant: 'default', label: 'In attesa' },
  in_progress: { variant: 'warning', label: 'In corso' },
  completed: { variant: 'success', label: 'Completata' },
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  const config = statusConfig[status] || statusConfig.created;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
