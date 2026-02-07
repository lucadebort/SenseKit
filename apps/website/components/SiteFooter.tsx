import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-semibold">S</span>
              </div>
              <span className="text-foreground font-semibold tracking-tight">SenseKit</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Strumenti di ricerca interattivi per capire come le persone pensano.
            </p>
          </div>

          {/* Strumenti */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Strumenti</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/tools/stakemap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  StakeMap
                </Link>
              </li>
              <li>
                <Link href="/tools/semdiff" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  SemDiff
                </Link>
              </li>
              <li>
                <Link href="/tools/compscape" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  CompScape
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Info</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Prezzi
                </Link>
              </li>
              <li>
                <a href="mailto:info@sensekit.eu" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contattaci
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SenseKit. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}
