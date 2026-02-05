import { useState, type ReactNode } from 'react';

interface NavTab {
  id: string;
  label: string;
}

interface NavBarProps {
  brandName: string;
  brandIcon?: ReactNode;
  projectName?: string;
  projectIcon?: string;
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onBrandClick: () => void;
  onLogout: () => void;
}

export function NavBar({
  brandName,
  brandIcon,
  projectName,
  projectIcon,
  tabs,
  activeTab,
  onTabChange,
  onBrandClick,
  onLogout,
}: NavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavLink = ({ tab, mobile = false }: { tab: NavTab; mobile?: boolean }) => (
    <button
      onClick={() => {
        onTabChange(tab.id);
        if (mobile) setIsMobileMenuOpen(false);
      }}
      className={`
        ${mobile
          ? 'w-full text-left px-4 py-3 border-l-4'
          : 'h-full flex items-center px-2 text-sm font-medium border-b-[3px] pt-0.5'
        }
        transition-colors
        ${activeTab === tab.id
          ? (mobile ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-blue-600 text-blue-600')
          : (mobile ? 'border-transparent text-slate-600 hover:bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300')
        }
      `}
    >
      {tab.label}
    </button>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
      <div className="w-full max-w-7xl mx-auto px-6 h-12 flex justify-between items-center">
        {/* Left: Brand & Context */}
        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <button
            onClick={onBrandClick}
            className="flex items-center gap-3 group outline-none shrink-0"
            title="Torna ai Progetti"
          >
            {brandIcon && (
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-slate-200">
                {brandIcon}
              </div>
            )}
            <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors">
              {brandName}
            </span>
          </button>

          {projectName && (
            <>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[250px] hidden sm:flex">
                {projectIcon && (
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    <span className="text-sm">{projectIcon}</span>
                  </div>
                )}
                <h1 className="text-sm font-bold text-slate-600 truncate">{projectName}</h1>
              </div>
            </>
          )}
        </div>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          {tabs.map((tab) => (
            <NavLink key={tab.id} tab={tab} />
          ))}
        </nav>

        {/* Right: Logout & Mobile Menu */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={onLogout}
            className="text-xs font-bold text-slate-400 hover:text-red-600 uppercase tracking-wider transition-colors hidden md:block"
          >
            Logout
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          {tabs.map((tab) => (
            <NavLink key={tab.id} tab={tab} mobile />
          ))}
          <div className="border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-3 text-red-600 font-medium hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
