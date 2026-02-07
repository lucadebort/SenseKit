import Link from 'next/link';

interface ToolCardProps {
  name: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function ToolCard({ name, slug, description, icon, color }: ToolCardProps) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="group block p-6 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}12` }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {name}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="mt-4 text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Scopri di più
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
