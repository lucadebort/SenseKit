import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        destructive: "bg-red-100 text-red-700",
        info: "bg-blue-100 text-blue-700",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export type SessionStatus = "created" | "in_progress" | "completed";

const statusConfig: Record<SessionStatus, { label: string; variant: BadgeProps["variant"] }> = {
  created: { label: "In attesa", variant: "default" },
  in_progress: { label: "In corso", variant: "warning" },
  completed: { label: "Completata", variant: "success" },
};

function StatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge };
