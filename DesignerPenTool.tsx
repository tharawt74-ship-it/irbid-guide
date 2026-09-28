import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Check, X, RotateCcw, Palette } from 'lucide-react';
import { pointsToSvgPath } from './designerSnap';
import { PosterElement } from '../../../types/posterDesigner';

interface DesignerPenToolProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  isActive: boolean;
  onClose: () => void;
  onAddElement: (element: PosterElement) => void;
  maxZIndex: number;
}

export const DesignerPenTool: React.FC<DesignerPenToolProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  isActive,
  onClose,
  onAddElement,
  maxZIndex
}) => {
  const [mode, setMode] = useState<'points' | 'freehand'>('freehand');
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Pen styling options
  const [strokeColor, setStrokeColor] = useState<string>('#1a4d2e');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fillColor, setFillColor] = useState<string>('none');
  const [isClosed, setIsClosed] = useState<boolean>(false);

  const containerRef = useRef<SVGSVGElement>(null);

  // Reset when activated/deactivated
  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      setCursorPos(null);
      setIsMouseDown(false);
    }
  }, [isActive]);

  if (!isActive) return null;

  // Convert browser mouse event to canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvasWidth, (e.clientX - rect.left) / zoom));
    const y = Math.max(0, Math.min(canvasHeight, (e.clientY - rect.top) / zoom));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = getCanvasCoords(e);

    if (mode === 'freehand') {
      setIsMouseDown(true);
      setPoints([coords]);
    } else {
      // In point mode, check if clicking near start point to close
      if (points.length >= 3) {
        const start = points[0];
        const dist = Math.hypot(coords.x - start.x, coords.y - start.y);
        if (dist <= 15) {
          handleComplete(true);
          return;
        }
      }
      setPoints(prev => [...prev, coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    setCursorPos(coords);

    if (mode === 'freehand' && isMouseDown) {
      setPoints(prev => {
        const last = prev[prev.length - 1];
        if (last && Math.hypot(coords.x - last.x, coords.y - last.y) < 3) {
          return prev;
        }
        return [...prev, coords];
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'freehand' && isMouseDown) {
      setIsMouseDown(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (points.length >= 2) {
      handleComplete(isClosed);
    }
  };

  const handleUndoPoint = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleComplete = (forceClosed?: boolean) => {
    if (points.length < 2) return;

    const closedState = forceClosed ?? isClosed;

    // Calculate bounding box
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = Math.ceil(strokeWidth / 2) + 2;
    const boxX = Math.max(0, minX - padding);
    const boxY = Math.max(0, minY - padding);
    const boxW = Math.max(20, (maxX - minX) + padding * 2);
    const boxH = Math.max(20, (maxY - minY) + padding * 2);

    // Normalize points relative to element's coordinate box
    const normalizedPoints = points.map(p => ({
      x: p.x - boxX,
      y: p.y - boxY
    }));

    const pathData = pointsToSvgPath(normalizedPoints, closedState);

    const newElement: PosterElement = {
      id: `el-path-${Date.now()}`,
      type: 'shape_path',
      name: mode === 'freehand' ? 'رسم قلم حر' : 'مسار متجهات (Pen)',
      x: Math.round(boxX),
      y: Math.round(boxY),
      width: Math.round(boxW),
      height: Math.round(boxH),
      zIndex: maxZIndex + 1,
      svgPath: pathData,
      svgFill: fillColor === 'none' ? 'none' : fillColor,
      backgroundColor: fillColor === 'none' ? 'transparent' : fillColor,
      borderColor: strokeColor,
      borderWidth: strokeWidth,
      opacity: 1
    };

    onAddElement(newElement);
    setPoints([]);
    onClose();
  };

  const currentPathString = pointsToSvgPath(points, isClosed);

  return (
    <>
      {/* Floating Pen Controls Toolbar */}
      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 border border-[#ff9f1c]/80 text-white rounded-2xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-md select-none text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 pl-2 border-l border-stone-700">
          <PenTool className="h-4 w-4 text-[#ff9f1c] animate-pulse" />
          <span className="font-black text-amber-300">أداة القلم (Pen Tool)</span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-stone-800 rounded-xl p-0.5 border border-stone-700">
          <button
            onClick={() => { setMode('freehand'); setPoints([]); }}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              mode === 'freehand' ? 'bg-[#ff9f1c] text-stone-950 shadow-xs' : 'text-stone-300 hover:text-white'
            }`}
          >
            ✏️ رسم حر
          </button>
          <button
            onClick={() => { setMode('points'); setPoints([]); }}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              mode === 'points' ? 'bg-[#ff9f1c] text-stone-950 shadow-xs' : 'text-stone-300 hover:text-white'
            }`}
          >
            🖊️ مسار نقطي
          </button>
        </div>

        {/* Stroke Color */}
        <div className="flex items-center gap-1.5 bg-stone-800 px-2 py-1 rounded-xl border border-stone-700">
          <span className="text-[10px] text-stone-400 font-bold">اللون:</span>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-5 h-5 rounded-md cursor-pointer border-0 bg-transparent"
          />
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-1.5 bg-stone-800 px-2 py-1 rounded-xl border border-stone-700">
          <span className="text-[10px] text-stone-400 font-bold">السماكة:</span>
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="bg-transparent text-white font-mono font-bold outline-none cursor-pointer"
          >
            <option value="1" className="bg-stone-800">1px</option>
            <option value="2" className="bg-stone-800">2px</option>
            <option value="4" className="bg-stone-800">4px</option>
            <option value="6" className="bg-stone-800">6px</option>
            <option value="10" className="bg-stone-800">10px</option>
            <option value="16" className="bg-stone-800">16px</option>
          </select>
        </div>

        {/* Fill Color */}
        <div className="flex items-center gap-1.5 bg-stone-800 px-2 py-1 rounded-xl border border-stone-700">
          <span className="text-[10px] text-stone-400 font-bold">تعبئة:</span>
          <button
            onClick={() => setFillColor(prev => prev === 'none' ? '#10b981' : 'none')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
              fillColor !== 'none' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {fillColor === 'none' ? 'بدون' : 'ملون'}
          </button>
          {fillColor !== 'none' && (
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
            />
          )}
        </div>

        {/* Undo Point */}
        {mode === 'points' && points.length > 0 && (
          <button
            onClick={handleUndoPoint}
            className="p-1 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg cursor-pointer"
            title="تراجع عن آخر نقطة"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {/* Finish & Add */}
        <button
          onClick={() => handleComplete()}
          disabled={points.length < 2}
          className={`px-3 py-1 rounded-xl font-black flex items-center gap-1 transition-all ${
            points.length >= 2 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md' 
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
          title="إنهاء المسار وإضافته للتصميم"
        >
          <Check className="h-3.5 w-3.5" />
          <span>إنهاء وإضافة</span>
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="p-1 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg cursor-pointer"
          title="إلغاء وضع القلم (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Full-canvas SVG Interactive Drawing Overlay */}
      <svg
        ref={containerRef}
        className="absolute inset-0 z-40 cursor-crosshair select-none"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          pointerEvents: 'all'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Render current drawing path */}
        {points.length >= 2 && (
          <path
            d={currentPathString}
            fill={fillColor === 'none' ? 'none' : fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* In Point mode: guide line from last point to mouse pointer */}
        {mode === 'points' && points.length > 0 && cursorPos && (
          <line
            x1={points[points.length - 1].x}
            y1={points[points.length - 1].y}
            x2={cursorPos.x}
            y2={cursorPos.y}
            stroke="#ff9f1c"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* In Point mode: anchor points dots */}
        {mode === 'points' && points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={idx === 0 ? 6 : 4}
              fill={idx === 0 ? '#ff9f1c' : '#ffffff'}
              stroke="#0f172a"
              strokeWidth="2"
            />
            {idx === 0 && points.length >= 3 && (
              <circle
                cx={p.x}
                cy={p.y}
                r={12}
                fill="none"
                stroke="#ff9f1c"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="animate-spin"
              />
            )}
          </g>
        ))}
      </svg>
    </>
  );
};
