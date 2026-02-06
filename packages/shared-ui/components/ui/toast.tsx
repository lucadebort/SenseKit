import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/* ─── Toast variant styles ─── */

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        destructive: "border-red-200 bg-red-50 text-red-900",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/* ─── Toast state management ─── */

type ToastVariant = "default" | "success" | "destructive" | "warning";

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string };

const TOAST_LIMIT = 5;
const TOAST_DEFAULT_DURATION = 4000;

let toastCount = 0;

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

const listeners: Array<(state: Toast[]) => void> = [];
let memoryState: Toast[] = [];

function dispatch(action: ToastAction) {
  switch (action.type) {
    case "ADD":
      memoryState = [action.toast, ...memoryState].slice(0, TOAST_LIMIT);
      break;
    case "REMOVE":
      memoryState = memoryState.filter((t) => t.id !== action.id);
      break;
  }
  listeners.forEach((listener) => listener(memoryState));
}

function toast(props: Omit<Toast, "id">) {
  const id = genId();
  dispatch({ type: "ADD", toast: { ...props, id } });

  const duration = props.duration ?? TOAST_DEFAULT_DURATION;
  setTimeout(() => {
    dispatch({ type: "REMOVE", id });
  }, duration);

  return id;
}

function useToast() {
  const [state, setState] = React.useState<Toast[]>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    toasts: state,
    toast,
    dismiss: (id: string) => dispatch({ type: "REMOVE", id }),
  };
}

/* ─── Toaster component (mount once in App) ─── */

function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            toastVariants({ variant: t.variant }),
            "animate-in slide-in-from-bottom-4 fade-in-0"
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-bold">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-xs opacity-80">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export { Toaster, useToast, toast, toastVariants };
export type { Toast, ToastVariant };
