import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { PricingTier } from '../../components/PricingTier';

const tiers = [
  {
    name: 'Free',
    price: '€0',
    description: 'Per esplorare la piattaforma e progetti piccoli.',
    features: [
      'Tutti e 3 gli strumenti',
      'Fino a 3 progetti',
      'Fino a 20 partecipanti per progetto',
      'Export CSV',
    ],
    cta: 'Inizia gratis',
    ctaHref: 'https://stakemap.sensekit.eu',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '€19',
    description: 'Per ricercatori e team che lavorano su più progetti.',
    features: [
      'Tutto il piano Free',
      'Progetti illimitati',
      'Partecipanti illimitati',
      'Dashboard avanzata',
      'Supporto prioritario',
    ],
    cta: 'Prova Pro',
    ctaHref: 'mailto:info@sensekit.eu?subject=Piano Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Per organizzazioni con esigenze specifiche.',
    features: [
      'Tutto il piano Pro',
      'SSO e autenticazione custom',
      'Branding personalizzato',
      'SLA dedicato',
      'Onboarding assistito',
    ],
    cta: 'Contattaci',
    ctaHref: 'mailto:info@sensekit.eu?subject=Piano Enterprise',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-3">
            Prezzi semplici e trasparenti
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Inizia gratis, scala quando ne hai bisogno. Nessun costo nascosto.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <PricingTier key={tier.name} {...tier} />
            ))}
          </div>
        </section>

        {/* FAQ or extra info */}
        <section className="border-t border-border bg-secondary/30">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-3">Domande?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Scrivici per qualsiasi domanda su piani e funzionalità.
            </p>
            <a
              href="mailto:info@sensekit.eu"
              className="inline-flex items-center justify-center h-10 px-5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Contattaci
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
