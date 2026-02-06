import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "flex gap-3 items-start rounded-lg border p-4 text-sm",
  {
    variants: {
      variant: {
        destructive: "bg-red-50 border-red-100 text-red-700",
        warning: "bg-amber-50 border-amber-100 text-amber-900",
        info: "bg-blue-50 border-blue-100 text-blue-700",
        success: "bg-emerald-50 border-emerald-100 text-emerald-700",
      },
    },
    defaultVariants: {
      variant: "destructive",
    },
  }
);

const defaultIcons: Record<string, React.ReactNode> = {
  destructive: (
    <svg className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  title?: string;
}

function Alert({
  className,
  variant = "destructive",
  icon,
  title,
  children,
  ...props
}: AlertProps) {
  const resolvedIcon = icon !== undefined ? icon : defaultIcons[variant || "destructive"];

  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      {resolvedIcon}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="text-sm [&_p]:leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export { Alert, alertVariants };
