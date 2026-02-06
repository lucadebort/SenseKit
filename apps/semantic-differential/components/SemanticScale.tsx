import React, { useState, useRef, useCallback } from 'react';

interface SemanticScaleProps {
  leftTerm: string;
  rightTerm: string;
  points: number;
  mode: 'discrete' | 'continuous';
  value: number | null;
  isFlipped: boolean;
  onChange: (value: number) => void;
  disabled?: boolean;
  showLabels?: boolean;
}

export const SemanticScale: React.FC<SemanticScaleProps> = ({
  leftTerm,
  rightTerm,
  points,
  mode,
  value,
  isFlipped,
  onChange,
  disabled = false,
  showLabels = true
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Display terms (potentially flipped)
  const displayLeft = isFlipped ? rightTerm : leftTerm;
  const displayRight = isFlipped ? leftTerm : rightTerm;

  // For discrete mode, generate point positions
  const discretePoints = Array.from({ length: points }, (_, i) => i);
  const midpoint = Math.floor(points / 2);

  // Handle discrete selection
  const handleDiscreteClick = (pointIndex: number) => {
    if (disabled) return;
    onChange(pointIndex);
  };

  // Handle continuous slider
  const handleSliderInteraction = useCallback((clientX: number) => {
    if (disabled || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onChange(Math.round(percentage));
  }, [disabled, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'continuous' || disabled) return;
    setIsDragging(true);
    handleSliderInteraction(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleSliderInteraction(e.clientX);
  }, [isDragging, handleSliderInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (mode !== 'continuous' || disabled) return;
    setIsDragging(true);
    handleSliderInteraction(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || mode !== 'continuous') return;
    handleSliderInteraction(e.touches[0].clientX);
  };

  return (
    <div className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Terms */}
      <div className="flex justify-between mb-3">
        <span className="text-sm font-medium text-foreground max-w-[40%] truncate">
          {displayLeft}
        </span>
        <span className="text-sm font-medium text-foreground max-w-[40%] truncate text-right">
          {displayRight}
        </span>
      </div>

      {/* Scale */}
      {mode === 'discrete' ? (
        // DISCRETE MODE
        <div className="flex items-center justify-between">
          {discretePoints.map((pointIndex) => {
            const isSelected = value === pointIndex;
            const isMidpoint = pointIndex === midpoint;

            return (
              <button
                key={pointIndex}
                onClick={() => handleDiscreteClick(pointIndex)}
                className={`
                  relative flex flex-col items-center group
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all
                    ${isSelected
                      ? 'bg-primary border-primary scale-110'
                      : isMidpoint
                        ? 'bg-muted border-border hover:border-primary/60'
                        : 'bg-background border-input hover:border-primary/60'
                    }
                  `}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {showLabels && (
                  <span className={`text-xs mt-1 ${isSelected ? 'text-primary font-medium' : 'text-muted-foreground/70'}`}>
                    {pointIndex + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // CONTINUOUS MODE
        <div
          ref={sliderRef}
          className="relative h-12 cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* Track */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-input rounded-full">
            {/* Fill */}
            {value !== null && (
              <div
                className="absolute h-full bg-primary/30 rounded-full"
                style={{
                  left: value < 50 ? `${value}%` : '50%',
                  right: value > 50 ? `${100 - value}%` : '50%'
                }}
              />
            )}
          </div>

          {/* Midpoint marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-border rounded" />

          {/* Thumb */}
          {value !== null && (
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded-full
                shadow-lg border-2 border-white transition-transform
                ${isDragging ? 'scale-125' : ''}
              `}
              style={{ left: `calc(${value}% - 12px)` }}
            />
          )}

          {/* Scale markers - 100 (left) - 0 (center) - 100 (right) */}
          {showLabels && (
            <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-xs text-muted-foreground/70">
              <span>100</span>
              <span>0</span>
              <span>100</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
