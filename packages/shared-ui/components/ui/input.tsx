import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            {icon}
          </div>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm transition-colors duration-150 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus:ring-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
          {error && (
            <p className="mt-1.5 text-xs text-destructive">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors duration-150 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
