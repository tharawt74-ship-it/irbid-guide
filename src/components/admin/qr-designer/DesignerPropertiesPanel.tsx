import React from 'react';
import { 
  Sliders, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  Palette, 
  Square, 
  Maximize, 
  Sparkles,
  Link,
  QrCode,
  Image as ImageIcon,
  MoveHorizontal,
  MoveVertical,
  PenTool,
  Upload,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { PosterElement } from '../../../types/posterDesigner';
import { VARIABLE_TOKENS, readAndCompressImageFile } from './designerUtils';

interface DesignerPropertiesPanelProps {
  selectedElement: PosterElement | null;
  selectedElements?: PosterElement[];
  canvasWidth: number;
  canvasHeight: number;
  onUpdateElement: (id: string, patch: Partial<PosterElement>) => void;
  onBulkUpdateElements?: (ids: string[], patch: Partial<PosterElement>) => void;
  onAlignSelectedElements?: (type: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => void;
  onDistributeSelectedElements?: (type: 'horizontal' | 'vertical') => void;
  onDeleteSelectedElements?: () => void;
  onDuplicateSelectedElements?: () => void;
  onSelectElement?: (id: string | null, multi?: boolean) => void;
  onClearSelection?: () => void;
}

const FONT_FAMILIES = [
  { label: 'Cairo (افتراضي عربي - كلاسيكي عريض)', value: 'Cairo, sans-serif' },
  { label: 'Tajawal (عصري متوازن)', value: 'Tajawal, sans-serif' },
  { label: 'Alexandria (هندسي معاصر)', value: 'Alexandria, sans-serif' },
  { label: 'Almarai (أنيق وسلس)', value: 'Almarai, sans-serif' },
  { label: 'IBM Plex Sans Arabic (تقني مقروء)', value: "'IBM Plex Sans Arabic', sans-serif" },
  { label: 'Changa (عريض للشاشات والبوسترات)', value: 'Changa, sans-serif' },
  { label: 'Amiri (كلاسيكي نسخ)', value: 'Amiri, serif' },
  { label: 'Inter (إنجليزي هندسي)', value: 'Inter, sans-serif' },
  { label: 'System Sans', value: 'system-ui, sans-serif' }
];

const PRESET_COLORS = [
  '#000000', '#ffffff', '#1a4d2e', '#0f766e', '#0284c7', 
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', 
  '#d97706', '#65a30d', '#16a34a', '#334155', '#71717a'
];

export const DesignerPropertiesPanel: React.FC<DesignerPropertiesPanelProps> = ({
  selectedElement,
  selectedElements,
  canvasWidth,
  canvasHeight,
  onUpdateElement,
  onBulkUpdateElements,
  onAlignSelectedElements,
  onDistributeSelectedElements,
  onDeleteSelectedElements,
  onDuplicateSelectedElements,
  onSelectElement,
  onClearSelection
}) => {
  // Multi-element selection mode (more than 1 element selected)
  if (selectedElements && selectedElements.length > 1) {
    const allLocked = selectedElements.every(el => el.locked);
    const allHidden = selectedElements.every(el => el.hidden);
    const ids = selectedElements.map(el => el.id);

    return (
      <div className="w-80 bg-stone-850 bg-[#1c1917] border-r border-stone-700 text-stone-200 flex flex-col h-full overflow-y-auto select-none p-4 space-y-5 text-right">
        {/* Header */}
        <div className="border-b border-stone-700/80 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
              <h3 className="text-sm font-black text-white">تحديد متعدد</h3>
            </div>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[11px] font-bold text-stone-400 hover:text-white bg-stone-800 px-2 py-0.5 rounded-lg border border-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="إلغاء التحديد"
              >
                <X className="h-3 w-3" />
                <span>إلغاء</span>
              </button>
            )}
          </div>
          <div className="text-[11px] text-sky-300 font-bold mt-1">
            تم تحديد {selectedElements.length} عناصر معاً
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            اضغط زر Ctrl مع النقر لإضافة أو إزالة عناصر من التحديد.
          </div>
        </div>

        {/* Selected Elements Pills List */}
        <div className="space-y-2">
          <span className="text-[10px] text-stone-400 font-bold block">العناصر المحددة:</span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-stone-900/60 rounded-xl border border-stone-800">
            {selectedElements.map(el => (
              <div 
                key={el.id}
                className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 px-2 py-1 rounded-lg text-[11px] font-medium border border-stone-700/80"
              >
                <span className="truncate max-w-[120px]">{el.name || el.type}</span>
                {onSelectElement && (
                  <button
                    type="button"
                    onClick={() => onSelectElement(el.id, true)}
                    className="text-stone-400 hover:text-red-400 p-0.5 cursor-pointer"
                    title="إزالة هذا العنصر من التحديد"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Element Alignment Tools */}
        {onAlignSelectedElements && (
          <div className="space-y-2.5 bg-stone-900/70 p-3 rounded-2xl border border-stone-750">
            <span className="text-[11px] font-black text-sky-400 flex items-center gap-1.5">
              <MoveHorizontal className="h-3.5 w-3.5" />
              <span>محاذاة العناصر المحددة لبعضها</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onAlignSelectedElements('right')}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                title="محاذاة العناصر لليمين"
              >
                <AlignRight className="h-3.5 w-3.5 text-sky-400" />
                <span>محاذاة لليمين</span>
              </button>
              <button
                type="button"
                onClick={() => onAlignSelectedElements('center-x')}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                title="محاذاة العناصر للوسط أفقياً"
              >
                <AlignCenter className="h-3.5 w-3.5 text-sky-400" />
                <span>وسط أفقياً</span>
              </button>
              <button
                type="button"
                onClick={() => onAlignSelectedElements('left')}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                title="محاذاة العناصر لليسار"
              >
                <AlignLeft className="h-3.5 w-3.5 text-sky-400" />
                <span>محاذاة لليسار</span>
              </button>
              <button
                type="button"
                onClick={() => onAlignSelectedElements('top')}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                title="محاذاة العناصر للأعلى"
              >
                <ArrowUp className="h-3.5 w-3.5 text-sky-400" />
                <span>للأعلى</span>
              </button>
              <button
                type="button"
                onClick={() => onAlignSelectedElements('center-y')}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                title="محاذاة العناصر للوسط رأسياً"
              >
                <MoveVertical className="h-3.5 w-3.5 text-sky-400" />
                <span>وسط رأسياً</span>
              </button>
              <button
                type="button"
                onClick={() => onAlignSelectedElements('bottom')}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                title="محاذاة العناصر للأسفل"
              >
                <ArrowDown className="h-3.5 w-3.5 text-sky-400" />
                <span>للأسفل</span>
              </button>
            </div>

            {/* Distribution Buttons (if >= 3 elements) */}
            {selectedElements.length >= 3 && onDistributeSelectedElements && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => onDistributeSelectedElements('horizontal')}
                  className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="توزيع المسافات بالتساوي أفقياً"
                >
                  <MoveHorizontal className="h-3 w-3 text-emerald-400" />
                  <span>توزيع أفقي متساوي</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDistributeSelectedElements('vertical')}
                  className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="توزيع المسافات بالتساوي رأسياً"
                >
                  <MoveVertical className="h-3 w-3 text-emerald-400" />
                  <span>توزيع رأسي متساوي</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Group Actions */}
        <div className="space-y-2 bg-stone-900/70 p-3 rounded-2xl border border-stone-750">
          <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>إجراءات جماعية على العناصر</span>
          </span>

          <div className="grid grid-cols-2 gap-2">
            {onBulkUpdateElements && (
              <>
                <button
                  type="button"
                  onClick={() => onBulkUpdateElements(ids, { locked: !allLocked })}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {allLocked ? <Unlock className="h-3.5 w-3.5 text-amber-400" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>{allLocked ? 'فك قفل الكل' : 'قفل الكل'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onBulkUpdateElements(ids, { hidden: !allHidden })}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {allHidden ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-stone-400" />}
                  <span>{allHidden ? 'إظهار الكل' : 'إخفاء الكل'}</span>
                </button>
              </>
            )}

            {onDuplicateSelectedElements && (
              <button
                type="button"
                onClick={onDuplicateSelectedElements}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-sky-400" />
                <span>تكرار الكل</span>
              </button>
            )}

            {onDeleteSelectedElements && (
              <button
                type="button"
                onClick={onDeleteSelectedElements}
                className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-xl text-xs font-bold border border-red-800/40 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف الكل</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Group Nudge Controller */}
        {onBulkUpdateElements && (
          <div className="space-y-2 bg-stone-900/70 p-3 rounded-2xl border border-stone-750">
            <span className="text-[11px] font-black text-stone-300 flex items-center gap-1.5">
              <MoveHorizontal className="h-3.5 w-3.5 text-stone-400" />
              <span>تحريك المجموعة معاً (Nudge)</span>
            </span>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  selectedElements.forEach(el => {
                    if (!el.locked) onUpdateElement(el.id, { x: el.x - 10 });
                  });
                }}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex items-center gap-1 cursor-pointer"
                title="تحريك لليسار 10px"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>يسار</span>
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    selectedElements.forEach(el => {
                      if (!el.locked) onUpdateElement(el.id, { y: el.y - 10 });
                    });
                  }}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex items-center justify-center gap-1 cursor-pointer"
                  title="تحريك للأعلى 10px"
                >
                  <ArrowUp className="h-3 w-3" />
                  <span>أعلى</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectedElements.forEach(el => {
                      if (!el.locked) onUpdateElement(el.id, { y: el.y + 10 });
                    });
                  }}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex items-center justify-center gap-1 cursor-pointer"
                  title="تحريك للأسفل 10px"
                >
                  <ArrowDown className="h-3 w-3" />
                  <span>أسفل</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  selectedElements.forEach(el => {
                    if (!el.locked) onUpdateElement(el.id, { x: el.x + 10 });
                  });
                }}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[10px] font-bold border border-stone-700 flex items-center gap-1 cursor-pointer"
                title="تحريك لليمين 10px"
              >
                <span>يمين</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!selectedElement) {
    return (
      <div className="w-80 bg-stone-900 border-r border-stone-700 text-stone-200 p-6 flex flex-col items-center justify-center text-center select-none">
        <Sliders className="h-10 w-10 text-stone-600 mb-3" />
        <h4 className="text-sm font-black text-stone-300">لوحة الخصائص والتنسيق</h4>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
          انقر على أي عنصر داخل ساحة العمل أو من لوحة الطبقات لتعديل مقاساته، ألوانه ونصوصه.
        </p>
        <div className="mt-4 p-3 bg-stone-800/80 border border-stone-700/60 rounded-xl text-[11px] text-stone-400 text-right space-y-1">
          <div className="font-bold text-amber-400 flex items-center gap-1">
            <span>💡 ميزة التحديد المتعدد:</span>
          </div>
          <div>
            اضغط باستمرار على زر <kbd className="px-1.5 py-0.5 bg-stone-900 text-white rounded border border-stone-700 font-mono text-[10px]">Ctrl</kbd> وانقر على عناصر البوستر لاختيار أكثر من عنصر معاً وتحريكهم أو محاذاتهم في وقت واحد.
          </div>
        </div>
      </div>
    );
  }

  const patch = (p: Partial<PosterElement>) => {
    onUpdateElement(selectedElement.id, p);
  };

  // Alignment helpers
  const alignLeft = () => patch({ x: 0 });
  const alignCenterX = () => patch({ x: Math.round((canvasWidth - selectedElement.width) / 2) });
  const alignRight = () => patch({ x: canvasWidth - selectedElement.width });
  const alignTop = () => patch({ y: 0 });
  const alignCenterY = () => patch({ y: Math.round((canvasHeight - selectedElement.height) / 2) });
  const alignBottom = () => patch({ y: canvasHeight - selectedElement.height });
  const matchFullWidth = () => patch({ x: 0, width: canvasWidth });

  const isTextType = ['business_name', 'hero_title', 'subtitle', 'english_text', 'table_number', 'working_hours', 'contact_bar', 'location_text', 'rating_badge', 'platform_branding', 'custom_text', 'shape_badge'].includes(selectedElement.type);
  const isImageType = ['logo', 'food_photo', 'custom_image'].includes(selectedElement.type);
  const isQrType = selectedElement.type === 'qr_code';

  return (
    <div className="w-80 bg-stone-850 bg-[#1c1917] border-r border-stone-700 text-stone-200 flex flex-col h-full overflow-y-auto select-none p-4 space-y-5 text-right">
      
      {/* Element Header */}
      <div className="border-b border-stone-700/80 pb-3">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={selectedElement.name}
            onChange={(e) => patch({ name: e.target.value })}
            className="bg-stone-900 border border-stone-700 px-2.5 py-1 rounded-lg text-xs font-black text-white focus:outline-none focus:border-[#ff9f1c] w-full"
            placeholder="اسم العنصر"
          />
        </div>
        <div className="text-[10px] text-stone-400 font-mono mt-1">
          النوع: {selectedElement.type}
        </div>
      </div>

      {/* Vector Path (Pen Tool) Section */}
      {selectedElement.type === 'shape_path' && (
        <div className="space-y-3 bg-stone-900/90 border border-rose-500/40 p-3 rounded-2xl">
          <label className="text-[11px] font-black text-rose-400 flex items-center gap-1.5">
            <PenTool className="h-3.5 w-3.5 text-rose-400" />
            <span>خصائص مسار القلم (Vector Stroke & Fill)</span>
          </label>

          {/* Stroke Color */}
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 font-bold block">لون الخط (Stroke Color)</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedElement.borderColor || '#1a4d2e'}
                onChange={(e) => patch({ borderColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={selectedElement.borderColor || '#1a4d2e'}
                onChange={(e) => patch({ borderColor: e.target.value })}
                className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-white flex-1"
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-stone-400 font-bold">
              <span>سماكة الخط (Stroke Width)</span>
              <span className="font-mono text-white">{selectedElement.borderWidth || 2}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={selectedElement.borderWidth || 2}
              onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Fill Color */}
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 font-bold block">لون التعبئة (Fill Color)</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedElement.svgFill && selectedElement.svgFill !== 'none' ? selectedElement.svgFill : '#10b981'}
                onChange={(e) => patch({ svgFill: e.target.value, backgroundColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
              <button
                onClick={() => patch({ svgFill: 'none', backgroundColor: 'transparent' })}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                  !selectedElement.svgFill || selectedElement.svgFill === 'none'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700'
                }`}
              >
                تعبئة مفرغة (None)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alignment Fast Tools */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-stone-400 flex items-center gap-1.5">
          <Maximize className="h-3.5 w-3.5 text-[#ff9f1c]" />
          <span>المحاذاة السريعة للكانفاس</span>
        </label>
        <div className="grid grid-cols-6 gap-1 bg-stone-900 p-1 rounded-xl border border-stone-700/80">
          <button onClick={alignLeft} className="p-1.5 hover:bg-stone-700 text-stone-300 rounded text-center cursor-pointer" title="محاذاة لليسار">
            <AlignLeft className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button onClick={alignCenterX} className="p-1.5 hover:bg-stone-700 text-stone-300 rounded text-center cursor-pointer" title="توسيط أفقي">
            <AlignCenter className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button onClick={alignRight} className="p-1.5 hover:bg-stone-700 text-stone-300 rounded text-center cursor-pointer" title="محاذاة لليمين">
            <AlignRight className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button onClick={alignTop} className="p-1.5 hover:bg-stone-700 text-stone-300 rounded text-center cursor-pointer" title="محاذاة للأعلى">
            <MoveVertical className="h-3.5 w-3.5 mx-auto rotate-180" />
          </button>
          <button onClick={alignCenterY} className="p-1.5 hover:bg-stone-700 text-stone-300 rounded text-center cursor-pointer" title="توسيط عمودي">
            <MoveVertical className="h-3.5 w-3.5 mx-auto" />
          </button>
          <button onClick={matchFullWidth} className="p-1.5 hover:bg-stone-700 text-[#ff9f1c] rounded text-center cursor-pointer font-bold text-[10px]" title="تمديد على كامل العرض">
            Full
          </button>
        </div>
      </div>

      {/* Transform / Geometry Coordinates */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-stone-400">الموقع والأبعاد (PX)</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80 flex items-center justify-between">
            <span className="text-stone-500 font-mono">X</span>
            <input
              type="number"
              value={Math.round(selectedElement.x)}
              onChange={(e) => patch({ x: Number(e.target.value) })}
              className="bg-transparent text-white font-mono font-bold text-left outline-none w-16"
            />
          </div>
          <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80 flex items-center justify-between">
            <span className="text-stone-500 font-mono">Y</span>
            <input
              type="number"
              value={Math.round(selectedElement.y)}
              onChange={(e) => patch({ y: Number(e.target.value) })}
              className="bg-transparent text-white font-mono font-bold text-left outline-none w-16"
            />
          </div>
          <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80 flex items-center justify-between">
            <span className="text-stone-500 font-mono">W العرض</span>
            <input
              type="number"
              value={Math.round(selectedElement.width)}
              onChange={(e) => patch({ width: Math.max(10, Number(e.target.value)) })}
              className="bg-transparent text-white font-mono font-bold text-left outline-none w-16"
            />
          </div>
          <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80 flex items-center justify-between">
            <span className="text-stone-500 font-mono">H الارتفاع</span>
            <input
              type="number"
              value={Math.round(selectedElement.height)}
              onChange={(e) => patch({ height: Math.max(10, Number(e.target.value)) })}
              className="bg-transparent text-white font-mono font-bold text-left outline-none w-16"
            />
          </div>
        </div>
      </div>

      {/* Typography Section */}
      {isTextType && (
        <div className="space-y-3 border-t border-stone-700/80 pt-3">
          <label className="text-[11px] font-black text-stone-400 flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-indigo-400" />
            <span>النص والخطوط (Typography)</span>
          </label>

          {/* Text Input / Variable Tokens */}
          <div className="space-y-1.5">
            <textarea
              rows={2}
              value={selectedElement.text || ''}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="اكتب النص هنا..."
              className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-400"
              dir="auto"
            />
            
            {/* Quick Variable Token Pills */}
            <div className="flex flex-wrap gap-1">
              {VARIABLE_TOKENS.map(vt => (
                <button
                  key={vt.token}
                  type="button"
                  onClick={() => patch({ text: (selectedElement.text || '') + ' ' + vt.token })}
                  className="bg-stone-800 hover:bg-stone-700 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors"
                  title={`إدراج متغير: ${vt.token}`}
                >
                  +{vt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-[10px] text-stone-400 font-bold">نوع الخط</label>
            <select
              value={selectedElement.fontFamily || 'Cairo, sans-serif'}
              onChange={(e) => patch({ fontFamily: e.target.value })}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80">
              <span className="text-[10px] text-stone-400 block mb-1">الحجم ({selectedElement.fontSize || 16}px)</span>
              <input
                type="range"
                min="10"
                max="80"
                value={selectedElement.fontSize || 16}
                onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80">
              <span className="text-[10px] text-stone-400 block mb-1">الوزن (Weight)</span>
              <select
                value={selectedElement.fontWeight || 'normal'}
                onChange={(e) => patch({ fontWeight: e.target.value })}
                className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="normal" className="bg-stone-800">عادي (400)</option>
                <option value="600" className="bg-stone-800">متوسط (600)</option>
                <option value="700" className="bg-stone-800">عريض (700)</option>
                <option value="900" className="bg-stone-800">عريض جداً (900)</option>
              </select>
            </div>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-700/80">
            <button
              onClick={() => patch({ textAlign: 'right' })}
              className={`flex-1 py-1 rounded text-center cursor-pointer ${
                selectedElement.textAlign === 'right' ? 'bg-indigo-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              يمين
            </button>
            <button
              onClick={() => patch({ textAlign: 'center' })}
              className={`flex-1 py-1 rounded text-center cursor-pointer ${
                selectedElement.textAlign === 'center' ? 'bg-indigo-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              وسط
            </button>
            <button
              onClick={() => patch({ textAlign: 'left' })}
              className={`flex-1 py-1 rounded text-center cursor-pointer ${
                selectedElement.textAlign === 'left' ? 'bg-indigo-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              يسار
            </button>
          </div>

          {/* Text Color */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-stone-400 font-bold">لون الخط</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedElement.color || '#000000'}
                onChange={(e) => patch({ color: e.target.value })}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={selectedElement.color || '#000000'}
                onChange={(e) => patch({ color: e.target.value })}
                className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-white flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* QR Specific Section */}
      {isQrType && (
        <div className="space-y-3 border-t border-stone-700/80 pt-3">
          <label className="text-[11px] font-black text-stone-400 flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5 text-emerald-400" />
            <span>تخصيص الباركود (QR Code)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80 space-y-1">
              <span className="text-[10px] text-stone-400 block">لون الرمز</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedElement.qrColor || '#1a4d2e'}
                  onChange={(e) => patch({ qrColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-[11px] font-mono text-white">{selectedElement.qrColor || '#1a4d2e'}</span>
              </div>
            </div>

            <div className="bg-stone-900 p-2 rounded-xl border border-stone-700/80 space-y-1">
              <span className="text-[10px] text-stone-400 block">لون خلفية الرمز</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedElement.qrBgColor || '#ffffff'}
                  onChange={(e) => patch({ qrBgColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-[11px] font-mono text-white">{selectedElement.qrBgColor || '#ffffff'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Specific Section */}
      {isImageType && (
        <div className="space-y-3 border-t border-stone-700/80 pt-3">
          <label className="text-[11px] font-black text-stone-400 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
            <span>خصائص الصورة</span>
          </label>
          
          <div className="space-y-1.5">
            {selectedElement.type === 'logo' && (
              <div className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-1.5 font-bold">
                ⭐ الافتراضي التلقائي: الصورة الشخصية / شعار المحل المختار
              </div>
            )}
            {selectedElement.type === 'food_photo' && (
              <div className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-800/60 rounded-lg p-1.5 font-bold">
                ⭐ الافتراضي التلقائي: صورة غلاف المحل بشكل دائم
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-stone-400 font-bold">صورة مخصصة كبديل (اختياري)</label>
              <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors">
                <Upload className="h-3 w-3" />
                <span>رفع من الجهاز</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await readAndCompressImageFile(file, 1200, 0.88);
                      patch({ src: dataUrl });
                    } catch (err) {
                      console.error('Failed to load image file:', err);
                    }
                  }}
                />
              </label>
            </div>
            <input
              type="text"
              value={selectedElement.src || ''}
              onChange={(e) => patch({ src: e.target.value })}
              placeholder="https://... أو رفع من جهازك"
              className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2 text-xs text-white focus:outline-none"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => patch({ clipShape: 'circle' })}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer border ${
                selectedElement.clipShape === 'circle' ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-stone-900 border-stone-700 text-stone-300'
              }`}
            >
              قص دائري ⚪
            </button>
            <button
              onClick={() => patch({ clipShape: 'rounded' })}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer border ${
                selectedElement.clipShape === 'rounded' || !selectedElement.clipShape ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-stone-900 border-stone-700 text-stone-300'
              }`}
            >
              مستطيل / زوايا 🔲
            </button>
          </div>
        </div>
      )}

      {/* Logo & Image Color Filter Section (فلاتر وألوان شعار المنصة والصور) */}
      {(isImageType || selectedElement.type === 'platform_branding') && (
        <div className="space-y-2.5 border-t border-stone-700/80 pt-3 bg-stone-900/60 p-3 rounded-2xl border border-stone-750">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-amber-400" />
              <span>لون وفلتر الشعار / الصورة (Logo Color Filter)</span>
            </label>
            <span className="text-[9px] bg-amber-950/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-800/60">
              تغيير لون اللوجو
            </span>
          </div>

          <p className="text-[10px] text-stone-300 leading-relaxed">
            يمكنك تغيير لون شعار شو في بإربد أو الصورة بسهولة ليظهر باللون الأبيض الناصع أو الأسود أو الذهبي حسب لون خلفية البوستر:
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => patch({ logoFilter: 'original' })}
              className={`p-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                !selectedElement.logoFilter || selectedElement.logoFilter === 'original'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
            >
              <span>🎨 الأصلي</span>
              <span className="text-[9px] opacity-80">(ألوان اللوجو)</span>
            </button>

            <button
              type="button"
              onClick={() => patch({ logoFilter: 'white' })}
              className={`p-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                selectedElement.logoFilter === 'white'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
            >
              <span>⚪ أبيض ناصع</span>
              <span className="text-[9px] opacity-80">(للمؤثرات الداكنة)</span>
            </button>

            <button
              type="button"
              onClick={() => patch({ logoFilter: 'black' })}
              className={`p-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                selectedElement.logoFilter === 'black'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
            >
              <span>⚫ أسود داكن</span>
              <span className="text-[9px] opacity-80">(للمؤثرات الفاتحة)</span>
            </button>

            <button
              type="button"
              onClick={() => patch({ logoFilter: 'gold' })}
              className={`p-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                selectedElement.logoFilter === 'gold'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
            >
              <span>👑 ذهبي فخم</span>
              <span className="text-[9px] opacity-80">(ذهبي)</span>
            </button>

            <button
              type="button"
              onClick={() => patch({ logoFilter: 'grayscale' })}
              className={`p-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                selectedElement.logoFilter === 'grayscale'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
            >
              <span>🌗 رمادي</span>
              <span className="text-[9px] opacity-80">(أبيض وأسود)</span>
            </button>

            <button
              type="button"
              onClick={() => patch({ logoFilter: 'invert' })}
              className={`p-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                selectedElement.logoFilter === 'invert'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
              }`}
            >
              <span>🔄 عكس الألوان</span>
              <span className="text-[9px] opacity-80">(Invert)</span>
            </button>
          </div>
        </div>
      )}

      {/* Box Fill & Background Section */}
      <div className="space-y-3 border-t border-stone-700/80 pt-3">
        <label className="text-[11px] font-black text-stone-400 flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5 text-emerald-400" />
          <span>الخلفية والتعبئة (Fill & Background)</span>
        </label>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedElement.backgroundColor || '#ffffff'}
            onChange={(e) => patch({ backgroundColor: e.target.value, backgroundGradient: undefined })}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
          />
          <input
            type="text"
            value={selectedElement.backgroundColor || 'transparent'}
            onChange={(e) => patch({ backgroundColor: e.target.value })}
            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-white flex-1"
          />
          <button
            onClick={() => patch({ backgroundColor: 'transparent', backgroundGradient: undefined })}
            className="bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-300 px-2 py-1 rounded-lg cursor-pointer"
          >
            شفاف
          </button>
        </div>

        {/* Quick Color Palette */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => patch({ backgroundColor: c, backgroundGradient: undefined })}
              style={{ backgroundColor: c }}
              className="w-5 h-5 rounded-full border border-stone-600 hover:scale-125 transition-transform cursor-pointer shadow-xs"
            />
          ))}
        </div>
      </div>

      {/* Borders & Radii */}
      <div className="space-y-3 border-t border-stone-700/80 pt-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-black text-stone-300 flex items-center gap-1.5">
            <Square className="h-3.5 w-3.5 text-amber-400" />
            <span>الإطار وانحناء الحواف والزوايا (Borders & Corner Radius)</span>
          </label>
        </div>

        {/* Border Width & Color */}
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-stone-900 p-2.5 rounded-xl border border-stone-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-stone-300 font-bold">
              <span>سمك الإطار (Border Width)</span>
              <span className="text-amber-400 font-mono">{selectedElement.borderWidth || 0}px</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="25"
                value={selectedElement.borderWidth || 0}
                onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
                className="w-full accent-[#ff9f1c] cursor-pointer"
              />
              {selectedElement.borderWidth && selectedElement.borderWidth > 0 ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="color"
                    value={selectedElement.borderColor || '#000000'}
                    onChange={(e) => patch({ borderColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    title="لون الإطار"
                  />
                  <input
                    type="text"
                    value={selectedElement.borderColor || '#000000'}
                    onChange={(e) => patch({ borderColor: e.target.value })}
                    className="bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-white w-16"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Corner Radii Section Header & Mode Selector */}
        <div className="bg-stone-900/90 p-3 rounded-2xl border border-stone-750 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>التحكم بانحناء الزوايا الأربعة</span>
            </span>

            {/* Corner Mode Toggle */}
            <div className="flex items-center bg-stone-950 p-0.5 rounded-lg border border-stone-800">
              <button
                type="button"
                onClick={() => {
                  const base = selectedElement.borderRadius || 0;
                  patch({
                    borderRadius: base,
                    borderRadiusTopLeft: undefined,
                    borderRadiusTopRight: undefined,
                    borderRadiusBottomRight: undefined,
                    borderRadiusBottomLeft: undefined
                  });
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  selectedElement.borderRadiusTopLeft === undefined &&
                  selectedElement.borderRadiusTopRight === undefined &&
                  selectedElement.borderRadiusBottomRight === undefined &&
                  selectedElement.borderRadiusBottomLeft === undefined
                    ? 'bg-amber-500 text-stone-950 font-black'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="تطبيق نفس الانحناء على جميع الزوايا معاً"
              >
                موحد
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = selectedElement.borderRadius || 0;
                  patch({
                    borderRadiusTopLeft: selectedElement.borderRadiusTopLeft ?? base,
                    borderRadiusTopRight: selectedElement.borderRadiusTopRight ?? base,
                    borderRadiusBottomRight: selectedElement.borderRadiusBottomRight ?? base,
                    borderRadiusBottomLeft: selectedElement.borderRadiusBottomLeft ?? base
                  });
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  selectedElement.borderRadiusTopLeft !== undefined ||
                  selectedElement.borderRadiusTopRight !== undefined ||
                  selectedElement.borderRadiusBottomRight !== undefined ||
                  selectedElement.borderRadiusBottomLeft !== undefined
                    ? 'bg-amber-500 text-stone-950 font-black'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="تحديد وتخصيص كل زاوية بشكل منفصل"
              >
                مفصل (4 زوايا)
              </button>
            </div>
          </div>

          {/* Unified Radius Slider */}
          {selectedElement.borderRadiusTopLeft === undefined &&
          selectedElement.borderRadiusTopRight === undefined &&
          selectedElement.borderRadiusBottomRight === undefined &&
          selectedElement.borderRadiusBottomLeft === undefined ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-stone-300">
                <span>انحناء جميع الزوايا معاً</span>
                <span className="text-amber-400 font-mono font-bold">{selectedElement.borderRadius || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedElement.borderRadius || 0}
                onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
                className="w-full accent-[#ff9f1c] cursor-pointer"
              />
            </div>
          ) : (
            /* 4 Corners Grid Layout */
            <div className="space-y-2">
              <span className="text-[10px] text-stone-400 block font-bold">انحناء الزوايا الأربعة بالتفصيل (px):</span>
              
              <div className="grid grid-cols-2 gap-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                {/* Top-Right (أعلى اليمين) */}
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-stone-300 font-bold">
                    <span>↖️ أعلى اليمين</span>
                    <span className="text-amber-400 font-mono">{selectedElement.borderRadiusTopRight ?? selectedElement.borderRadius ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedElement.borderRadiusTopRight ?? selectedElement.borderRadius ?? 0}
                    onChange={(e) => patch({ borderRadiusTopRight: Number(e.target.value) })}
                    className="w-full accent-[#ff9f1c] cursor-pointer"
                  />
                </div>

                {/* Top-Left (أعلى اليسار) */}
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-stone-300 font-bold">
                    <span>↗️ أعلى اليسار</span>
                    <span className="text-amber-400 font-mono">{selectedElement.borderRadiusTopLeft ?? selectedElement.borderRadius ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedElement.borderRadiusTopLeft ?? selectedElement.borderRadius ?? 0}
                    onChange={(e) => patch({ borderRadiusTopLeft: Number(e.target.value) })}
                    className="w-full accent-[#ff9f1c] cursor-pointer"
                  />
                </div>

                {/* Bottom-Right (أسفل اليمين) */}
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-stone-300 font-bold">
                    <span>↙️ أسفل اليمين</span>
                    <span className="text-amber-400 font-mono">{selectedElement.borderRadiusBottomRight ?? selectedElement.borderRadius ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedElement.borderRadiusBottomRight ?? selectedElement.borderRadius ?? 0}
                    onChange={(e) => patch({ borderRadiusBottomRight: Number(e.target.value) })}
                    className="w-full accent-[#ff9f1c] cursor-pointer"
                  />
                </div>

                {/* Bottom-Left (أسفل اليسار) */}
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-stone-300 font-bold">
                    <span>↘️ أسفل اليسار</span>
                    <span className="text-amber-400 font-mono">{selectedElement.borderRadiusBottomLeft ?? selectedElement.borderRadius ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedElement.borderRadiusBottomLeft ?? selectedElement.borderRadius ?? 0}
                    onChange={(e) => patch({ borderRadiusBottomLeft: Number(e.target.value) })}
                    className="w-full accent-[#ff9f1c] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick Preset Buttons for Corner Radii */}
          <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
            <span className="text-[10px] text-stone-400 block font-bold">أنماط واختصارات سريعة للانحناء:</span>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => patch({
                  borderRadius: 0,
                  borderRadiusTopLeft: undefined,
                  borderRadiusTopRight: undefined,
                  borderRadiusBottomRight: undefined,
                  borderRadiusBottomLeft: undefined
                })}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold border border-stone-700 cursor-pointer text-center"
              >
                ⬛ زوايا حادة (0)
              </button>
              <button
                type="button"
                onClick={() => patch({
                  borderRadius: 24,
                  borderRadiusTopLeft: undefined,
                  borderRadiusTopRight: undefined,
                  borderRadiusBottomRight: undefined,
                  borderRadiusBottomLeft: undefined
                })}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold border border-stone-700 cursor-pointer text-center"
              >
                🔲 انحناء كامل (24)
              </button>
              <button
                type="button"
                onClick={() => patch({
                  borderRadius: 99,
                  borderRadiusTopLeft: undefined,
                  borderRadiusTopRight: undefined,
                  borderRadiusBottomRight: undefined,
                  borderRadiusBottomLeft: undefined
                })}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold border border-stone-700 cursor-pointer text-center"
              >
                🔘 دائرية / بيضوي (99)
              </button>
              <button
                type="button"
                onClick={() => patch({
                  borderRadius: undefined,
                  borderRadiusTopLeft: 28,
                  borderRadiusTopRight: 28,
                  borderRadiusBottomRight: 0,
                  borderRadiusBottomLeft: 0
                })}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg font-bold border border-stone-700 cursor-pointer text-center"
              >
                🏷️ أعلى فقط
              </button>
              <button
                type="button"
                onClick={() => patch({
                  borderRadius: undefined,
                  borderRadiusTopLeft: 0,
                  borderRadiusTopRight: 0,
                  borderRadiusBottomRight: 28,
                  borderRadiusBottomLeft: 28
                })}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg font-bold border border-stone-700 cursor-pointer text-center"
              >
                🏷️ أسفل فقط
              </button>
              <button
                type="button"
                onClick={() => patch({
                  borderRadius: undefined,
                  borderRadiusTopLeft: 28,
                  borderRadiusTopRight: 0,
                  borderRadiusBottomRight: 28,
                  borderRadiusBottomLeft: 0
                })}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg font-bold border border-stone-700 cursor-pointer text-center"
              >
                💎 زوايا قطرية
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
