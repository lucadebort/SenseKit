
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ZoneBackground } from './ZoneBackground';
import { DraggableToken } from './DraggableToken';
import { Project, StakeholderData, Coordinates, InterviewSession } from '../types';
import { BOARD_SIZE, TOKEN_RADIUS, getThemeAccent } from '../constants';
import { updateSession, downloadSvg, normalizeDistance, getImpactScore } from '../utils';
import { Button, StatusBadge, type SessionStatus, formatDateTime } from '@sensekit/shared-ui';

interface InterviewViewProps {
  session: InterviewSession;
  project?: Project; // If loaded from context
  onComplete?: (session: InterviewSession) => void;
  readOnlyOverride?: boolean;
  isEmbedded?: boolean; 
  enableDownload?: boolean; 
}

export const InterviewView: React.FC<InterviewViewProps> = ({ 
    session, 
    project,
    onComplete, 
    readOnlyOverride = false, 
    isEmbedded = false,
    enableDownload = false
}) => {
  // Local state for submission to ensure immediate UI feedback
  const [isSubmitted, setIsSubmitted] = useState(session.status === 'completed');
  // Combine prop status and local status
  const isSessionCompleted = session.status === 'completed' || isSubmitted;
  
  // Determine token visual size based on mode
  // If in Viewer (readOnlyOverride), use 14. Otherwise use default TOKEN_RADIUS (24).
  const currentTokenRadius = readOnlyOverride ? 14 : TOKEN_RADIUS;

  const [activeTab, setActiveTab] = useState<'relationship' | 'centrality'>('relationship');
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New state for the "Graceful Center" animation after submission
  const [focusMode, setFocusMode] = useState(false);
  
  // State to control delayed visibility of the switcher to avoid layout glitches
  const [switcherVisible, setSwitcherVisible] = useState(readOnlyOverride);

  // Mobile Accordion State
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isDistOpen, setIsDistOpen] = useState(false);

  // If project not passed (e.g. standalone interview), we rely on default or embedded.
  if (!project) return <div>Error: Project configuration missing.</div>;

  const stakeholders = project.config.stakeholders;
  const relZones = project.config.relationshipZones;
  const impZones = project.config.impactZones;

  // Initialize Maps with ALL project stakeholders
  const [relMap, setRelMap] = useState<StakeholderData[]>(
      session.relationshipMap && session.relationshipMap.length > 0 
      ? session.relationshipMap 
      : stakeholders.map(s => ({ id: s.id, position: null, zoneLabel: null }))
  );
  
  const [cenMap, setCenMap] = useState<StakeholderData[]>(
      session.centralityMap && session.centralityMap.length > 0 
      ? session.centralityMap 
      : stakeholders.map(s => ({ id: s.id, position: null, zoneLabel: null }))
  );

  // Track previous session ID to handle session switching in Admin Viewer correctly
  const prevSessionIdRef = useRef<string>(session.sessionId);

  useEffect(() => {
      // Only reset local state if the SESSION ID changes (e.g. admin switching views).
      // If props update for the SAME session (e.g. status change from 'created' to 'completed'), 
      // we preserve local state to avoid hiding the toast or resetting animations.
      if (session.sessionId !== prevSessionIdRef.current) {
          setRelMap(
              session.relationshipMap && session.relationshipMap.length > 0 
              ? session.relationshipMap 
              : stakeholders.map(s => ({ id: s.id, position: null, zoneLabel: null }))
          );
          setCenMap(
              session.centralityMap && session.centralityMap.length > 0 
              ? session.centralityMap 
              : stakeholders.map(s => ({ id: s.id, position: null, zoneLabel: null }))
          );
          setIsSubmitted(session.status === 'completed');
          setDraggingId(null); 
          setFocusMode(false); 
          setShowToast(false);
          prevSessionIdRef.current = session.sessionId;
      }
  }, [session, stakeholders]);

  // Effect to handle delayed switcher appearance
  useEffect(() => {
      if (readOnlyOverride) {
          setSwitcherVisible(true);
      } else if (focusMode) {
          // Wait for sidebar collapse animation (1000ms) to finish before showing switcher
          // This prevents the switcher from "moving" while the footer expands
          const timer = setTimeout(() => {
              setSwitcherVisible(true);
          }, 1000);
          return () => clearTimeout(timer);
      } else {
          setSwitcherVisible(false);
      }
  }, [focusMode, readOnlyOverride]);
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const radius = BOARD_SIZE / 2;
  const center = radius;

  // Current Context
  const isRelationship = activeTab === 'relationship';
  const currentData = isRelationship ? relMap : cenMap;
  const setCurrentData = isRelationship ? setRelMap : setCenMap;
  const currentZones = isRelationship ? relZones : impZones;
  
  // Helpers
  const getShLabel = (id: string) => stakeholders.find(s => s.id === id)?.label || id;

  // Validate hex color to prevent XSS via class injection
  const isValidHexColor = (color: string | undefined): color is string => {
    if (!color) return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const getShColor = (id: string): string | undefined => {
    const color = stakeholders.find(s => s.id === id)?.color;
    return isValidHexColor(color) ? color : undefined;
  };

  const centerLabel = isRelationship 
    ? `${getShLabel(session.respondentId)} (You)` 
    : "SUCCESS";

  // --- DYNAMIC COLOR CALCULATION ---
  const relBaseColor = relZones[0]?.color || '#d1fae5';
  const impBaseColor = impZones[0]?.color || '#dbeafe';
  const relAccent = getThemeAccent(relBaseColor);
  const impAccent = getThemeAccent(impBaseColor);
  const activeBaseColor = isRelationship ? relBaseColor : impBaseColor;
  const activeAccentColor = isRelationship ? relAccent : impAccent;


  // Filter draggable items (Exclude self in Relational map)
  const draggableItems = useMemo(() => {
      return stakeholders.filter(s => {
          if (isRelationship && s.id === session.respondentId) return false;
          return true;
      });
  }, [stakeholders, isRelationship, session.respondentId]);

  const unplacedCount = draggableItems.length - currentData.filter(d => 
      d.position != null && // Safe check for undefined/null
      (isRelationship ? d.id !== session.respondentId : true)
  ).length;

  // Optimization: Memoize dragged item to prevent render crashes during rapid moves
  const draggedItem = useMemo(() => {
      if (!draggingId) return null;
      return currentData.find(s => s.id === draggingId);
  }, [draggingId, currentData]);

  const getLocalCoordinates = (e: React.PointerEvent | PointerEvent): Coordinates => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const getZoneLabel = (dist: number) => {
    const pct = dist / radius;
    const step = 1 / currentZones.length;
    const index = Math.floor(pct / step);
    const safeIndex = Math.min(index, currentZones.length - 1);
    return currentZones[safeIndex].label;
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (isSubmitted || isSaving || readOnlyOverride) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || isSubmitted || isSaving || readOnlyOverride) return;
    e.preventDefault();
    const coords = getLocalCoordinates(e);

    const dx = coords.x - center;
    const dy = coords.y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let finalX = coords.x;
    let finalY = coords.y;
    // Dynamic max drag distance based on current token radius
    const maxDragDist = radius - currentTokenRadius; 

    if (dist > maxDragDist) {
      const angle = Math.atan2(dy, dx);
      finalX = center + maxDragDist * Math.cos(angle);
      finalY = center + maxDragDist * Math.sin(angle);
    }

    const newZoneLabel = getZoneLabel(Math.min(dist, radius));

    setCurrentData(prev => prev.map(s => {
      if (s.id !== draggingId) return s;
      return {
        ...s,
        position: { x: finalX, y: finalY },
        zoneLabel: newZoneLabel
      };
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const placeOnBoard = (id: string) => {
    if (isSubmitted || isSaving || readOnlyOverride) return;
    const targetZoneIdx = 1 < currentZones.length ? 1 : 0;
    const step = 1 / currentZones.length;
    const rPct = (targetZoneIdx + 0.5) * step;

    setCurrentData(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        position: { x: center, y: center + radius * rPct }, 
        zoneLabel: currentZones[targetZoneIdx].label
      };
    }));
  };

  const handleSubmit = async () => {
      if (isSaving) return;
      
      // 1. Immediate UI update: Lock board, hide Finish button, show "Completed"
      setIsSubmitted(true);
      setIsSaving(true);
      
      try {
          // 2. Perform Save
          await updateSession(session.sessionId, relMap, cenMap);
          
          // 3. Success Feedback (Toast) - Delayed until save is confirmed
          setShowToast(true);
          
          // 4. Trigger Layout Shift (Focus Mode) after 2 seconds
          setTimeout(() => {
              setShowToast(false);
              setFocusMode(true);
          }, 2000);

          if(onComplete) onComplete({ ...session, status: 'completed', relationshipMap: relMap, centralityMap: cenMap });
      } catch (error) {
          console.error("Submission failed:", error);
          // Revert optimistic state on error
          setIsSubmitted(false);
          setShowToast(false);
          setFocusMode(false);
          alert("Impossibile salvare i dati. Controlla la connessione o contatta l'amministratore.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDownload = (ref: React.RefObject<SVGSVGElement>) => {
      if(ref.current) {
          downloadSvg(ref.current, `map-${session.sessionId}-${activeTab}`);
      }
  };

  // UI RENDER
  const containerClass = isEmbedded
    ? "relative w-full h-full flex flex-col bg-card overflow-hidden"
    : "fixed inset-0 flex flex-col bg-card overflow-hidden font-sans";

  return (
    <div className={containerClass}>
      {!readOnlyOverride && (
          <header className="shrink-0 h-14 bg-card border-b border-border flex items-center justify-between px-6 z-20">
              <div className="flex items-center gap-3">
                  <h1 className="text-sm font-semibold text-foreground uppercase tracking-wider">{project.name}</h1>
                  <span className="text-muted-foreground/40">|</span>
                  <span 
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ 
                        backgroundColor: activeBaseColor, 
                        color: activeAccentColor 
                    }}
                  >
                    {isRelationship ? 'EXERCISE 1: RELATIONSHIPS' : 'EXERCISE 2: IMPACT'}
                  </span>
              </div>
          </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
          
          {/* LEFT SIDEBAR - CONTROLS */}
          {/* 
            ANIMATION LOGIC:
            - If focusMode is TRUE: Width becomes 0, Opacity 0, Padding 0.
            - We use 'md:w-64' as default desktop width.
            - We use transition-all to animate the collapse.
          */}
          <aside className={`
              shrink-0 bg-card border-border z-30
              flex flex-col
              border-b md:border-b-0 md:border-r
              shadow-sm md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]
              transition-all duration-1000 ease-in-out
              ${!readOnlyOverride && !isEmbedded ? 'h-auto max-h-[40vh] md:max-h-full' : ''}
              ${focusMode ? 'w-0 opacity-0 p-0 border-none overflow-hidden' : 'w-full md:w-64 opacity-100'}
          `}>
              {readOnlyOverride ? (
                  <div className="flex flex-col h-auto md:h-full md:overflow-y-auto">
                      
                      {/* 1. SESSION INFO ACCORDION */}
                      <div className="border-b border-border/50 md:border-none shrink-0 bg-card">
                          <button
                              onClick={() => setIsInfoOpen(!isInfoOpen)}
                              className="w-full flex items-center justify-between px-4 py-3 md:hidden bg-secondary hover:bg-accent transition-colors"
                          >
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Session Info</span>
                              <svg className={`w-4 h-4 text-muted-foreground/70 transition-transform duration-200 ${isInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>

                          <div className={`${isInfoOpen ? 'block' : 'hidden'} md:block p-4 border-t border-border/50 md:border-t-0 animate-fade-in`}>
                              <div className="border border-border rounded-lg p-3 bg-card">
                                  <h3 className="hidden md:block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3">
                                      SESSION INFO
                                  </h3>
                                  <div className="space-y-2 text-xs">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">ID</span>
                                          <span className="font-mono font-bold text-foreground break-all">{session.sessionId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Created</span>
                                          <span className="text-foreground">{formatDateTime(session.createdAt)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Submitted</span>
                                          <span className="text-foreground">{session.submittedAt ? formatDateTime(session.submittedAt) : '-'}</span>
                                      </div>
                                      <div className="flex justify-between items-center pt-1">
                                          <span className="text-muted-foreground">Status</span>
                                          <StatusBadge status={session.status as SessionStatus} className="text-[10px]" />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* 2. DISTANCE TABLE ACCORDION */}
                      <div className="flex-col min-h-0 bg-white md:flex-1 md:flex">
                           <button 
                              onClick={() => setIsDistOpen(!isDistOpen)}
                              className="w-full flex items-center justify-between px-4 py-3 md:hidden bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100 shrink-0"
                          >
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Distance Data</span>
                              <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDistOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>

                          <div className={`${isDistOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-h-0 p-4 md:pt-0 bg-white animate-fade-in`}>
                               
                               <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden h-[300px] md:h-auto">
                                   <h3 
                                        className="hidden md:block text-[10px] font-bold uppercase tracking-widest p-3 border-b border-slate-100"
                                        style={{ color: activeAccentColor }}
                                    >
                                      DISTANCE (0-100)
                                  </h3>
                                  <div className="flex-1 overflow-y-auto bg-slate-50/50">
                                      <table className="w-full text-xs">
                                          <thead className="bg-white border-b border-slate-200 text-slate-400 font-bold sticky top-0 z-10">
                                              <tr>
                                                  <th className="px-3 py-2 text-left font-medium text-[10px] uppercase">Stakeholder</th>
                                                  <th className="px-3 py-2 text-right font-medium text-[10px] uppercase">
                                                      {isRelationship ? 'Dist' : 'Score (100-0)'}
                                                  </th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 bg-white">
                                              {currentData
                                                  .filter(s => s.position != null && (isRelationship ? s.id !== session.respondentId : true))
                                                  .sort((a,b) => (normalizeDistance(a.position)||0) - (normalizeDistance(b.position)||0))
                                                  .map(s => {
                                                      const dist = normalizeDistance(s.position);
                                                      return (
                                                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                              <td className="px-3 py-2 font-bold text-slate-700">{getShLabel(s.id)}</td>
                                                              <td className="px-3 py-2 text-right font-mono text-slate-500">
                                                                  {isRelationship ? dist : getImpactScore(dist)}
                                                              </td>
                                                          </tr>
                                                      );
                                                  })}
                                          </tbody>
                                      </table>
                                  </div>
                               </div>

                               {enableDownload && (
                                    <div className="pt-4 shrink-0">
                                         <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(svgRef)}
                                            className="w-full"
                                         >
                                            <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            DOWNLOAD MAP
                                         </Button>
                                    </div>
                               )}
                          </div>
                      </div>
                  </div>
              ) : (
                  // PARTICIPANT VIEW
                  <div className="p-4 flex flex-col h-full overflow-y-auto">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0 mb-4">
                        <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">
                            {isRelationship ? 'Relationships' : 'Impact'}
                        </h3>
                        <p className="text-[11px] text-slate-600 leading-snug">
                            {isRelationship 
                                ? "Position stakeholders based on relationship closeness (Distance = Strength)." 
                                : "Position stakeholders based on importance to success (Center = Critical)."
                            }
                        </p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Stakeholders</h3>
                            <span className="text-[10px] font-mono bg-slate-200 px-1.5 rounded text-slate-600">
                                {unplacedCount} left
                            </span>
                        </div>
                        <div className="space-y-2">
                            {draggableItems.map(s => {
                                const currentItemState = currentData.find(d => d.id === s.id);
                                const isPlaced = currentItemState?.position != null;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => placeOnBoard(s.id)}
                                        disabled={isSubmitted || isPlaced}
                                        className={`w-full p-2.5 rounded border text-left transition-all flex items-center justify-between group
                                            ${isPlaced ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-300 hover:border-blue-400 hover:shadow-md'}`}
                                    >
                                        <span className={`text-xs font-bold ${isPlaced ? 'text-slate-500' : 'text-slate-700'}`}>
                                            {s.label}
                                        </span>
                                        {!isPlaced && (
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: readOnlyOverride ? s.color : '#e2e8f0'}}></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                  </div>
              )}
          </aside>

          {/* MAIN CANVAS */}
          <main className="flex-1 bg-slate-100/50 relative overflow-hidden flex items-center justify-center p-4 min-h-0">
               {/* Background Gradient */}
               <div className="absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-br from-emerald-50 via-slate-100 to-slate-200"></div>
               
               {/* CUSTOM TOAST NOTIFICATION - BOTTOM CENTER */}
               {showToast && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-6 py-3 rounded-lg shadow-lg text-sm font-bold z-50 flex items-center gap-3 transition-all transform animate-fade-in-up">
                       <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <span>Thank you!</span>
                  </div>
               )}

               <svg
                ref={svgRef}
                viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
                className={`touch-none rounded-full shadow-sm bg-white relative z-0 transition-all duration-1000 ease-in-out max-w-full max-h-full w-auto h-auto aspect-square ${isSubmitted || readOnlyOverride ? 'cursor-default' : 'cursor-pointer'}`}
                preserveAspectRatio="xMidYMid meet"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <ZoneBackground 
                    radius={radius} 
                    centerX={center} 
                    centerY={center} 
                    zones={currentZones}
                    centerLabel={centerLabel}
                    themeColor={activeBaseColor}
                />
                
                {draggedItem?.position && (
                  <line
                    x1={center}
                    y1={center}
                    x2={draggedItem.position.x}
                    y2={draggedItem.position.y}
                    stroke={activeAccentColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    className="pointer-events-none opacity-60"
                  />
                )}

                {currentData
                  .filter(s => s.position != null && (isRelationship ? s.id !== session.respondentId : true))
                  .map(s => (
                    <DraggableToken
                      key={s.id}
                      id={getShLabel(s.id)} 
                      x={s.position!.x}
                      y={s.position!.y}
                      isDragging={draggingId === s.id}
                      onPointerDown={(e) => handlePointerDown(e, s.id)}
                      // CUSTOM STYLE INJECTED HERE: 
                      // If readOnlyOverride (Admin Viewer), pass custom radius (14) and no uppercase class.
                      // Otherwise (Participant), defaults apply (Radius 24, Uppercase).
                      radius={currentTokenRadius}
                      labelClassName={readOnlyOverride ? '' : 'uppercase'}
                      color={readOnlyOverride ? (getShColor(s.id) ? `fill-[${getShColor(s.id)}]` : undefined) : undefined}
                    />
                  ))}
              </svg>
          </main>
      </div>

      <footer className="shrink-0 h-14 bg-white border-t border-slate-200 flex z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative">
          
          {/* SPACER for Sidebar Alignment */}
          {/* This spacer mirrors the sidebar width so the switcher centers on the map, not the screen */}
          <div className={`shrink-0 transition-all duration-1000 ease-in-out border-r border-slate-200 hidden md:block ${focusMode ? 'w-0 border-none' : 'w-64'}`}></div>

          {/* MAIN FOOTER CONTENT (Aligns with Map Area) */}
          <div className="flex-1 flex items-center justify-between px-6 relative">

              {/* LEFT: Unplaced Count (Hidden in Viewer) */}
              <div className="flex-1 flex items-center justify-start z-10">
                {!readOnlyOverride && !isSessionCompleted && (
                    <span className="text-xs text-slate-400 font-mono">
                        {unplacedCount > 0 ? `${unplacedCount} unplaced` : 'All placed'}
                    </span>
                )}
              </div>
              
              {/* CENTER: Switcher (Absolute relative to map area) */}
              {/* Only show AFTER sidebar transition is done (switcherVisible) */}
              {switcherVisible && (
                  <div className="absolute left-1/2 -translate-x-1/2 z-40 animate-fade-in">
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button 
                                onClick={() => setActiveTab('relationship')} 
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'relationship' ? 'bg-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                                style={activeTab === 'relationship' ? { color: relAccent } : {}}
                            >
                                Relationship
                            </button>
                          <button 
                                onClick={() => setActiveTab('centrality')} 
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'centrality' ? 'bg-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                                style={activeTab === 'centrality' ? { color: impAccent } : {}}
                            >
                                Impact
                            </button>
                      </div>
                  </div>
              )}

              {/* RIGHT: Buttons OR Completed Status (Hidden in Viewer) */}
              <div className="flex-1 flex items-center justify-end z-10 gap-3">
                  {!readOnlyOverride && isSubmitted && (
                       <span className={`text-xs font-bold text-green-600 flex items-center gap-1 transition-all duration-1000 opacity-100 translate-x-0`}>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           COMPLETED
                       </span>
                  )}
                  {!readOnlyOverride && !isSubmitted && (
                      <>
                          {activeTab === 'relationship' ? (
                                <Button onClick={() => setActiveTab('centrality')} disabled={unplacedCount > 0}>Next: Impact →</Button>
                          ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('relationship')}>← Back</Button>
                                    <Button onClick={handleSubmit} disabled={unplacedCount > 0 || isSaving} isLoading={isSaving}>Finish</Button>
                                </>
                          )}
                      </>
                  )}
              </div>
          </div>
      </footer>
    </div>
  );
};
