interface FooterProps {
  appName: string;
  appDescription: string;
}

export function Footer({ appName, appDescription }: FooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 py-2 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-center px-4 z-[100] text-[10px] text-slate-400 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <div className="text-center leading-tight">
        <span>{appName} - {appDescription}</span>
        <span className="hidden sm:inline">&nbsp;</span>
        <br className="sm:hidden" />
        <span>
          Designed by Luca De Bortoli at{' '}
          <a
            href="https://etnograph.com"
            target="_blank"
            rel="noreferrer"
            className="font-bold hover:text-blue-600 transition-colors"
          >
            Etnograph
          </a>
          . 2026 - All rights reserved
        </span>
      </div>
    </div>
  );
};
