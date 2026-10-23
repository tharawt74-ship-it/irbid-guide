import React from 'react';

interface DesignerRulerProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  cursorPos: { x: number; y: number } | null;
  selectedRange?: { x: number; y: number; width: number; height: number } | null;
  onAddGuideline?: (type: 'horizontal' | 'vertical', position: number) => void;
}

export const DesignerRuler: React.FC<DesignerRulerProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  cursorPos,
  selectedRange,
  onAddGuideline
}) => {
  // Generate ticks for horizontal ruler (every 10px, label every 100px)
  const hTicks: { pos: number; isMajor: boolean; isMedium: boolean }[] = [];
  for (let i = 0; i <= canvasWidth; i += 10) {
    hTicks.push({
      pos: i,
      isMajor: i % 100 === 0,
      isMedium: i % 50 === 0 && i % 100 !== 0
    });
  }

  // Generate ticks for vertical ruler
  const vTicks: { pos: number; isMajor: boolean; isMedium: boolean }[] = [];
  for (let i = 0; i <= canvasHeight; i += 10) {
    vTicks.push({
      pos: i,
      isMajor: i % 100 === 0,
      isMedium: i % 50 === 0 && i % 100 !== 0
    });
  }

  const handleHorizontalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddGuideline) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    onAddGuideline('vertical', Math.round(clickX));
  };

  const handleVerticalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddGuideline) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = (e.clientY - rect.top) / zoom;
    onAddGuideline('horizontal', Math.round(clickY));
  };

  return (
    <>
      {/* Corner Origin Unit Box (Top-Left 0,0) */}
      <div 
        className="absolute -top-6 -left-6 z-40 bg-stone-900 border-t border-b border-l border-r border-stone-700/80 flex items-center justify-center text-[9px] font-mono font-bold text-stone-400 select-none rounded-tl-xs"
        style={{ width: '24px', height: '24px' }}
        title="نقطة البداية (0,0) - الوحدة: بكسل (Pixels)"
      >
        px
      </div>

      {/* Top Horizontal Ruler */}
      <div 
        className="absolute -top-6 left-0 z-30 bg-stone-900/95 border-t border-b border-r border-stone-700/80 overflow-hidden cursor-crosshair select-none"
        style={{
          width: `${canvasWidth * zoom}px`,
          height: '24px'
        }}
        onClick={handleHorizontalClick}
        title="المسطرة الأفقية (انقر لإضافة خط إرشادي عمودي)"
      >
        <div 
          className="relative h-full"
          style={{
            width: `${canvasWidth}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          {/* Selected Element Range Highlight */}
          {selectedRange && (
            <div 
              className="absolute top-0 bottom-0 bg-[#ff9f1c]/25 border-l border-r border-[#ff9f1c]/70 pointer-events-none"
              style={{
                left: `${selectedRange.x}px`,
                width: `${selectedRange.width}px`
              }}
            />
          )}

          {/* Mouse Cursor Tracker Line */}
          {cursorPos && (
            <div 
              className="absolute top-0 bottom-0 w-px bg-rose-500 z-20 pointer-events-none"
              style={{ left: `${cursorPos.x}px` }}
            />
          )}

          {/* Ticks */}
          {hTicks.map(({ pos, isMajor, isMedium }) => (
            <div
              key={pos}
              className="absolute bottom-0 pointer-events-none"
              style={{
                left: `${pos}px`,
                height: isMajor ? '16px' : (isMedium ? '10px' : '5px'),
                width: '1px',
                backgroundColor: isMajor ? '#a8a29e' : (isMedium ? '#78716c' : '#57534e')
              }}
            >
              {isMajor && (
                <span 
                  className="absolute bottom-3 left-1 text-[8px] font-mono text-stone-300 leading-none select-none"
                  style={{ transform: 'scale(0.85)', transformOrigin: 'left bottom' }}
                >
                  {pos}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Vertical Ruler (on the Left edge) */}
      <div 
        className="absolute top-0 -left-6 z-30 bg-stone-900/95 border-l border-b border-r border-stone-700/80 overflow-hidden cursor-crosshair select-none"
        style={{
          width: '24px',
          height: `${canvasHeight * zoom}px`
        }}
        onClick={handleVerticalClick}
        title="المسطرة العمودية (انقر لإضافة خط إرشادي أفقي)"
      >
        <div 
          className="relative w-full"
          style={{
            height: `${canvasHeight}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          {/* Selected Element Range Highlight */}
          {selectedRange && (
            <div 
              className="absolute right-0 left-0 bg-[#ff9f1c]/25 border-t border-b border-[#ff9f1c]/70 pointer-events-none"
              style={{
                top: `${selectedRange.y}px`,
                height: `${selectedRange.height}px`
              }}
            />
          )}

          {/* Mouse Cursor Tracker Line */}
          {cursorPos && (
            <div 
              className="absolute right-0 left-0 h-px bg-rose-500 z-20 pointer-events-none"
              style={{ top: `${cursorPos.y}px` }}
            />
          )}

          {/* Ticks */}
          {vTicks.map(({ pos, isMajor, isMedium }) => (
            <div
              key={pos}
              className="absolute right-0 pointer-events-none"
              style={{
                top: `${pos}px`,
                width: isMajor ? '14px' : (isMedium ? '8px' : '4px'),
                height: '1px',
                backgroundColor: isMajor ? '#a8a29e' : (isMedium ? '#78716c' : '#57534e')
              }}
            >
              {isMajor && (
                <span 
                  className="absolute -top-3 right-3 text-[8px] font-mono text-stone-300 leading-none select-none block"
                  style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}
                >
                  {pos}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
