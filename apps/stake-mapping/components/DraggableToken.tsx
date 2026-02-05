
import React from 'react';

interface DraggableTokenProps {
  id: string; // Changed from StakeholderType enum to string
  x: number;
  y: number;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  color?: string;
  radius?: number; // New optional radius prop
  labelClassName?: string; // New optional label style override
}

export const DraggableToken: React.FC<DraggableTokenProps> = ({ 
  id, 
  x, 
  y, 
  isDragging, 
  onPointerDown,
  color,
  radius = 24, // Default to 24 for backward compatibility (Participant view)
  labelClassName = 'uppercase' // Default to uppercase if not specified
}) => {
  return (
    <g 
      transform={`translate(${x}, ${y})`} 
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={(e) => onPointerDown(e, id)}
    >
      {/* Shadow layer - matches actual radius exactly */}
      <circle r={radius} fill="black" opacity="0.05" cy="2" />
      
      {/* Invisible larger hit target for small tokens to improve touch usability/dragging */}
      {radius < 24 && (
        <circle r="24" fill="transparent" />
      )}
      
      <circle 
        r={radius} 
        className={`${color ? '' : 'fill-white'} stroke-slate-300`}
        style={color ? { fill: color.replace('fill-[', '').replace(']', '') } : {}}
        strokeWidth="2"
      />
      
      <text
        textAnchor="middle"
        y={radius + 8} // Dynamic offset based on radius
        className={`text-[10px] font-bold fill-slate-700 pointer-events-none select-none tracking-tight ${labelClassName}`}
        style={{ textShadow: '0 1px 2px white, 0 0 4px white' }}
      >
        {id.split(' ')[0]} 
      </text>
      
      {isDragging && (
        <circle r={radius + 4} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 2" className="animate-pulse" />
      )}
    </g>
  );
};
