import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PosterElement, PosterTemplate } from '../../../types/posterDesigner';
import { Business } from '../../../types';
import { resolveVariableText, getElementImageSrc, getQrCodeImageUrl, detectTextDirection, getElementTextAlignment, getElementBorderRadiusCSS, getLogoFilterCSS } from './designerUtils';
import { calculateElementSnap, SnapGuideline } from './designerSnap';
import { DesignerRuler } from './DesignerRuler';
import { DesignerPenTool } from './DesignerPenTool';
import { Lock } from 'lucide-react';

interface DesignerCanvasProps {
  template: PosterTemplate;
  selectedElementId: string | null;
  selectedElementIds?: string[];
  onSelectElement: (id: string | null, multi?: boolean) => void;
  onUpdateElement: (id: string, patch: Partial<PosterElement>) => void;
  onCommitHistory?: () => void;
  selectedBusiness: Business | null;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  showGuidelines?: boolean;
  showRulers?: boolean;
  isPenToolActive?: boolean;
  onClosePenTool?: () => void;
  onAddElement?: (element: PosterElement) => void;
  gridSize?: number;
}

type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  template,
  selectedElementId,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onCommitHistory,
  selectedBusiness,
  zoom,
  showGrid,
  snapToGrid,
  showGuidelines = true,
  showRulers = true,
  isPenToolActive = false,
  onClosePenTool,
  onAddElement,
  gridSize = 10
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeGuidelines, setActiveGuidelines] = useState<SnapGuideline[]>([]);
  const [userGuidelines, setUserGuidelines] = useState<{ id: string; type: 'horizontal' | 'vertical'; position: number }[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    elementId: string;
    targetIds: string[];
    startX: number;
    startY: number;
    initialPositions: { [id: string]: { x: number; y: number } };
    hasMoved: boolean;
    isAlreadySelectedInMulti: boolean;
    isMultiKey: boolean;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    handle: ResizeHandleType;
    elementId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  const selectedElement = template.elements.find(el => el.id === selectedElementId);

  // Maximum zIndex for new pen elements
  const maxZIndex = template.elements.length > 0 
    ? Math.max(...template.elements.map(e => e.zIndex || 0)) 
    : 1;

  // Grid snap fallback helper
  const snapToGridVal = useCallback((val: number) => {
    if (!snapToGrid) return Math.round(val);
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Global mouse move & up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Track mouse in canvas space for rulers
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cX = Math.round((e.clientX - rect.left) / zoom);
        const cY = Math.round((e.clientY - rect.top) / zoom);
        if (cX >= 0 && cX <= template.canvasWidth && cY >= 0 && cY <= template.canvasHeight) {
          setCursorPos({ x: cX, y: cY });
        } else {
          setCursorPos(null);
        }
      }

      // Dragging element(s) with magnetic snapping
      if (dragState && dragState.isDragging) {
        const deltaX = (e.clientX - dragState.startX) / zoom;
        const deltaY = (e.clientY - dragState.startY) / zoom;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          dragState.hasMoved = true;
        }

        // Single element drag with magnetic guidelines
        if (dragState.targetIds.length === 1) {
          const initPos = dragState.initialPositions[dragState.elementId] || { x: 0, y: 0 };
          const rawX = initPos.x + deltaX;
          const rawY = initPos.y + deltaY;

          const el = template.elements.find(item => item.id === dragState.elementId);
          if (el) {
            const otherElements = template.elements.filter(item => item.id !== dragState.elementId);

            if (snapToGrid || showGuidelines) {
              const snapRes = calculateElementSnap(
                { x: rawX, y: rawY, width: el.width, height: el.height },
                rawX,
                rawY,
                otherElements,
                template.canvasWidth,
                template.canvasHeight,
                true,
                userGuidelines
              );

              let newX = Math.max(0, Math.min(template.canvasWidth - el.width, snapRes.snappedX));
              let newY = Math.max(0, Math.min(template.canvasHeight - el.height, snapRes.snappedY));

              if (showGuidelines) {
                setActiveGuidelines(snapRes.guidelines);
              } else {
                setActiveGuidelines([]);
              }

              onUpdateElement(dragState.elementId, { x: newX, y: newY });
            } else {
              let newX = Math.max(0, Math.min(template.canvasWidth - el.width, Math.round(rawX)));
              let newY = Math.max(0, Math.min(template.canvasHeight - el.height, Math.round(rawY)));
              setActiveGuidelines([]);
              onUpdateElement(dragState.elementId, { x: newX, y: newY });
            }
          }
        } else {
          // Multiple elements dragging together
          const moveX = snapToGrid ? snapToGridVal(deltaX) : Math.round(deltaX);
          const moveY = snapToGrid ? snapToGridVal(deltaY) : Math.round(deltaY);

          dragState.targetIds.forEach(id => {
            const initPos = dragState.initialPositions[id];
            const el = template.elements.find(item => item.id === id);
            if (initPos && el && !el.locked) {
              const newX = Math.max(0, Math.min(template.canvasWidth - el.width, initPos.x + moveX));
              const newY = Math.max(0, Math.min(template.canvasHeight - el.height, initPos.y + moveY));
              onUpdateElement(id, { x: newX, y: newY });
            }
          });
          setActiveGuidelines([]);
        }
      }

      // Resizing element
      if (resizeState && resizeState.isResizing) {
        const deltaX = (e.clientX - resizeState.startX) / zoom;
        const deltaY = (e.clientY - resizeState.startY) / zoom;

        let newX = resizeState.initialX;
        let newY = resizeState.initialY;
        let newWidth = resizeState.initialWidth;
        let newHeight = resizeState.initialHeight;

        const minSize = 20;

        switch (resizeState.handle) {
          case 'se':
            newWidth = Math.max(minSize, snapToGridVal(resizeState.initialWidth + deltaX));
            newHeight = Math.max(minSize, snapToGridVal(resizeState.initialHeight + deltaY));
            break;
          case 'e':
            newWidth = Math.max(minSize, snapToGridVal(resizeState.initialWidth + deltaX));
            break;
          case 's':
            newHeight = Math.max(minSize, snapToGridVal(resizeState.initialHeight + deltaY));
            break;
          case 'sw':
            newWidth = Math.max(minSize, snapToGridVal(resizeState.initialWidth - deltaX));
            newX = snapToGridVal(resizeState.initialX + (resizeState.initialWidth - newWidth));
            newHeight = Math.max(minSize, snapToGridVal(resizeState.initialHeight + deltaY));
            break;
          case 'w':
            newWidth = Math.max(minSize, snapToGridVal(resizeState.initialWidth - deltaX));
            newX = snapToGridVal(resizeState.initialX + (resizeState.initialWidth - newWidth));
            break;
          case 'nw':
            newWidth = Math.max(minSize, snapToGridVal(resizeState.initialWidth - deltaX));
            newX = snapToGridVal(resizeState.initialX + (resizeState.initialWidth - newWidth));
            newHeight = Math.max(minSize, snapToGridVal(resizeState.initialHeight - deltaY));
            newY = snapToGridVal(resizeState.initialY + (resizeState.initialHeight - newHeight));
            break;
          case 'n':
            newHeight = Math.max(minSize, snapToGridVal(resizeState.initialHeight - deltaY));
            newY = snapToGridVal(resizeState.initialY + (resizeState.initialHeight - newHeight));
            break;
          case 'ne':
            newWidth = Math.max(minSize, snapToGridVal(resizeState.initialWidth + deltaX));
            newHeight = Math.max(minSize, snapToGridVal(resizeState.initialHeight - deltaY));
            newY = snapToGridVal(resizeState.initialY + (resizeState.initialHeight - newHeight));
            break;
        }

        onUpdateElement(resizeState.elementId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        });
      }
    };

    const handleMouseUp = () => {
      setActiveGuidelines([]);

      // Commit drag to history if changed
      if (dragState) {
        if (!dragState.hasMoved && dragState.isAlreadySelectedInMulti && !dragState.isMultiKey) {
          // User clicked (without dragging) an item in a multi-selection without Ctrl: select only this item
          onSelectElement(dragState.elementId, false);
        } else if (dragState.hasMoved) {
          let hasAnyMoved = false;
          dragState.targetIds.forEach(id => {
            const initPos = dragState.initialPositions[id];
            const el = template.elements.find(item => item.id === id);
            if (initPos && el && (el.x !== initPos.x || el.y !== initPos.y)) {
              hasAnyMoved = true;
            }
          });
          if (hasAnyMoved) {
            onCommitHistory?.();
          }
        }
        setDragState(null);
      }

      // Commit resize to history if changed
      if (resizeState) {
        const el = template.elements.find(item => item.id === resizeState.elementId);
        if (el && (
          el.width !== resizeState.initialWidth || 
          el.height !== resizeState.initialHeight || 
          el.x !== resizeState.initialX || 
          el.y !== resizeState.initialY
        )) {
          onCommitHistory?.();
        }
        setResizeState(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState, 
    resizeState, 
    zoom, 
    snapToGridVal, 
    snapToGrid, 
    showGuidelines, 
    userGuidelines, 
    template.canvasWidth, 
    template.canvasHeight, 
    template.elements, 
    onUpdateElement, 
    onCommitHistory,
    onSelectElement
  ]);

  // Keyboard shortcut listener (Escape to deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectElement(null, false);
        if (isPenToolActive && onClosePenTool) {
          onClosePenTool();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectElement, isPenToolActive, onClosePenTool]);

  const handleElementMouseDown = (e: React.MouseEvent, element: PosterElement) => {
    e.stopPropagation();
    const isMultiKey = e.ctrlKey || e.metaKey;

    if (element.locked) {
      onSelectElement(element.id, isMultiKey);
      return;
    }

    if (isMultiKey) {
      // Toggle element in multi-selection
      onSelectElement(element.id, true);
      return;
    }

    const effectiveSelectedIds = (selectedElementIds && selectedElementIds.length > 0)
      ? selectedElementIds
      : (selectedElementId ? [selectedElementId] : []);

    const isAlreadySelectedInMulti = effectiveSelectedIds.includes(element.id) && effectiveSelectedIds.length > 1;

    if (!isAlreadySelectedInMulti) {
      onSelectElement(element.id, false);
    }

    const targetIds = isAlreadySelectedInMulti ? effectiveSelectedIds : [element.id];
    const initialPositions: { [id: string]: { x: number; y: number } } = {};
    template.elements.forEach(el => {
      if (targetIds.includes(el.id)) {
        initialPositions[el.id] = { x: el.x, y: el.y };
      }
    });

    setDragState({
      isDragging: true,
      elementId: element.id,
      targetIds,
      startX: e.clientX,
      startY: e.clientY,
      initialPositions,
      hasMoved: false,
      isAlreadySelectedInMulti,
      isMultiKey: false
    });
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: ResizeHandleType) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked) return;

    setResizeState({
      isResizing: true,
      handle,
      elementId: selectedElement.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: selectedElement.x,
      initialY: selectedElement.y,
      initialWidth: selectedElement.width,
      initialHeight: selectedElement.height
    });
  };

  // Clicking anywhere on the canvas background deselects any selected element
  const handleCanvasBackgroundClick = (e: React.MouseEvent) => {
    onSelectElement(null);
  };

  const handleAddUserGuideline = (type: 'horizontal' | 'vertical', position: number) => {
    setUserGuidelines(prev => [
      ...prev,
      { id: `user-g-${Date.now()}`, type, position }
    ]);
  };

  const handleRemoveUserGuideline = (id: string) => {
    setUserGuidelines(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div 
      className="flex-1 overflow-auto bg-[#0c0a09] relative flex items-center justify-center p-8 select-none min-h-0 min-w-0"
      dir="ltr"
      onClick={handleCanvasBackgroundClick}
    >
      {/* Outer Scaled Artboard Container */}
      <div 
        className="relative transition-all duration-75 flex-shrink-0"
        style={{
          width: `${template.canvasWidth * zoom}px`,
          height: `${template.canvasHeight * zoom}px`,
          marginTop: showRulers ? '24px' : '0px',
          marginLeft: showRulers ? '24px' : '0px',
        }}
      >
        {/* Horizontal & Vertical Rulers */}
        {showRulers && (
          <DesignerRuler
            canvasWidth={template.canvasWidth}
            canvasHeight={template.canvasHeight}
            zoom={zoom}
            cursorPos={cursorPos}
            selectedRange={selectedElement ? {
              x: selectedElement.x,
              y: selectedElement.y,
              width: selectedElement.width,
              height: selectedElement.height
            } : null}
            onAddGuideline={handleAddUserGuideline}
          />
        )}

        {/* The Poster Artboard Canvas */}
        <div
          ref={canvasRef}
          onClick={handleCanvasBackgroundClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${template.canvasWidth}px`,
            height: `${template.canvasHeight}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            backgroundColor: template.backgroundColor || '#ffffff',
            backgroundImage: template.backgroundGradient 
              ? `linear-gradient(${template.backgroundGradient.direction || 'to bottom'}, ${template.backgroundGradient.from}, ${template.backgroundGradient.to})` 
              : undefined,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
          className="transition-transform duration-75 overflow-hidden rounded-xs"
        >
          {/* Optional Grid Overlay */}
          {showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-20 z-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #6366f1 1px, transparent 1px),
                  linear-gradient(to bottom, #6366f1 1px, transparent 1px)
                `,
                backgroundSize: `${gridSize}px ${gridSize}px`
              }}
            />
          )}

          {/* Interactive Pen Tool Layer */}
          {isPenToolActive && onAddElement && onClosePenTool && (
            <DesignerPenTool
              canvasWidth={template.canvasWidth}
              canvasHeight={template.canvasHeight}
              zoom={zoom}
              isActive={isPenToolActive}
              onClose={onClosePenTool}
              onAddElement={(el) => {
                onAddElement(el);
                onCommitHistory?.();
              }}
              maxZIndex={maxZIndex}
            />
          )}

          {/* Dynamic 1000% Magnetic Guidelines Overlay */}
          {showGuidelines && (
            <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
              {/* Active Snap Guidelines */}
              {activeGuidelines.map(g => (
                <div
                  key={g.id}
                  className="absolute pointer-events-none"
                  style={g.type === 'vertical' ? {
                    left: `${g.position}px`,
                    top: 0,
                    bottom: 0,
                    width: '1.5px',
                    backgroundColor: g.color || '#ec4899',
                    boxShadow: `0 0 8px ${g.color || '#ec4899'}`
                  } : {
                    top: `${g.position}px`,
                    left: 0,
                    right: 0,
                    height: '1.5px',
                    backgroundColor: g.color || '#ec4899',
                    boxShadow: `0 0 8px ${g.color || '#ec4899'}`
                  }}
                >
                  {g.label && (
                    <div 
                      className="absolute text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-50"
                      style={{
                        backgroundColor: g.color || '#ec4899',
                        ...(g.type === 'vertical' ? {
                          top: '12px',
                          left: '6px'
                        } : {
                          right: '12px',
                          top: '-20px'
                        })
                      }}
                    >
                      {g.label}
                    </div>
                  )}
                </div>
              ))}

              {/* Permanent User Guidelines (added from rulers) */}
              {userGuidelines.map(g => (
                <div
                  key={g.id}
                  className="absolute pointer-events-auto group cursor-pointer"
                  style={g.type === 'vertical' ? {
                    left: `${g.position}px`,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    borderLeft: '1.5px dashed #3b82f6'
                  } : {
                    top: `${g.position}px`,
                    left: 0,
                    right: 0,
                    height: '3px',
                    borderTop: '1.5px dashed #3b82f6'
                  }}
                  title="انقر مرتين لحذف الخط الإرشادي"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUserGuideline(g.id);
                  }}
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[9px] font-bold px-1 py-0.5 rounded absolute top-1 right-1 whitespace-nowrap shadow-md">
                    {Math.round(g.position)}px ✖
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Render All Poster Elements */}
          {template.elements.map(el => {
            if (el.hidden) return null;

            const effectiveSelectedIds = (selectedElementIds && selectedElementIds.length > 0)
              ? selectedElementIds
              : (selectedElementId ? [selectedElementId] : []);
            const isSelected = effectiveSelectedIds.includes(el.id);
            const resolvedText = el.text ? resolveVariableText(el.text, selectedBusiness) : '';
            const resolvedSrc = getElementImageSrc(el, selectedBusiness);
            const qrSrc = getQrCodeImageUrl(el, selectedBusiness);
            const itemDir = detectTextDirection(resolvedText, el);
            const alignConfig = getElementTextAlignment(el.textAlign, itemDir);
            const textAlignVal = alignConfig.textAlign;
            const justifyContentVal = alignConfig.justifyContent;

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleElementMouseDown(e, el)}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                style={{
                  position: 'absolute',
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  zIndex: el.zIndex,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  opacity: el.opacity ?? 1,
                  backgroundColor: el.backgroundColor || 'transparent',
                  backgroundImage: el.backgroundGradient 
                    ? `linear-gradient(${el.backgroundGradient.direction || 'to bottom'}, ${el.backgroundGradient.from}, ${el.backgroundGradient.to})` 
                    : undefined,
                  color: el.color || '#000000',
                  fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
                  fontWeight: el.fontWeight || undefined,
                  fontFamily: el.fontFamily || undefined,
                  borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
                  borderColor: el.borderColor || undefined,
                  borderStyle: el.borderWidth ? 'solid' : undefined,
                  borderRadius: getElementBorderRadiusCSS(el),
                  direction: itemDir,
                  unicodeBidi: 'plaintext',
                  textAlign: textAlignVal,
                  cursor: el.locked ? 'not-allowed' : (isSelected ? 'move' : 'pointer')
                }}
                className={`box-border flex items-center overflow-hidden transition-all duration-75 ${
                  isSelected 
                    ? 'ring-2 ring-[#ff9f1c] ring-offset-2 ring-offset-transparent shadow-lg' 
                    : 'hover:outline-1 hover:outline-dashed hover:outline-indigo-400'
                }`}
              >
                {/* Content by Type */}
                {el.type === 'qr_code' ? (
                  <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none">
                    <img 
                      src={qrSrc} 
                      alt="QR" 
                      className="w-full h-full object-contain pointer-events-none" 
                    />
                  </div>
                ) : (el.type === 'logo' || el.type === 'food_photo' || el.type === 'custom_image') ? (
                  <img 
                    src={resolvedSrc} 
                    alt={el.name} 
                    style={{
                      objectFit: el.objectFit || 'cover',
                      borderRadius: getElementBorderRadiusCSS(el),
                      filter: getLogoFilterCSS(el.logoFilter)
                    }}
                    className="w-full h-full pointer-events-none select-none" 
                  />
                ) : (el.type === 'shape_path' || (el.svgPath && el.type !== 'shape_wave')) ? (
                  <svg 
                    viewBox={`0 0 ${el.width} ${el.height}`} 
                    className="w-full h-full pointer-events-none select-none"
                    style={{ overflow: 'visible' }}
                  >
                    <path 
                      d={el.svgPath || ''} 
                      fill={el.svgFill || el.backgroundColor || 'none'} 
                      stroke={el.borderColor || el.color || 'none'} 
                      strokeWidth={el.borderWidth || 2} 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  </svg>
                ) : el.type === 'shape_wave' ? (
                  <svg 
                    viewBox="0 0 500 50" 
                    preserveAspectRatio="none" 
                    className="w-full h-full pointer-events-none select-none" 
                    style={{ fill: el.svgFill || el.backgroundColor || '#1a4d2e' }}
                  >
                    <path d={el.svgPath || "M0,0 C150,50 350,-20 500,20 L500,0 L0,0 Z"} />
                  </svg>
                ) : (el.type === 'platform_branding' || el.id === 'el-footer-branding' || el.id?.includes('footer-platform')) ? (
                  <div 
                    className="w-full h-full flex flex-col justify-center pointer-events-none select-none"
                    style={{
                      alignItems: el.textAlign === 'center' ? 'center' : (el.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                      gap: '4px'
                    }}
                  >
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="object-contain"
                      style={{
                        maxHeight: `${Math.min((el.height || 80) * 0.55, 38)}px`,
                        maxWidth: '180px',
                        height: 'auto',
                        filter: getLogoFilterCSS(el.logoFilter)
                      }}
                    />
                    <span
                      dir="ltr"
                      className="font-mono tracking-wider font-extrabold"
                      style={{
                        fontSize: el.fontSize ? `${el.fontSize}px` : '13px',
                        fontWeight: el.fontWeight as any || '800',
                        color: el.color || '#1a4d2e',
                        lineHeight: 1
                      }}
                    >
                      shofibirbid.site
                    </span>
                  </div>
                ) : (
                  <div 
                    dir={itemDir}
                    style={{
                      textAlign: textAlignVal,
                      direction: itemDir,
                      unicodeBidi: 'plaintext',
                      lineHeight: el.lineHeight || 1.3,
                      justifyContent: justifyContentVal,
                      fontFamily: el.fontFamily || 'Cairo, sans-serif'
                    }}
                    className="w-full h-full flex items-center pointer-events-none select-none word-break"
                  >
                    {resolvedText}
                  </div>
                )}

                {/* Status icon indicators if locked */}
                {el.locked && (
                  <div className="absolute top-1 right-1 bg-stone-900/80 text-white p-1 rounded-full text-[10px] shadow-xs">
                    <Lock className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Multi-selection Outlines when more than 1 element is selected */}
          {(() => {
            const effectiveSelectedIds = (selectedElementIds && selectedElementIds.length > 0)
              ? selectedElementIds
              : (selectedElementId ? [selectedElementId] : []);

            if (effectiveSelectedIds.length <= 1) return null;

            return (
              <>
                {/* Floating Multi-selection HUD */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-stone-900/95 text-white px-4 py-1.5 rounded-full border border-sky-500/60 shadow-2xl flex items-center gap-2.5 text-xs z-[999999] backdrop-blur-md pointer-events-none select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                  <span className="font-black text-sky-300">تم تحديد {effectiveSelectedIds.length} عناصر معاً</span>
                  <span className="text-[11px] text-stone-400">| اضغط Ctrl + كليك لإضافة أو إزالة عناصر • اسحب لتحريك المجموعة</span>
                </div>

                {/* Per-element Outlines */}
                {effectiveSelectedIds.map(id => {
                  const el = template.elements.find(item => item.id === id);
                  if (!el || el.hidden) return null;
                  return (
                    <div
                      key={`multi-outline-${el.id}`}
                      style={{
                        position: 'absolute',
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.width}px`,
                        height: `${el.height}px`,
                        zIndex: 99998,
                        pointerEvents: 'none'
                      }}
                      className="border-2 border-dashed border-sky-400 ring-1 ring-sky-400/50 rounded-xs"
                    >
                      <div className="absolute -top-5.5 right-0 bg-sky-950/95 text-sky-200 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 shadow-md border border-sky-600/70 whitespace-nowrap">
                        <span>{el.name}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* Active Single-Element Bounding Box with 8 Resize Handles */}
          {(() => {
            const effectiveSelectedIds = (selectedElementIds && selectedElementIds.length > 0)
              ? selectedElementIds
              : (selectedElementId ? [selectedElementId] : []);

            if (effectiveSelectedIds.length !== 1) return null;
            if (!selectedElement || selectedElement.locked) return null;

            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${selectedElement.x}px`,
                  top: `${selectedElement.y}px`,
                  width: `${selectedElement.width}px`,
                  height: `${selectedElement.height}px`,
                  zIndex: 99999,
                  pointerEvents: 'none'
                }}
                className="border-2 border-[#ff9f1c] ring-1 ring-white/50"
              >
                {/* Dimensions HUD Badge */}
                <div className="absolute -top-7 right-0 bg-stone-900 text-[#ff9f1c] px-2 py-0.5 rounded text-[10px] font-mono font-black flex items-center gap-2 shadow-lg border border-stone-700 whitespace-nowrap pointer-events-none">
                  <span>{selectedElement.name}</span>
                  <span className="text-white">| W:{Math.round(selectedElement.width)} H:{Math.round(selectedElement.height)}</span>
                  <span className="text-stone-400">X:{Math.round(selectedElement.x)} Y:{Math.round(selectedElement.y)}</span>
                </div>

                {/* Resize Handles (8 Points) */}
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-nwse-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'n')}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-ns-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-nesw-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'e')}
                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-ew-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-nwse-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 's')}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-ns-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-nesw-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
                <div 
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, 'w')}
                  className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff9f1c] rounded-xs cursor-ew-resize pointer-events-auto hover:scale-125 shadow-xs" 
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
