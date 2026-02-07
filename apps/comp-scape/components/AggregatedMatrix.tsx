import React, { useState } from 'react';
import { CompetitorStatistics } from '../types';
import { CompetitorDef } from '../types';
import { MATRIX_SIZE } from '../constants';

interface AxisConfig {
  x: { leftLabel: string; rightLabel: string };
  y: { bottomLabel: string; topLabel: string };
}

interface AggregatedMatrixProps {
  axes: AxisConfig;
  competitors: CompetitorDef[];
  stats: CompetitorStatistics[];
  className?: string;
}

// Convert data coords (-50..+50) to SVG coords
const dataToSvg = (value: number, size: number): number => {
  return ((value + 50) / 100) * size;
};

export const AggregatedMatrix: React.FC<AggregatedMatrixProps> = ({
  axes,
  competitors,
  stats,
  className = '',
}) => {
  const [showIndividual, setShowIndividual] = useState(false);
  const size = MATRIX_SIZE;
  const padding = 40;
  const totalSize = size + padding * 2;

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showIndividual}
            onChange={(e) => setShowIndividual(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          Mostra risposte individuali
        </label>
      </div>

      <div className="w-full max-w-[600px] aspect-square">
        <svg
          viewBox={`${-padding} ${-padding} ${totalSize} ${totalSize}`}
          className="w-full h-full"
        >
          {/* Background */}
          <rect x={0} y={0} width={size} height={size} fill="white" rx={8} />

          {/* Grid */}
          {Array.from({ length: 9 }, (_, i) => (i + 1) * 10 - 50).filter(v => v !== 0).map(v => {
            const pos = dataToSvg(v, size);
            return (
              <g key={`grid-${v}`}>
                <line x1={pos} y1={0} x2={pos} y2={size} stroke="#e5e7eb" strokeWidth="0.5" opacity="0.4" />
                <line x1={0} y1={pos} x2={size} y2={pos} stroke="#e5e7eb" strokeWidth="0.5" opacity="0.4" />
              </g>
            );
          })}

          {/* Main axes */}
          <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="#d4d4d8" strokeWidth="1" />
          <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="#d4d4d8" strokeWidth="1" />

          {/* Border */}
          <rect x={0} y={0} width={size} height={size} fill="none" stroke="#e5e7eb" strokeWidth="1" rx={8} />

          {/* Axis Labels */}
          <text x={-8} y={size / 2} textAnchor="end" dominantBaseline="middle" fontSize="11" fontWeight="500" fill="#71717a">
            {axes.x.leftLabel}
          </text>
          <text x={size + 8} y={size / 2} textAnchor="start" dominantBaseline="middle" fontSize="11" fontWeight="500" fill="#71717a">
            {axes.x.rightLabel}
          </text>
          <text x={size / 2} y={-12} textAnchor="middle" fontSize="11" fontWeight="500" fill="#71717a">
            {axes.y.topLabel}
          </text>
          <text x={size / 2} y={size + 18} textAnchor="middle" fontSize="11" fontWeight="500" fill="#71717a">
            {axes.y.bottomLabel}
          </text>

          {/* Competitor data */}
          {stats.map(stat => {
            const comp = competitors.find(c => c.id === stat.competitorId);
            if (!comp || stat.count === 0) return null;

            const cx = dataToSvg(stat.meanX, size);
            const cy = dataToSvg(-stat.meanY, size); // flip Y

            // Dispersion ellipse (1 stddev)
            const rx = (stat.stdDevX / 100) * size;
            const ry = (stat.stdDevY / 100) * size;

            return (
              <g key={stat.competitorId}>
                {/* Dispersion ellipse */}
                {stat.count > 1 && (
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={Math.max(rx, 4)}
                    ry={Math.max(ry, 4)}
                    fill={comp.color}
                    fillOpacity={0.1}
                    stroke={comp.color}
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    strokeOpacity={0.3}
                  />
                )}

                {/* Individual positions */}
                {showIndividual && stat.positions.map((pos, idx) => (
                  <circle
                    key={idx}
                    cx={dataToSvg(pos.x, size)}
                    cy={dataToSvg(-pos.y, size)}
                    r={4}
                    fill={comp.color}
                    opacity={0.25}
                  />
                ))}

                {/* Mean position */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={16}
                  fill={comp.color}
                  opacity={0.9}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="10"
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {comp.name.charAt(0).toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={cy + 24}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="9"
                  fontWeight="500"
                  style={{ pointerEvents: 'none' }}
                >
                  {comp.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
