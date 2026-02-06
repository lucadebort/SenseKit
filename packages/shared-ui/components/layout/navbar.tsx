import * as React from "react";
import { cn } from "../../lib/utils";

export interface NavTab {
  id: string;
  label: string;
}

export interface NavBarProps {
  brand: {
    name: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  context?: {
    name: string;
    icon?: React.ReactNode;
  };
  tabs?: NavTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: React.ReactNode;
}

function NavBar({
  brand,
  context,
  tabs,
  activeTab,
  onTabChange,
  actions,
}: NavBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand + Context */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={brand.onClick}
              className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors shrink-0"
            >
              {brand.icon}
              <span className="text-sm">{brand.name}</span>
            </button>

            {context && (
              <>
                <span className="text-muted-foreground/40">/</span>
                <div className="flex items-center gap-2 min-w-0">
                  {context.icon}
                  <span className="text-sm font-medium text-foreground truncate">
                    {context.name}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Center: Tabs (desktop) */}
          {tabs && tabs.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Right: Actions + Mobile hamburger */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {actions}
            </div>

            {/* Mobile hamburger */}
            {(tabs?.length || actions) && (
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-2 space-y-1">
            {tabs?.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange?.(tab.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {tab.label}
              </button>
            ))}
            {actions && (
              <div className="pt-2 border-t border-border mt-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export { NavBar };
