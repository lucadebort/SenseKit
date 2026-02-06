import * as React from "react";
import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {(label || description) && (
          <div className="grid gap-0.5 leading-none">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-foreground leading-none cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
