import * as React from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

export interface LoadingScreenProps {
  message?: string;
  className?: string;
}

function LoadingScreen({ message, className }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center bg-background",
        className
      )}
    >
      <Spinner size="lg" className="mb-4" />
      {message && (
        <p className="text-muted-foreground font-medium text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

export { LoadingScreen };
