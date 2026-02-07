import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Piattaforma di ricerca
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight leading-[1.15] text-balance mb-5">
            Strumenti di ricerca per capire come le persone pensano
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            Crea progetti, condividi un link ai partecipanti e raccogli dati strutturati
            in tempo reale. Analisi visuale integrata, nessuna configurazione richiesta.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="https://stakemap.sensekit.eu"
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Inizia gratis
            </Link>
            <Link
              href="#tools"
              className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Esplora i tool
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
