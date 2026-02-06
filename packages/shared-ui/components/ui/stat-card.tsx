import * as React from "react";
import { cn } from "../../lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  valueClassName?: string;
  className?: string;
}

function StatCard({ label, value, valueClassName, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-2xl font-semibold mt-1", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

export { StatCard };
