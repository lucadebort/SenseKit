
import React from 'react';
import { ZoneConfig } from '../types';
import { getThemeAccent } from '../constants';

interface ZoneBackgroundProps {
  radius: number;
  centerX: number;
  centerY: number;
  zones: ZoneConfig[];
  centerLabel?: string;
  themeColor: string;
  centerDotColor?: string; // Optional override for the center hub color
}

export const ZoneBackground: React.FC<ZoneBackgroundProps> = ({ 
  radius, 
  centerX, 
  centerY, 
  zones,
  centerLabel = "CENTER",
  themeColor,
  centerDotColor
}) => {
  const count = zones.length;
  // Calculate radiuses: Inner (index 0) is smallest. 
  // We actually draw Outer first to layer them correctly (Largest radius circle at back).
  // But our config array is [Inner, ..., Outer].
  // Step 1: 1/count.  Inner=1 unit. Outer=count units.
  
  // Let's create an array of radius percentages
  // Inner zone (idx 0) ends at 1/count.
  // Second zone (idx 1) ends at 2/count.
  
  const step = 1 / count;
  
  // We reverse to draw largest first (Painter's algorithm)
  const reversedZones = [...zones].map((z, i) => ({...z, originalIndex: i})).reverse();

  // Get saturated accent color for the center dot
  // If centerDotColor is provided (e.g. from stakeholder color), use it.
  // Otherwise, derive from themeColor.
  const finalCenterColor = centerDotColor || getThemeAccent(themeColor);

  const hasSubLabel = centerLabel.includes('(');
  // Shift up more if there are two lines to keep clearance above the dot
  const textDy = hasSubLabel ? "-22" : "-14";

  return (
    <g className="pointer-events-none select-none">
      
      {/* 1. Concentric Zone Rings */}
      {reversedZones.map((zone) => {
        // Radius Pct = (Index + 1) * step
        const rPct = (zone.originalIndex + 1) * step;
        const r = radius * rPct;
        
        return (
          <circle 
            key={zone.id}
            cx={centerX} 
            cy={centerY} 
            r={r} 
            fill={zone.color} 
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        );
      })}

      {/* 2. Sector Lines (Dividers) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = centerX + radius * Math.cos(rad);
        const y2 = centerY + radius * Math.sin(rad);
        return (
            <line 
                key={angle}
                x1={centerX} 
                y1={centerY} 
                x2={x2} 
                y2={y2} 
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="4 4" 
                opacity="0.6"
            />
        )
      })}

      {/* 3. Zone Labels */}
      {zones.map((zone, index) => {
         // Place label in the middle of the band
         // Band starts at index*step, ends at (index+1)*step
         // Midpoint = (index + 0.5) * step
         const midPct = (index + 0.5) * step;
         
         const yOffset = index === 0 ? 8 : 4; // Adjust inner label

         return (
          <text
            key={zone.id}
            x={centerX}
            y={centerY + (radius * midPct) + yOffset}
            textAnchor="middle"
            className="fill-slate-400 text-[9px] font-bold uppercase tracking-[0.15em] pointer-events-none"
            style={{ textShadow: '0 0 4px rgba(255,255,255,0.8)' }}
          >
            {zone.label}
          </text>
        );
      })}

      {/* 4. Absolute Center Hub (Small & Saturated) */}
      <circle 
        cx={centerX} 
        cy={centerY} 
        r={8} 
        fill={finalCenterColor} 
        className="shadow-sm" 
        stroke="white"
        strokeWidth="2"
      />
      
      {/* Center Label - Moved UP above the circle */}
      <text 
        x={centerX} 
        y={centerY} 
        textAnchor="middle" 
        dy={textDy}
        className="fill-slate-600 font-bold leading-tight uppercase tracking-wider pointer-events-none"
        style={{ textShadow: '0 0 4px white' }}
      >
        <tspan x={centerX} fontSize="10">{centerLabel.split('(')[0]}</tspan>
        {hasSubLabel && (
            <tspan x={centerX} dy="10" fontSize="8" opacity="0.8">
                ({centerLabel.split('(')[1]}
            </tspan>
        )}
      </text>
    </g>
  );
};
