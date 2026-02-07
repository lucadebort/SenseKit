import Link from 'next/link';

interface PricingTierProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}

export function PricingTier({
  name,
  price,
  description,
  features,
  cta,
  ctaHref,
  highlighted,
}: PricingTierProps) {
  return (
    <div
      className={`rounded-lg border p-6 flex flex-col ${
        highlighted
          ? 'border-primary bg-card shadow-sm'
          : 'border-border bg-card'
      }`}
    >
      {highlighted && (
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-3">
          Consigliato
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{description}</p>
      <div className="mb-6">
        <span className="text-3xl font-semibold text-foreground">{price}</span>
        {price !== 'Custom' && (
          <span className="text-sm text-muted-foreground ml-1">/mese</span>
        )}
      </div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
            <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`inline-flex items-center justify-center h-10 rounded-md text-sm font-medium transition-colors ${
          highlighted
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-border text-foreground hover:bg-accent'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
