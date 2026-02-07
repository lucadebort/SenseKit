import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Hero } from '../components/Hero';
import { ToolCard } from '../components/ToolCard';

const tools = [
  {
    name: 'StakeMap',
    slug: 'stakemap',
    description:
      'Mappa interattiva degli stakeholder. I partecipanti posizionano attori su una matrice a due assi e tu analizzi i risultati aggregati in tempo reale.',
    color: '#2383E2',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    name: 'SemDiff',
    slug: 'semdiff',
    description:
      'Differenziale semantico digitale. Raccogli valutazioni su scale bipolari personalizzabili e visualizza i profili medi con dispersione.',
    color: '#9B59B6',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21l5-5 5 5M4 4h16M4 8h16M4 12h10" />
      </svg>
    ),
  },
  {
    name: 'CompScape',
    slug: 'compscape',
    description:
      'Analisi competitiva visuale. Posiziona competitor su una matrice personalizzata e confronta le percezioni dei partecipanti.',
    color: '#E67E22',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
];

const steps = [
  {
    num: '1',
    title: 'Crea un progetto',
    description: 'Definisci assi, scale o competitor. Configura tutto in pochi click dalla dashboard.',
  },
  {
    num: '2',
    title: 'Condividi il link',
    description: 'Ogni progetto genera un link unico. I partecipanti rispondono dal browser, senza login.',
  },
  {
    num: '3',
    title: 'Analizza i risultati',
    description: 'Visualizza i dati aggregati in tempo reale con grafici, tabelle e esportazione CSV.',
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />

        {/* Tools section */}
        <section id="tools" className="max-w-6xl mx-auto px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-3">
              Tre strumenti, una piattaforma
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Ogni tool è progettato per un tipo di ricerca specifico. Usali singolarmente o combinali.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} {...tool} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-secondary/30">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-3">
                Come funziona
              </h2>
              <p className="text-muted-foreground">Tre passaggi per raccogliere dati strutturati.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.num} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center mx-auto mb-4">
                    {step.num}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Prova SenseKit gratuitamente
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Nessuna carta di credito richiesta. Crea il tuo primo progetto in meno di un minuto.
          </p>
          <a
            href="https://stakemap.sensekit.eu"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Inizia gratis
          </a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
