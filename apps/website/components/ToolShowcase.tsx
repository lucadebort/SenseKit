import Link from 'next/link';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

interface Feature {
  title: string;
  description: string;
}

interface ToolShowcaseProps {
  name: string;
  tagline: string;
  description: string;
  features: Feature[];
  color: string;
  appUrl: string;
  icon: React.ReactNode;
}

export function ToolShowcase({
  name,
  tagline,
  description,
  features,
  color,
  appUrl,
  icon,
}: ToolShowcaseProps) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative">
            <div className="max-w-3xl">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-5"
                style={{ backgroundColor: `${color}12` }}
              >
                <div style={{ color }}>{icon}</div>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight leading-tight mb-3">
                {name}
              </h1>
              <p className="text-lg text-primary font-medium mb-4">{tagline}</p>
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mb-8">
                {description}
              </p>
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Prova {name}
              </Link>
            </div>
          </div>
        </section>

        {/* Screenshot placeholder */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="rounded-lg border border-border bg-muted/30 h-64 md:h-96 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Screenshot in arrivo</p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-2xl font-semibold text-foreground mb-8">Funzionalità</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-5 rounded-lg border border-border bg-card">
                <h3 className="text-sm font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-secondary/30">
          <div className="max-w-6xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Pronto per usare {name}?
            </h2>
            <p className="text-muted-foreground mb-6">
              Crea il tuo primo progetto in meno di un minuto.
            </p>
            <Link
              href={appUrl}
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Inizia gratis
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
