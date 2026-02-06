import * as React from "react";
import { cn } from "../../lib/utils";

export interface ToggleGroupItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ToggleGroupProps {
  items: ToggleGroupItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

function ToggleGroup({ items, value, onValueChange, className }: ToggleGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-input bg-background p-0.5",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          title={item.label}
          onClick={() => onValueChange(item.value)}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-all",
            value === item.value
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.icon}
          {!item.icon && item.label}
        </button>
      ))}
    </div>
  );
}

export { ToggleGroup };
