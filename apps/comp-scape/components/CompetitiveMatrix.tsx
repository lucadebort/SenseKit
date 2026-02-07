import React, { useRef, useCallback } from 'react';
import { MATRIX_SIZE, TOKEN_RADIUS } from '../constants';

interface AxisConfig {
  x: { leftLabel: string; rightLabel: string };
  y: { bottomLabel: string; topLabel: string };
}

interface MatrixToken {
  id: string;
  x: number; // -50 to +50
  y: number; // -50 to +50
  color: string;
  label: string;
}

interface CompetitiveMatrixProps {
  axes: AxisConfig;
  tokens: MatrixToken[];
  onTokenMove?: (id: string, x: number, y: number) => void;
  interactive?: boolean;
  size?: number;
  showGrid?: boolean;
  className?: string;
}

// Convert data coords (-50..+50) to SVG coords
const dataToSvg = (value: number, size: number): number => {
  return ((value + 50) / 100) * size;
};

// Convert SVG coords to data coords (-50..+50)
const svgToData = (pixel: number, size: number): number => {
  return (pixel / size) * 100 - 50;
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const CompetitiveMatrix: React.FC<CompetitiveMatrixProps> = ({
  axes,
  tokens,
  onTokenMove,
  interactive = false,
  size = MATRIX_SIZE,
  showGrid = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<string | null>(null);

  const padding = 40;
  const totalSize = size + padding * 2;
  const r = TOKEN_RADIUS;

  const getSvgPoint = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = totalSize / rect.width;
    const scaleY = totalSize / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const svgX = (clientX - rect.left) * scaleX - padding;
    const svgY = (clientY - rect.top) * scaleY - padding;

    return {
      x: clamp(svgToData(svgX, size), -50, 50),
      y: clamp(-svgToData(svgY, size), -50, 50), // flip Y: SVG y goes down, data y goes up
    };
  }, [size, totalSize, padding]);

  const handlePointerDown = useCallback((id: string) => {
    if (!interactive) return;
    draggingRef.current = id;
  }, [interactive]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!interactive || !draggingRef.current || !onTokenMove) return;
    e.preventDefault();
    const point = getSvgPoint(e);
    if (point) {
      onTokenMove(draggingRef.current, point.x, point.y);
    }
  }, [interactive, onTokenMove, getSvgPoint]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  // Grid lines
  const gridLines = [];
  if (showGrid) {
    for (let i = -40; i <= 40; i += 10) {
      if (i === 0) continue;
      const pos = dataToSvg(i, size);
      gridLines.push(
        <line key={`gx-${i}`} x1={pos} y1={0} x2={pos} y2={size} stroke="currentColor" className="text-border" strokeWidth="0.5" opacity="0.4" />,
        <line key={`gy-${i}`} x1={0} y1={pos} x2={size} y2={pos} stroke="currentColor" className="text-border" strokeWidth="0.5" opacity="0.4" />
      );
    }
  }

  return (
      <svg
        ref={svgRef}
        viewBox={`${-padding} ${-padding} ${totalSize} ${totalSize}`}
        className={`select-none ${className}`}
        style={{ touchAction: 'none' }}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Background */}
        <rect x={0} y={0} width={size} height={size} fill="white" rx={8} />

        {/* Grid */}
        {gridLines}

        {/* Main axes */}
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="#d4d4d8" strokeWidth="1" />
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="#d4d4d8" strokeWidth="1" />

        {/* Border */}
        <rect x={0} y={0} width={size} height={size} fill="none" stroke="#e5e7eb" strokeWidth="1" rx={8} />

        {/* Axis Labels */}
        {/* X axis: left */}
        <text x={-8} y={size / 2} textAnchor="end" dominantBaseline="middle" className="text-muted-foreground" fontSize="11" fontWeight="500">
          {axes.x.leftLabel}
        </text>
        {/* X axis: right */}
        <text x={size + 8} y={size / 2} textAnchor="start" dominantBaseline="middle" className="text-muted-foreground" fontSize="11" fontWeight="500">
          {axes.x.rightLabel}
        </text>
        {/* Y axis: top */}
        <text x={size / 2} y={-12} textAnchor="middle" className="text-muted-foreground" fontSize="11" fontWeight="500">
          {axes.y.topLabel}
        </text>
        {/* Y axis: bottom */}
        <text x={size / 2} y={size + 18} textAnchor="middle" className="text-muted-foreground" fontSize="11" fontWeight="500">
          {axes.y.bottomLabel}
        </text>

        {/* Tokens */}
        {tokens.map(token => {
          const cx = dataToSvg(token.x, size);
          const cy = dataToSvg(-token.y, size); // flip Y
          const initial = token.label.charAt(0).toUpperCase();

          return (
            <g
              key={token.id}
              transform={`translate(${cx}, ${cy})`}
              onMouseDown={() => handlePointerDown(token.id)}
              onTouchStart={() => handlePointerDown(token.id)}
              style={{ cursor: interactive ? 'grab' : 'default' }}
            >
              <circle
                r={r}
                fill={token.color}
                opacity={0.9}
                stroke="white"
                strokeWidth="2"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="11"
                fontWeight="600"
                style={{ pointerEvents: 'none' }}
              >
                {initial}
              </text>
              {/* Name tooltip below */}
              <text
                y={r + 12}
                textAnchor="middle"
                fill="#71717a"
                fontSize="9"
                fontWeight="500"
                style={{ pointerEvents: 'none' }}
              >
                {token.label}
              </text>
            </g>
          );
        })}
      </svg>
  );
};
