import React, { useState, useEffect, useMemo } from 'react';
import { Session, Project, DifferentialResponse } from '../types';
import { updateSessionResponses, generateFlipPattern, normalizeValue } from '../utils';
import { useMounted } from '../hooks/useMounted';
import { SemanticScale } from './SemanticScale';

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
  const { semanticPairs, scale, randomization, question, instructions } = project.config;

  // Current differential index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Responses for all pairs
  const [responses, setResponses] = useState<Map<string, { rawValue: number; wasFlipped: boolean }>>(new Map());

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!!instructions);
  const [isComplete, setIsComplete] = useState(false);

  // Generate flip pattern for this session
  const flipPattern = useMemo(() =>
    generateFlipPattern(
      session.sessionId,
      semanticPairs.map(p => p.id),
      randomization.enabled
    ),
    [session.sessionId, semanticPairs, randomization.enabled]
  );

  // Current pair
  const currentPair = semanticPairs[currentIndex];
  const isFlipped = flipPattern.get(currentPair?.id) || false;
  const currentResponse = responses.get(currentPair?.id);

  // Progress
  const answeredCount = responses.size;
  const totalCount = semanticPairs.length;
  const progress = (answeredCount / totalCount) * 100;

  // Check if all pairs have responses
  const allAnswered = answeredCount === totalCount;

  const handleValueChange = (rawValue: number) => {
    if (!currentPair) return;

    setResponses(prev => {
      const newMap = new Map(prev);
      newMap.set(currentPair.id, { rawValue, wasFlipped: isFlipped });
      return newMap;
    });
  };

  const goToNext = () => {
    if (currentIndex < semanticPairs.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;

    setIsSubmitting(true);

    try {
      // Build responses array with normalized values
      const finalResponses: DifferentialResponse[] = semanticPairs.map(pair => {
        const resp = responses.get(pair.id)!;
        const normalized = normalizeValue(
          resp.rawValue,
          resp.wasFlipped,
          scale.mode,
          scale.points
        );

        return {
          pairId: pair.id,
          value: normalized,
          rawValue: resp.rawValue,
          wasFlipped: resp.wasFlipped,
          timestamp: Date.now()
        };
      });

      await updateSessionResponses(session.sessionId, finalResponses, 'completed');

      if (isMounted.current) {
        setIsComplete(true);
        onComplete({
          ...session,
          status: 'completed',
          responses: finalResponses,
          completedAt: Date.now()
        });
      }
    } catch (e) {
      console.error('Submit error:', e);
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Start session on first interaction
  useEffect(() => {
    if (session.status === 'created' && responses.size > 0) {
      updateSessionResponses(session.sessionId, [], 'in_progress').catch(console.error);
    }
  }, [responses.size, session.sessionId, session.status]);

  // COMPLETION SCREEN
  if (isComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm mb-6 border border-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Grazie!</h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
          Le tue risposte sono state registrate con successo.
        </p>
      </div>
    );
  }

  // INSTRUCTIONS SCREEN
  if (showInstructions && instructions) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-sm border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Istruzioni</h1>
          </div>

          <div className="prose prose-sm prose-slate max-w-none mb-6">
            <p className="text-slate-600 whitespace-pre-wrap">{instructions}</p>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Inizia
          </button>
        </div>
      </div>
    );
  }

  // MAIN QUESTIONNAIRE
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Progress bar only */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-sm border border-slate-100">
          {currentPair && (
            <div className="space-y-8">
              {/* Main question (if provided) */}
              {question && (
                <div className="text-center">
                  <p className="text-slate-700 font-medium">{question}</p>
                </div>
              )}

              {/* Scale */}
              <SemanticScale
                leftTerm={currentPair.leftTerm}
                rightTerm={currentPair.rightTerm}
                points={scale.points}
                mode={scale.mode}
                value={currentResponse?.rawValue ?? null}
                isFlipped={isFlipped}
                onChange={handleValueChange}
                showLabels={scale.showLabels}
              />

              {/* Hint */}
              <p className="text-xs text-slate-400 text-center">
                {scale.mode === 'discrete'
                  ? 'Seleziona il punto che meglio rappresenta la tua posizione'
                  : 'Trascina il cursore per indicare la tua posizione'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Precedente
          </button>

          {/* Quick nav dots */}
          <div className="flex gap-1 overflow-x-auto max-w-[200px]">
            {semanticPairs.map((pair, idx) => {
              const hasResponse = responses.has(pair.id);
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={pair.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                    w-2 h-2 rounded-full flex-shrink-0 transition-all
                    ${isCurrent
                      ? 'bg-blue-600 w-4'
                      : hasResponse
                        ? 'bg-emerald-400'
                        : 'bg-slate-200'
                    }
                  `}
                />
              );
            })}
          </div>

          {currentIndex === semanticPairs.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Invio...' : 'Invia Risposte'}
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Successiva
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
