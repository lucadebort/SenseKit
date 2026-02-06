import { cn } from "../../lib/utils";

export interface FooterProps {
  appName: string;
  appDescription: string;
  className?: string;
}

function Footer({ appName, appDescription, className }: FooterProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 py-2 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-center px-4 z-[100] text-[10px] text-muted-foreground shadow-[0_-2px_10px_rgba(0,0,0,0.02)]",
        className
      )}
    >
      <div className="text-center leading-tight">
        <span>
          {appName} - {appDescription}
        </span>
        <span className="hidden sm:inline">&nbsp;</span>
        <br className="sm:hidden" />
        <span>
          Designed by Luca De Bortoli at{" "}
          <a
            href="https://etnograph.com"
            target="_blank"
            rel="noreferrer"
            className="font-bold hover:text-primary transition-colors"
          >
            Etnograph
          </a>
          . 2026 - All rights reserved
        </span>
      </div>
    </div>
  );
}

export { Footer };
