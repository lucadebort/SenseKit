import React from 'react';
import { SemanticPair, PairStatistics, Session } from '../types';

interface DistributionChartProps {
  pair: SemanticPair;
  stats: PairStatistics;
  sessions: Session[];
  scalePoints: number;
  scaleMode: 'discrete' | 'continuous';
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  pair,
  stats,
  sessions,
  scalePoints,
  scaleMode
}) => {
  // Get all responses for this pair
  const responses = sessions
    .filter(s => s.status === 'completed')
    .map(s => s.responses.find(r => r.pairId === pair.id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  // Normalized values (-50 to +50)
  const values = responses.map(r => r.value);

  // Calculate distribution for visualization
  const bins = 21; // -50 to +50 in steps of 5
  const distribution = new Array(bins).fill(0);

  values.forEach(v => {
    const binIndex = Math.round((v + 50) / 5);
    const clampedIndex = Math.max(0, Math.min(bins - 1, binIndex));
    distribution[clampedIndex]++;
  });

  const maxCount = Math.max(...distribution, 1);

  // Mean position as percentage (0-100)
  const meanPosition = ((stats.mean + 50) / 100) * 100;

  // Standard deviation range
  const stdLeft = Math.max(0, ((stats.mean - stats.stdDev + 50) / 100) * 100);
  const stdRight = Math.min(100, ((stats.mean + stats.stdDev + 50) / 100) * 100);

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {pair.leftTerm}
            </span>
            <span className="text-muted-foreground/70">&#8596;</span>
            <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {pair.rightTerm}
            </span>
          </div>
          {pair.category && (
            <span className="text-xs text-muted-foreground/70 mt-1 block">{pair.category}</span>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>N = {stats.count}</div>
        </div>
      </div>

      {/* Distribution visualization */}
      <div className="relative h-24 mb-2">
        {/* Background gradient */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div
            className="h-full"
            style={{
              background: 'linear-gradient(to right, #d1fae5 0%, #f1f5f9 50%, #dbeafe 100%)'
            }}
          />
        </div>

        {/* Standard deviation range */}
        <div
          className="absolute top-0 bottom-0 bg-muted-foreground/15 rounded"
          style={{
            left: `${stdLeft}%`,
            width: `${stdRight - stdLeft}%`
          }}
        />

        {/* Distribution bars */}
        <div className="absolute inset-0 flex items-end justify-between px-1">
          {distribution.map((count, i) => {
            const height = count > 0 ? Math.max(8, (count / maxCount) * 80) : 0;
            return (
              <div
                key={i}
                className="flex-1 mx-px flex items-end justify-center"
              >
                {count > 0 && (
                  <div
                    className="w-full max-w-3 bg-foreground/40 rounded-t transition-all"
                    style={{ height: `${height}%` }}
                    title={`${count} risposte`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Individual response dots (for small N) */}
        {values.length <= 30 && (
          <div className="absolute inset-0">
            {values.map((v, i) => {
              const position = ((v + 50) / 100) * 100;
              // Slight vertical jitter to avoid overlap
              const jitter = (Math.sin(i * 2.5) * 15) + 50;
              return (
                <div
                  key={i}
                  className="absolute w-2.5 h-2.5 bg-foreground/70 rounded-full border border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${position}%`,
                    top: `${jitter}%`
                  }}
                  title={`Valore: ${v > 0 ? '+' : ''}${v}`}
                />
              );
            })}
          </div>
        )}

        {/* Mean marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${meanPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow" />
        </div>

        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border border-dashed" />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-muted-foreground mb-3">
        <span>{pair.leftTerm}</span>
        <span className="text-muted-foreground/70">Neutro</span>
        <span>{pair.rightTerm}</span>
      </div>

      {/* Statistics */}
      <div className="flex gap-4 pt-3 border-t border-border">
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-foreground">
            {stats.mean > 0 ? '+' : ''}{stats.mean}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Media</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-muted-foreground">{stats.stdDev}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Dev. Std</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-muted-foreground">{stats.median}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Mediana</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-muted-foreground">{stats.min} / {stats.max}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Min / Max</div>
        </div>
      </div>

      {/* Interpretation hint */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {stats.mean < -15 ? (
            <span>Tendenza verso <strong className="text-emerald-600">{pair.leftTerm}</strong></span>
          ) : stats.mean > 15 ? (
            <span>Tendenza verso <strong className="text-blue-600">{pair.rightTerm}</strong></span>
          ) : (
            <span>Posizione <strong>neutrale</strong> o ambivalente</span>
          )}
          {stats.stdDev > 25 && (
            <span className="text-amber-600"> - Alta variabilita nelle risposte</span>
          )}
        </p>
      </div>
    </div>
  );
};
