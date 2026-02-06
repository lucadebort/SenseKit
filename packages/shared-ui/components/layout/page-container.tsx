import * as React from "react";
import { cn } from "../../lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn("max-w-7xl mx-auto px-4 sm:px-6", className)}
      {...props}
    />
  );
}

export { PageContainer };
