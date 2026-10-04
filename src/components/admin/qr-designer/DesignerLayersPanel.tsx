import React from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Type, 
  QrCode, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Sparkles,
  Store,
  PenTool
} from 'lucide-react';
import { PosterElement, PosterElementType } from '../../../types/posterDesigner';

interface DesignerLayersPanelProps {
  elements: PosterElement[];
  selectedElementId: string | null;
  selectedElementIds?: string[];
  onSelectElement: (id: string, multi?: boolean) => void;
  onUpdateElement: (id: string, patch: Partial<PosterElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onReorderElement: (id: string, direction: 'up' | 'down') => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
}

const getElementIcon = (type: PosterElementType) => {
  switch (type) {
    case 'business_name':
      return <Store className="h-3.5 w-3.5 text-emerald-400" />;
    case 'qr_code':
      return <QrCode className="h-3.5 w-3.5 text-emerald-400" />;
    case 'logo':
    case 'food_photo':
    case 'custom_image':
      return <ImageIcon className="h-3.5 w-3.5 text-amber-400" />;
    case 'hero_title':
    case 'subtitle':
    case 'custom_text':
    case 'english_text':
      return <Type className="h-3.5 w-3.5 text-indigo-400" />;
    case 'shape_circle':
      return <Circle className="h-3.5 w-3.5 text-cyan-400" />;
    case 'shape_path':
      return <PenTool className="h-3.5 w-3.5 text-rose-400" />;
    default:
      return <Square className="h-3.5 w-3.5 text-stone-400" />;
  }
};

export const DesignerLayersPanel: React.FC<DesignerLayersPanelProps> = ({
  elements,
  selectedElementId,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  onDeleteSelected,
  onDuplicateSelected
}) => {
  // Sort descending by zIndex so top layer appears on top of the list like Photoshop
  const layers = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const effectiveSelectedIds = (selectedElementIds && selectedElementIds.length > 0)
    ? selectedElementIds
    : (selectedElementId ? [selectedElementId] : []);

  const hasMultipleSelected = effectiveSelectedIds.length > 1;

  return (
    <div className="w-64 bg-stone-850 bg-[#1c1917] border-l border-stone-700 text-stone-200 flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3 border-b border-stone-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#ff9f1c]" />
          <span className="text-xs font-black text-white">الطبقات (Layers)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasMultipleSelected && (
            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-700/60 px-2 py-0.5 rounded-full font-bold">
              محدد ({effectiveSelectedIds.length})
            </span>
          )}
          <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full font-mono">
            {elements.length}
          </span>
        </div>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-xs">
            لا توجد عناصر مضافة بعد
          </div>
        ) : (
          layers.map((el, index) => {
            const isSelected = effectiveSelectedIds.includes(el.id);
            return (
              <div
                key={el.id}
                onClick={(e) => onSelectElement(el.id, e.ctrlKey || e.metaKey)}
                title="انقر للتحديد (أو اضغط زر Ctrl مع النقر لتحديد عدة عناصر معاً)"
                className={`group flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? hasMultipleSelected
                      ? 'bg-sky-500 text-stone-950 shadow-md font-black border border-sky-300'
                      : 'bg-[#ff9f1c] text-stone-950 shadow-md font-black' 
                    : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300'
                }`}
              >
                {/* Left: Type Icon & Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
                  <div className={`p-1 rounded-md ${isSelected ? 'bg-stone-950/20' : 'bg-stone-900'}`}>
                    {getElementIcon(el.type)}
                  </div>
                  <span className="truncate text-right block w-full text-xs">
                    {el.name || el.type}
                  </span>
                </div>

                {/* Right: Quick Toggles (Lock, Eye, Reorder) */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Reorder Up / Down */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => onReorderElement(el.id, 'up')}
                      disabled={index === 0}
                      className={`p-0.5 rounded hover:bg-black/20 ${index === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                      title="رفع الطبقة للأعلى"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onReorderElement(el.id, 'down')}
                      disabled={index === layers.length - 1}
                      className={`p-0.5 rounded hover:bg-black/20 ${index === layers.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                      title="إنزال الطبقة للأسفل"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Lock Toggle */}
                  <button
                    onClick={() => onUpdateElement(el.id, { locked: !el.locked })}
                    className={`p-1 rounded hover:bg-black/20 cursor-pointer ${
                      el.locked ? (isSelected ? 'text-stone-950' : 'text-amber-400') : 'text-stone-500 hover:text-stone-300'
                    }`}
                    title={el.locked ? 'إلغاء قفل الطبقة' : 'قفل الطبقة لمنع تحريكها'}
                  >
                    {el.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />}
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => onUpdateElement(el.id, { hidden: !el.hidden })}
                    className={`p-1 rounded hover:bg-black/20 cursor-pointer ${
                      el.hidden ? 'text-red-400' : (isSelected ? 'text-stone-950' : 'text-stone-400')
                    }`}
                    title={el.hidden ? 'إظهار الطبقة' : 'إخفاء الطبقة'}
                  >
                    {el.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Layer Bottom Actions */}
      {effectiveSelectedIds.length > 0 && (
        <div className="p-2 border-t border-stone-700/80 bg-stone-900/80 flex items-center justify-between gap-1.5">
          <button
            onClick={() => {
              if (hasMultipleSelected && onDuplicateSelected) {
                onDuplicateSelected();
              } else if (selectedElementId) {
                onDuplicateElement(selectedElementId);
              }
            }}
            className="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="h-3 w-3 text-sky-400" />
            <span>{hasMultipleSelected ? `تكرار (${effectiveSelectedIds.length})` : 'مضاعفة'}</span>
          </button>
          <button
            onClick={() => {
              if (hasMultipleSelected && onDeleteSelected) {
                onDeleteSelected();
              } else if (selectedElementId) {
                onDeleteElement(selectedElementId);
              }
            }}
            className="py-1.5 px-3 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title={hasMultipleSelected ? `حذف العناصر المحددة (${effectiveSelectedIds.length})` : "حذف الطبقة"}
          >
            <Trash2 className="h-3 w-3" />
            {hasMultipleSelected && <span>({effectiveSelectedIds.length})</span>}
          </button>
        </div>
      )}
    </div>
  );
};
