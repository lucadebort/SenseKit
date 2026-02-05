
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ZoneBackground } from './ZoneBackground';
import { downloadSvg } from '../utils';
import { BOARD_SIZE } from '../constants';
import { AggregatedPoint, StakeholderDef } from '../types';

interface AggregatedMapProps {
  data: AggregatedPoint[];
  config: any;
  centerLabel: string;
  respondentId: string;
  themeColor?: string;
  centerTokenColor?: string; // New prop for specific center color
  stakeholders: StakeholderDef[];
}

export const AggregatedMap: React.FC<AggregatedMapProps> = ({ 
  data, 
  config, 
  centerLabel,
  respondentId,
  themeColor = '#2563eb',
  centerTokenColor,
  stakeholders
}) => {
  const radius = BOARD_SIZE / 2;
  const svgRef = useRef<SVGSVGElement>(null);
  const modalSvgRef = useRef<SVGSVGElement>(null);
  const [showModal, setShowModal] = useState(false);

  const getShInfo = (id: string) => {
      const s = stakeholders.find(s => s.id === id);
      return {
          label: s?.label || id,
          color: s?.color || '#64748b'
      };
  };

  const handleDownload = (ref: React.RefObject<SVGSVGElement>, suffix: string = '') => {
      if (ref.current) {
          downloadSvg(ref.current, `aggregated-map-${respondentId}${suffix}`);
      }
  };

  const MapContent = () => (
      <>
        <ZoneBackground 
            radius={radius} 
            centerX={radius} 
            centerY={radius} 
            zones={config}
            centerLabel={centerLabel}
            themeColor={themeColor}
            centerDotColor={centerTokenColor} // Pass specific color if available
        />
        {data.map(item => {
            const { label, color } = getShInfo(item.id);
            return (
            <g key={item.id}>
                {item.points.length > 1 && item.points.map((pt, idx) => (
                        <circle 
                        key={`${item.id}-pt-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={10}
                        fill={color}
                        opacity="0.15"
                        />
                ))}
                <line 
                    x1={radius} 
                    y1={radius} 
                    x2={item.mean.x} 
                    y2={item.mean.y} 
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.3"
                    strokeDasharray="4 4"
                />
                <circle 
                    cx={item.mean.x}
                    cy={item.mean.y}
                    r={14}
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                    className="shadow-sm"
                />
                <text
                    x={item.mean.x}
                    y={item.mean.y}
                    dy="26"
                    textAnchor="middle"
                    className="text-[11px] font-bold fill-slate-700 pointer-events-none"
                    style={{ textShadow: '0px 0px 4px white' }}
                >
                    {label}
                </text>
            </g>
        )})}
      </>
  );

  return (
    <>
        <div className="w-full h-full flex items-center justify-center relative group">
            <svg 
                ref={svgRef}
                viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} 
                className="bg-white rounded-full shadow-sm border border-slate-200 max-w-full max-h-full w-auto h-auto aspect-square"
                preserveAspectRatio="xMidYMid meet"
            >
                <MapContent />
            </svg>

            <div className="absolute bottom-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => setShowModal(true)}
                    className="p-1.5 bg-white border border-slate-200 rounded-full shadow text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                    title="Enlarge Map"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M4 4l5 5M20 8V4h-4M20 4l-5 5M4 16v4h4M4 20l5-5M20 16v4h-4M20 20l-5-5" />
                    </svg>
                </button>
                <button 
                    onClick={() => handleDownload(svgRef)}
                    className="p-1.5 bg-white border border-slate-200 rounded-full shadow text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                    title="Download SVG"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            </div>
        </div>

        {showModal && createPortal(
            <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
                <div className="absolute top-6 right-6 flex gap-4">
                     <button 
                        onClick={() => handleDownload(modalSvgRef, '-fullscreen')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur border border-white/20 transition-colors font-bold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download SVG
                    </button>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur border border-white/20 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <h3 className="text-white/80 font-bold text-xl mb-4">{centerLabel} Analysis - {respondentId}</h3>
                <div className="w-full h-full flex items-center justify-center overflow-hidden p-4">
                    <svg 
                        ref={modalSvgRef}
                        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} 
                        className="bg-white rounded-full shadow-2xl max-w-full max-h-full w-auto h-auto aspect-square"
                    >
                        <MapContent />
                    </svg>
                </div>
            </div>,
            document.body
        )}
    </>
  );
};
