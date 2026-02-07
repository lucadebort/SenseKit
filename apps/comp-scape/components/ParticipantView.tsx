import React, { useState, useMemo, useEffect } from 'react';
import { Session, Project, CompetitorPosition } from '../types';
import { updateSessionPositions } from '../utils';
import { useMounted } from '../hooks/useMounted';
import { CompetitiveMatrix } from './CompetitiveMatrix';
import { Button } from '@sensekit/shared-ui';

interface ParticipantViewProps {
  session: Session;
  project: Project;
  onComplete: (session: Session) => void;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  session,
  project,
  onComplete
}) => {
  const isMounted = useMounted();
  const { competitors, axes, question, instructions } = project.config;

  // Positions map: competitorId -> {x, y}
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!!instructions);
  const [hasStarted, setHasStarted] = useState(false);

  // Post-submit animation states
  const [showToast, setShowToast] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const placedCount = positions.size;
  const totalCount = competitors.length;
  const allPlaced = placedCount === totalCount;
  const unplacedCount = totalCount - placedCount;

  // Build tokens for matrix
  const matrixTokens = useMemo(() => {
    return competitors
      .filter(c => positions.has(c.id))
      .map(c => ({
        id: c.id,
        x: positions.get(c.id)!.x,
        y: positions.get(c.id)!.y,
        color: c.color,
        label: c.name,
      }));
  }, [competitors, positions]);

  const handleTokenMove = (id: string, x: number, y: number) => {
    if (isSubmitted) return;
    setPositions(prev => {
      const next = new Map(prev);
      next.set(id, { x, y });
      return next;
    });
    if (!hasStarted) {
      setHasStarted(true);
      updateSessionPositions(session.sessionId, [], 'in_progress').catch(console.error);
    }
  };

  const handlePlaceFromSidebar = (competitorId: string) => {
    if (isSubmitted) return;
    // Place at a slightly random position near center
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    handleTokenMove(competitorId, offsetX, offsetY);
  };

  const handleSubmit = async () => {
    if (!allPlaced || isSubmitting) return;

    // Immediate UI lock
    setIsSubmitted(true);
    setIsSubmitting(true);

    try {
      const now = Date.now();
      const finalPositions: CompetitorPosition[] = competitors.map(comp => {
        const pos = positions.get(comp.id)!;
        return {
          competitorId: comp.id,
          x: Math.round(pos.x * 10) / 10,
          y: Math.round(pos.y * 10) / 10,
          timestamp: now,
        };
      });

      await updateSessionPositions(session.sessionId, finalPositions, 'completed');

      // Toast → collapse sidebar
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setFocusMode(true);
      }, 2000);

      if (isMounted.current) {
        onComplete({
          ...session,
          status: 'completed',
          positions: finalPositions,
          completedAt: now,
        });
      }
    } catch (e) {
      console.error('Submit error:', e);
      setIsSubmitted(false);
      setShowToast(false);
      setFocusMode(false);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  // INSTRUCTIONS SCREEN
  if (showInstructions && instructions) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="bg-card rounded-lg max-w-lg w-full p-8 border border-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Istruzioni</h1>
          </div>
          <div className="prose prose-sm prose-slate max-w-none mb-6">
            <p className="text-muted-foreground whitespace-pre-wrap">{instructions}</p>
          </div>
          <Button className="w-full" onClick={() => setShowInstructions(false)}>
            Inizia
          </Button>
        </div>
      </div>
    );
  }

  // MAIN LAYOUT — StakeMap style: fixed, header + sidebar + canvas + footer
  return (
    <div className="fixed inset-0 flex flex-col bg-card overflow-hidden font-sans">
      {/* HEADER */}
      <header className="shrink-0 h-14 bg-card border-b border-border flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground uppercase tracking-wider">{project.name}</h1>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
            COMPETITIVE MAP
          </span>
        </div>
        {question && (
          <p className="text-xs text-muted-foreground hidden md:block max-w-md truncate">{question}</p>
        )}
      </header>

      {/* MAIN CONTENT: sidebar + canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">

        {/* LEFT SIDEBAR */}
        <aside className={`
          shrink-0 bg-card border-border z-30
          flex flex-col
          border-b md:border-b-0 md:border-r
          shadow-sm md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]
          transition-all duration-1000 ease-in-out
          h-auto max-h-[40vh] md:max-h-full
          ${focusMode ? 'w-0 opacity-0 p-0 border-none overflow-hidden' : 'w-full md:w-64 opacity-100'}
        `}>
          <div className="p-4 flex flex-col h-full overflow-y-auto">
            {/* Instructions card */}
            <div className="bg-background p-3 rounded-lg border border-border shrink-0 mb-4">
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                Posizionamento
              </h3>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Clicca su un competitor per posizionarlo nella matrice, poi trascinalo dove ritieni opportuno.
              </p>
            </div>

            {/* Competitor list */}
            <div className="flex-1 min-h-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Competitor</h3>
                <span className="text-[10px] font-mono bg-muted px-1.5 rounded text-muted-foreground">
                  {unplacedCount > 0 ? `${unplacedCount} left` : 'All placed'}
                </span>
              </div>
              <div className="space-y-2">
                {competitors.map(comp => {
                  const isPlaced = positions.has(comp.id);
                  return (
                    <button
                      key={comp.id}
                      onClick={() => handlePlaceFromSidebar(comp.id)}
                      disabled={isSubmitted || isPlaced}
                      className={`w-full p-2.5 rounded border text-left transition-all flex items-center justify-between group
                        ${isPlaced
                          ? 'bg-muted/50 border-border'
                          : 'bg-card border-border hover:border-primary/40 hover:shadow-md'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 transition-opacity ${isPlaced ? 'opacity-40' : 'opacity-100'}`}
                          style={{ backgroundColor: comp.color }}
                        />
                        <span className={`text-xs font-medium ${isPlaced ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {comp.name}
                        </span>
                      </div>
                      {isPlaced && (
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 bg-muted/30 relative overflow-hidden flex items-center justify-center p-4 min-h-0">
          {/* Background gradient */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100"></div>

          {/* Toast notification */}
          {showToast && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-6 py-3 rounded-lg shadow-lg text-sm font-medium z-50 flex items-center gap-3 animate-fade-in">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Grazie!</span>
            </div>
          )}

          {/* Matrix */}
          <CompetitiveMatrix
            axes={axes}
            tokens={matrixTokens}
            onTokenMove={handleTokenMove}
            interactive={!isSubmitted}
            showGrid={true}
            className="max-w-full max-h-full w-auto h-auto aspect-square"
          />
        </main>
      </div>

      {/* FOOTER */}
      <footer className="shrink-0 h-14 bg-card border-t border-border flex z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)] relative">
        {/* Spacer for sidebar alignment */}
        <div className={`shrink-0 transition-all duration-1000 ease-in-out border-r border-border hidden md:block ${focusMode ? 'w-0 border-none' : 'w-64'}`}></div>

        <div className="flex-1 flex items-center justify-between px-6">
          {/* LEFT: Unplaced count */}
          <div className="flex-1 flex items-center justify-start">
            {!isSubmitted && (
              <span className="text-xs text-muted-foreground font-mono">
                {unplacedCount > 0 ? `${unplacedCount} da posizionare` : 'Tutti posizionati'}
              </span>
            )}
          </div>

          {/* RIGHT: Button or Completed */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {isSubmitted && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                COMPLETATO
              </span>
            )}
            {!isSubmitted && (
              <Button
                onClick={handleSubmit}
                disabled={!allPlaced || isSubmitting}
                isLoading={isSubmitting}
              >
                Invia
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
