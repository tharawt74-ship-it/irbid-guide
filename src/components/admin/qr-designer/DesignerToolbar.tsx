import React, { useState } from 'react';
import { 
  Plus, 
  Type, 
  QrCode, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  LayoutTemplate, 
  Printer, 
  Download, 
  Save, 
  RotateCcw, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  Grid, 
  Trash2, 
  Copy, 
  Check, 
  Layers, 
  Sparkles, 
  Store,
  ChevronDown,
  Compass,
  FileCheck,
  PenTool,
  Ruler,
  Magnet
} from 'lucide-react';
import { Business } from '../../../types';
import { PosterElementType, PosterTemplate } from '../../../types/posterDesigner';

interface DesignerToolbarProps {
  template: PosterTemplate;
  onAddElement: (type: PosterElementType) => void;
  onOpenTemplatesModal: () => void;
  onSaveTemplate: () => void;
  onSetAsDefault: () => void;
  onPrint: () => void;
  onExportPng: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean | ((prev: boolean) => boolean)) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean | ((prev: boolean) => boolean)) => void;
  showGuidelines: boolean;
  setShowGuidelines: (show: boolean | ((prev: boolean) => boolean)) => void;
  showRulers: boolean;
  setShowRulers: (show: boolean | ((prev: boolean) => boolean)) => void;
  isPenToolActive: boolean;
  setIsPenToolActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness: (biz: Business | null) => void;
  selectedElementId: string | null;
  selectedCount?: number;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  isSaving?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  template,
  onAddElement,
  onOpenTemplatesModal,
  onSaveTemplate,
  onSetAsDefault,
  onPrint,
  onExportPng,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  showGuidelines,
  setShowGuidelines,
  showRulers,
  setShowRulers,
  isPenToolActive,
  setIsPenToolActive,
  businesses,
  selectedBusiness,
  onSelectBusiness,
  selectedElementId,
  selectedCount = 0,
  onDeleteSelected,
  onDuplicateSelected,
  isSaving,
  isFullscreen,
  onToggleFullscreen
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  return (
    <div className="bg-stone-800 border-b border-stone-700 text-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      
      {/* Left / Start: Add Elements & Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Templates Library Button */}
        <button
          onClick={onOpenTemplatesModal}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all"
        >
          <LayoutTemplate className="h-4 w-4" />
          <span>مكتبة القوالب 🎨</span>
        </button>

        {/* Add Element Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة عنصر جديد</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {isAddMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsAddMenuOpen(false)} 
              />
              <div className="absolute top-full right-0 mt-2 w-64 bg-stone-800 border border-stone-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-right">
                <div className="px-3 py-1 text-[11px] font-black text-stone-400 border-b border-stone-700/60 mb-1">
                  عناصر المحل المتغيرة (Dynamic)
                </div>
                
                <button
                  onClick={() => { onAddElement('business_name'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>اسم المحل التجاري</span>
                  <Store className="h-4 w-4 text-emerald-400" />
                </button>

                <button
                  onClick={() => { onAddElement('qr_code'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>رمز QR المنيو الذكي</span>
                  <QrCode className="h-4 w-4 text-emerald-400" />
                </button>

                <button
                  onClick={() => { onAddElement('logo'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>شعار / لوجو المحل</span>
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                </button>

                <button
                  onClick={() => { onAddElement('food_photo'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>صورة الوجبة / الغلاف</span>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </button>

                <button
                  onClick={() => { onAddElement('table_number'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>رقم الطاولة / الجلسة</span>
                  <span className="text-[10px] bg-stone-700 px-1.5 py-0.5 rounded text-amber-300">#01</span>
                </button>

                <button
                  onClick={() => { onAddElement('working_hours'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>أوقات العمل وساعات الدوام</span>
                  <span className="text-[10px] text-stone-400">⏰</span>
                </button>

                <button
                  onClick={() => { onAddElement('contact_bar'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>شريط الاتصال ورقم الهاتف</span>
                  <span className="text-[10px] text-stone-400">📞</span>
                </button>

                <div className="px-3 py-1 text-[11px] font-black text-stone-400 border-b border-t border-stone-700/60 my-1">
                  نصوص وأشكال حرة
                </div>

                <button
                  onClick={() => { onAddElement('hero_title'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>عنوان رئيسي ترويجي</span>
                  <Type className="h-4 w-4 text-indigo-400" />
                </button>

                <button
                  onClick={() => { onAddElement('custom_text'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>نص مخصص / فقرة</span>
                  <Type className="h-4 w-4 text-stone-400" />
                </button>

                <button
                  onClick={() => { onAddElement('shape_rect'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>مستطيل / كرت خلفية</span>
                  <Square className="h-4 w-4 text-stone-400" />
                </button>

                <button
                  onClick={() => { onAddElement('shape_circle'); setIsAddMenuOpen(false); }}
                  className="w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>دائرة / شارة مستديرة</span>
                  <Circle className="h-4 w-4 text-stone-400" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Pen Tool Button */}
        <button
          onClick={() => setIsPenToolActive(prev => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all ${
            isPenToolActive
              ? 'bg-[#ff9f1c] text-stone-950 ring-2 ring-amber-300'
              : 'bg-stone-700 hover:bg-stone-600 text-stone-100 border border-stone-600'
          }`}
          title="أداة القلم لرسم المسارات الحرة والأشكال المتجهة (اختصار P)"
        >
          <PenTool className={`h-3.5 w-3.5 ${isPenToolActive ? 'text-stone-950 animate-pulse' : 'text-[#ff9f1c]'}`} />
          <span>أداة القلم (Pen)</span>
        </button>

        {/* Live Business Preview Switcher */}
        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1">
          <Store className="h-3.5 w-3.5 text-[#ff9f1c]" />
          <span className="text-[11px] font-bold text-stone-400">معاينة على محل:</span>
          <select
            value={selectedBusiness?.id || ''}
            onChange={(e) => {
              const b = businesses.find(item => item.id === e.target.value) || null;
              onSelectBusiness(b);
            }}
            className="bg-transparent text-white text-xs font-black outline-none cursor-pointer max-w-[140px] truncate"
            dir="rtl"
          >
            <option value="" className="bg-stone-800 text-stone-300">افتراضي (مطعم النخبة)</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id} className="bg-stone-800 text-white">
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Item Quick Actions */}
        {(selectedCount > 0 || Boolean(selectedElementId)) && (
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-xl px-2 py-1">
            {selectedCount > 1 && (
              <span className="text-[10px] font-black text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60 font-mono">
                {selectedCount} محدد
              </span>
            )}
            <button
              onClick={onDuplicateSelected}
              className="p-1 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={selectedCount > 1 ? `تكرار العناصر المحددة (${selectedCount}) (Ctrl+D)` : "تكرار العنصر (Duplicate)"}
            >
              <Copy className="h-3.5 w-3.5 text-sky-400" />
            </button>
            <button
              onClick={onDeleteSelected}
              className="p-1 hover:bg-red-900/50 text-red-400 hover:text-red-200 rounded-lg transition-colors cursor-pointer"
              title={selectedCount > 1 ? `حذف العناصر المحددة (${selectedCount}) (Delete)` : "حذف العنصر المحدد (Delete)"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Center: History & Zoom Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-xl p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canUndo ? 'text-stone-200 hover:bg-stone-700' : 'text-stone-600 cursor-not-allowed'
            }`}
            title="تراجع (Ctrl+Z)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canRedo ? 'text-stone-200 hover:bg-stone-700' : 'text-stone-600 cursor-not-allowed'
            }`}
            title="إعادة (Ctrl+Y)"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Grid, Snap, Guidelines & Rulers */}
        <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-xl p-0.5">
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              showGrid ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="إظهار / إخفاء شبكة التصميم"
          >
            <Grid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">الشبكة</span>
          </button>

          <button
            onClick={() => setSnapToGrid(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              snapToGrid ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="المحاذاة التلقائية المغناطيسية (Snap 1000%)"
          >
            <Magnet className="h-3.5 w-3.5" />
            <span>محاذاة Snap</span>
          </button>

          <button
            onClick={() => setShowGuidelines(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              showGuidelines ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="إظهار / إخفاء خطوط المحاذاة الذكية الديناميكية (Smart Guidelines)"
          >
            <span>الخطوط الإرشادية</span>
          </button>

          <button
            onClick={() => setShowRulers(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              showRulers ? 'bg-blue-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="إظهار / إخفاء المسطرة الأفقية والعمودية (Rulers)"
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>المسطرة</span>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-xl px-2 py-1">
          <button
            onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
            className="text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="تصغير"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-stone-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
            className="text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="تكبير"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(0.65)}
            className="text-[10px] text-stone-400 hover:text-[#ff9f1c] mr-1 underline cursor-pointer"
            title="ملاءمة الشاشة"
          >
            Fit
          </button>
        </div>

        {/* Full Screen Mode Toggle Button */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
              isFullscreen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/50'
                : 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-750'
            }`}
            title={isFullscreen ? 'تصغير الشاشة والخروج من وضع ملء الشاشة (Esc)' : 'ملء الشاشة بالكامل لمحرر البوسترات (Full Screen)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-amber-400" />
                <span>تصغير الشاشة</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-stone-300" />
                <span>شاشة كاملة</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right / End: Save & Export Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onSetAsDefault}
          className="inline-flex items-center gap-1.5 bg-stone-700 hover:bg-stone-600 text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-600"
          title="تعيين هذا التصميم كقالب البوستر الافتراضي لجميع محلات المنصة"
        >
          <FileCheck className="h-3.5 w-3.5 text-amber-400" />
          <span>تعيين كقالب افتراضي للنظام</span>
        </button>

        <button
          onClick={onSaveTemplate}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 bg-[#ff9f1c] hover:bg-amber-500 text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'جارِ الحفظ...' : 'حفظ القالب'}</span>
        </button>

        <button
          onClick={onExportPng}
          className="inline-flex items-center gap-1.5 bg-stone-700 hover:bg-stone-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-600"
          title="تصدير صورة بدقة 300DPI عالية الوضوح"
        >
          <Download className="h-3.5 w-3.5" />
          <span>تصدير PNG</span>
        </button>

        <button
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          <span>طباعة A4 🖨️</span>
        </button>
      </div>

    </div>
  );
};
