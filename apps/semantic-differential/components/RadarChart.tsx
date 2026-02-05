import React, { useRef } from 'react';
import { SemanticPair, PairStatistics } from '../types';
import { downloadSvg } from '../utils';

interface RadarChartProps {
  pairs: SemanticPair[];
  stats: PairStatistics[];
  width?: number;
  height?: number;
  showExport?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  pairs,
  stats,
  width = 400,
  height = 400,
  showExport = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  if (pairs.length < 3) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Servono almeno 3 differenziali per il radar chart.
      </div>
    );
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(centerX, centerY) - 60;

  const angleStep = (2 * Math.PI) / pairs.length;

  // Calculate points for each pair
  const dataPoints = pairs.map((pair, i) => {
    const stat = stats.find(s => s.pairId === pair.id);
    // Normalize mean from -50..+50 to 0..1
    const normalizedValue = stat ? (stat.mean + 50) / 100 : 0.5;
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const radius = normalizedValue * maxRadius;

    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      label: pair.leftTerm.substring(0, 10),
      labelRight: pair.rightTerm.substring(0, 10),
      angle,
      value: stat?.mean || 0
    };
  });

  // Create polygon path
  const polygonPath = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  // Grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-col items-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="overflow-visible"
      >
        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="white" />

        {/* Grid circles */}
        {gridCircles.map(scale => (
          <circle
            key={scale}
            cx={centerX}
            cy={centerY}
            r={maxRadius * scale}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {pairs.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const endX = centerX + Math.cos(angle) * maxRadius;
          const endY = centerY + Math.sin(angle) * maxRadius;
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={polygonPath}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3b82f6"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={5}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {pairs.map((pair, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = maxRadius + 30;
          const x = centerX + Math.cos(angle) * labelRadius;
          const y = centerY + Math.sin(angle) * labelRadius;

          // Determine text anchor based on position
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) < -0.1) textAnchor = 'end';
          else if (Math.cos(angle) > 0.1) textAnchor = 'start';

          return (
            <g key={i}>
              <text
                x={x}
                y={y}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                className="text-[10px] fill-slate-500"
              >
                {pair.leftTerm.substring(0, 12)}
              </text>
              <text
                x={x}
                y={y + 12}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                className="text-[9px] fill-slate-400"
              >
                &#8596; {pair.rightTerm.substring(0, 12)}
              </text>
            </g>
          );
        })}

        {/* Center point */}
        <circle cx={centerX} cy={centerY} r={3} fill="#94a3b8" />

        {/* Legend */}
        <text x={centerX} y={height - 10} textAnchor="middle" className="text-[10px] fill-slate-400">
          Centro = neutro | Esterno = estremi
        </text>
      </svg>

      {showExport && (
        <button
          onClick={() => downloadSvg(svgRef.current, 'radar-chart')}
          className="mt-4 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Esporta SVG
        </button>
      )}
    </div>
  );
};
