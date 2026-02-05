
import React, { useMemo } from 'react';
import { StakeholderData } from '../types';

interface AnalysisPanelProps {
  data: StakeholderData[];
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data }) => {
  
  const placedItems = data.filter(d => d.position !== null);

  // Helper to calculate Euclidean distance between two points
  const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const relationships = useMemo(() => {
    if (placedItems.length < 2) return [];

    const rels: { a: string; b: string; dist: number }[] = [];
    for (let i = 0; i < placedItems.length; i++) {
      for (let j = i + 1; j < placedItems.length; j++) {
        const itemA = placedItems[i];
        const itemB = placedItems[j];
        if (itemA.position && itemB.position) {
            // Raw pixel distance
            const dist = getDistance(itemA.position, itemB.position);
            // Normalize roughly to a 0-100 scale based on board size (approx 600px)
            const normalizedDist = Math.min(100, Math.round((dist / 500) * 100));
            rels.push({
                a: itemA.id,
                b: itemB.id,
                dist: normalizedDist
            });
        }
      }
    }
    return rels.sort((a, b) => a.dist - b.dist);
  }, [placedItems]);

  if (placedItems.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-full">
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3 border-b pb-2">
        Live Analysis
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 mb-2">Centrality (Power)</h4>
          <ul className="space-y-1">
            {placedItems.map(item => (
              <li key={item.id} className="flex justify-between text-sm">
                <span>{item.id}</span>
                <span className={`font-mono font-bold ${
                  item.zoneLabel === 'Critical' ? 'text-blue-600' : 
                  item.zoneLabel === 'Important' ? 'text-blue-500' :
                  item.zoneLabel === 'Relevant' ? 'text-blue-400' : 'text-slate-400'
                }`}>
                  {item.zoneLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {relationships.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2">Proximity (Affinity)</h4>
            <ul className="space-y-2">
              {relationships.map((rel, idx) => (
                <li key={idx} className="text-sm">
                   <div className="flex justify-between mb-1">
                     <span className="text-slate-700">{rel.a} ↔ {rel.b}</span>
                     <span className="text-xs text-slate-400 font-mono">
                        {rel.dist < 20 ? 'Very Close' : rel.dist > 70 ? 'Distant' : 'Neutral'}
                     </span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-1.5">
                     {/* Invert width: Closer distance = higher affinity bar */}
                     <div 
                        className={`h-1.5 rounded-full ${rel.dist < 30 ? 'bg-green-500' : rel.dist > 70 ? 'bg-red-400' : 'bg-slate-400'}`} 
                        style={{ width: `${Math.max(5, 100 - rel.dist)}%` }}
                     ></div>
                   </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
