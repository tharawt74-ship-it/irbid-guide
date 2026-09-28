import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { 
  WheelBoxConfig, 
  WheelBoxElementId, 
  WheelBoxSuggestionSet, 
  DEFAULT_WHEEL_BOX_CONFIG,
  DEFAULT_ELEMENT_TRANSFORMS,
  WheelBoxElementTransform
} from '../../types';
import { BlurredVerticalTextScroller } from '../common/BlurredVerticalTextScroller';
import { 
  Sparkles, 
  Search, 
  Layers, 
  MoveUp, 
  MoveDown, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Smartphone, 
  Tablet,
  Monitor, 
  CheckCircle2, 
  Gauge, 
  Palette, 
  Lightbulb, 
  ArrowRight, 
  Disc,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Sliders,
  Move,
  Grid,
  Crosshair,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Copy,
  Undo2
} from 'lucide-react';

interface WheelBoxStudioProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SelectedTarget = 'box' | WheelBoxElementId;

const ELEMENT_METADATA: Record<WheelBoxElementId, { title: string; shortTitle: string; desc: string; icon: any; color: string; badgeColor: string }> = {
  promo: {
    title: 'النص والبادج الدعائي',
    shortTitle: 'البادج والعنوان',
    desc: 'البادج المضيء والعنوان الترويجي في أي موضع تختاره',
    icon: Sparkles,
    color: 'bg-amber-500/10 text-amber-600 border-amber-300',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  wheel: {
    title: 'كتلة العجلة ثلاثية الأبعاد 3D',
    shortTitle: 'كتلة العجلة 3D',
    desc: 'العجلة الدائرية الدوارة مع مؤشر السهم الأخضر والكلمات المتحركة ككتلة متكاملة',
    icon: Disc,
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  search: {
    title: 'شريط البحث الكبسولي',
    shortTitle: 'شريط البحث',
    desc: 'شريط البحث الدائري ذو الإطار الأنيق وزر السهم الدائري للبحث الفوري',
    icon: Search,
    color: 'bg-blue-500/10 text-blue-600 border-blue-300',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  suggestions: {
    title: 'المقترحات الثلاثية الدوارة (Pill Buttons)',
    shortTitle: 'المقترحات الثلاثية',
    desc: '3 أزرار كبسولية في صف واحد تتناوب تلقائياً وتتيح البحث المباشر السريع',
    icon: Lightbulb,
    color: 'bg-purple-500/10 text-purple-600 border-purple-300',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  }
};

const PRESET_WORD_PACKS = [
  {
    name: 'الافتراضي الشامل',
    items: [
      'دليل إربد التفاعلي',
      'أفضل مطاعم إربد',
      'كافيهات وجلسات هادئة',
      'أقوى العروض والخصومات',
      'سكنات جامعة اليرموك',
      'عيادات وخدمات طبية',
      'وظائف وشواغر فورية',
      'دليل المحلات الشامل',
      'سوق ومتاجر إربد',
      'جامعة التكنولوجيا',
      'أحدث عروض اليوم',
      'سكنات وأنشطة طلابية'
    ]
  },
  {
    name: 'المطاعم والكافيهات',
    items: [
      'شاورما وسناكات إربد',
      'كافيهات دراسية هادئة',
      'وجبات عائلية ومشاوي',
      'حلويات وكنافة نابلسية',
      'برغر ووجبات سريعة',
      'جلسات شبابية رايقة',
      'فطور بلدي وفلافل',
      'عصائر ومشروبات طازجة'
    ]
  },
  {
    name: 'الطلاب والجامعات',
    items: [
      'سكنات جامعة اليرموك',
      'جامعة التكنولوجيا',
      'شقق واستوديوهات',
      'مكتبات وتصوير وكتب',
      'كافيهات للدراسة',
      'مواصلات وخطوط إربد',
      'دورات وتدريب معتمد',
      'وظائف جزئية للطلاب'
    ]
  },
  {
    name: 'الصحة والخدمات',
    items: [
      'عيادات وأطباء اختصاص',
      'صيدليات ومختبرات',
      'مراكز طب الأسنان',
      'علاج طبيعي وتأهيل',
      'صالونات تجميل وعناية',
      'صيانة سيارات وميكانيك',
      'صيانة هواتف ولابتوب',
      'خدمات منزلية وحرفيين'
    ]
  }
];

export function WheelBoxStudio({ showToast }: WheelBoxStudioProps) {
  const { globalSettings, updateGlobalSettings } = useSystemSettings();

  const [config, setConfig] = useState<WheelBoxConfig>(() => {
    return {
      ...DEFAULT_WHEEL_BOX_CONFIG,
      ...(globalSettings?.wheelBoxConfig || {}),
      elementTransforms: {
        ...DEFAULT_ELEMENT_TRANSFORMS,
        ...(globalSettings?.wheelBoxConfig?.elementTransforms || {})
      }
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>('wheel');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'transform' | 'box_frame' | 'content'>('transform');
  const [viewMode, setViewMode] = useState<'canvas' | 'preview'>('canvas');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // Canvas State: Zoom & Pan & Tools
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<'select' | 'hand'>('select');
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [lockedElements, setLockedElements] = useState<Record<string, boolean>>({});

  // Dragging State for Canvas Items
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0
  });

  // Resizing State for Element or Box Frame
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{
    mouseX: number;
    mouseY: number;
    initialWidth: number;
    initialHeight: number;
    initialScale: number;
    initialScaleX: number;
    initialScaleY: number;
    target: SelectedTarget;
  }>({
    mouseX: 0,
    mouseY: 0,
    initialWidth: 780,
    initialHeight: 520,
    initialScale: 1,
    initialScaleX: 1,
    initialScaleY: 1,
    target: 'wheel'
  });

  const [newWordInput, setNewWordInput] = useState('');
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  // Sync settings when external context changes
  useEffect(() => {
    if (globalSettings?.wheelBoxConfig) {
      setConfig({
        ...DEFAULT_WHEEL_BOX_CONFIG,
        ...globalSettings.wheelBoxConfig,
        elementTransforms: {
          ...DEFAULT_ELEMENT_TRANSFORMS,
          ...(globalSettings.wheelBoxConfig.elementTransforms || {})
        }
      });
    }
  }, [globalSettings?.wheelBoxConfig]);

  // Helper for active element transform
  const getTransform = useCallback((id: WheelBoxElementId): WheelBoxElementTransform => {
    const tf = config.elementTransforms?.[id];
    return {
      x: tf?.x ?? 0,
      y: tf?.y ?? 0,
      scale: tf?.scale ?? 1,
      scaleX: tf?.scaleX ?? (tf?.scale ?? 1),
      scaleY: tf?.scaleY ?? (tf?.scale ?? 1),
      lockAspectRatio: tf?.lockAspectRatio ?? true,
      opacity: tf?.opacity ?? 1,
      zIndex: tf?.zIndex ?? 10,
      width: tf?.width
    };
  }, [config.elementTransforms]);

  // Update a single element transform
  const updateElementTransform = useCallback((id: WheelBoxElementId, updates: Partial<WheelBoxElementTransform>) => {
    setConfig(prev => {
      const current = prev.elementTransforms?.[id] || DEFAULT_ELEMENT_TRANSFORMS[id];
      const updated: WheelBoxElementTransform = {
        ...current,
        ...updates
      };

      // If lockAspectRatio is enabled and scale is modified, keep scaleX & scaleY synced
      if (updated.lockAspectRatio && updates.scale !== undefined) {
        updated.scaleX = updates.scale;
        updated.scaleY = updates.scale;
      }

      return {
        ...prev,
        elementTransforms: {
          ...prev.elementTransforms,
          [id]: updated
        }
      };
    });
  }, []);

  // Update box container frame property
  const updateBoxFrame = useCallback((updates: Partial<WheelBoxConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Layer Ordering Handlers
  const handleMoveElement = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.elementsOrder.length) return;

    const newOrder = [...config.elementsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setConfig(prev => ({ ...prev, elementsOrder: newOrder }));
    showToast(`تم تحريك (${ELEMENT_METADATA[temp].shortTitle}) إلى الترتيب ${targetIndex + 1}`, 'info');
  };

  const handleToggleVisibility = (elementId: WheelBoxElementId) => {
    setConfig(prev => {
      switch (elementId) {
        case 'promo': return { ...prev, showPromo: !prev.showPromo };
        case 'wheel': return { ...prev, showWheel: !prev.showWheel };
        case 'search': return { ...prev, showSearch: !prev.showSearch };
        case 'suggestions': return { ...prev, showSuggestions: !prev.showSuggestions };
        default: return prev;
      }
    });
  };

  const getElementVisibility = (elementId: WheelBoxElementId): boolean => {
    switch (elementId) {
      case 'promo': return config.showPromo;
      case 'wheel': return config.showWheel;
      case 'search': return config.showSearch;
      case 'suggestions': return config.showSuggestions;
      default: return true;
    }
  };

  const handleToggleLock = (id: string) => {
    setLockedElements(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Keyboard Shortcuts: Arrow Key Nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTarget || selectedTarget === 'box') return;
      if (lockedElements[selectedTarget]) return;
      
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (isInput) return;

      const step = e.shiftKey ? 10 : 1;
      const tf = getTransform(selectedTarget);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateElementTransform(selectedTarget, { x: tf.x + step });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateElementTransform(selectedTarget, { x: tf.x - step });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateElementTransform(selectedTarget, { y: tf.y - step });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateElementTransform(selectedTarget, { y: tf.y + step });
      } else if (e.key === 'Escape') {
        setSelectedTarget('box');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTarget, lockedElements, getTransform, updateElementTransform]);

  // Dragging Element on Canvas
  const handleStartDragElement = (e: React.MouseEvent, id: WheelBoxElementId) => {
    if (activeTool === 'hand' || lockedElements[id]) return;
    e.stopPropagation();
    setSelectedTarget(id);
    setActiveInspectorTab('transform');

    const tf = getTransform(id);
    setIsDraggingElement(true);
    setDragStartPos({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: tf.x,
      initialY: tf.y
    });
  };

  // Resizing Handle Start
  const handleStartResize = (e: React.MouseEvent, handle: string, target: SelectedTarget) => {
    e.stopPropagation();
    setIsResizing(true);
    setActiveResizeHandle(handle);

    if (target === 'box') {
      setResizeStartData({
        mouseX: e.clientX,
        mouseY: e.clientY,
        initialWidth: config.containerWidth || 780,
        initialHeight: config.containerHeight || 520,
        initialScale: config.boxScale || 1,
        initialScaleX: 1,
        initialScaleY: 1,
        target: 'box'
      });
    } else {
      const tf = getTransform(target);
      setResizeStartData({
        mouseX: e.clientX,
        mouseY: e.clientY,
        initialWidth: tf.width || 600,
        initialHeight: 200,
        initialScale: tf.scale,
        initialScaleX: tf.scaleX || tf.scale,
        initialScaleY: tf.scaleY || tf.scale,
        target
      });
    }
  };

  // Global Mouse Move & Up for Canvas Drag, Pan & Resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Panning Canvas
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
        return;
      }

      // 2. Dragging Element (X, Y)
      if (isDraggingElement && selectedTarget && selectedTarget !== 'box') {
        const deltaX = (e.clientX - dragStartPos.mouseX) / zoomLevel;
        const deltaY = (e.clientY - dragStartPos.mouseY) / zoomLevel;
        
        let newX = Math.round(dragStartPos.initialX + deltaX);
        let newY = Math.round(dragStartPos.initialY + deltaY);

        // Snap to center guideline if near 0
        if (Math.abs(newX) < 4) newX = 0;
        if (Math.abs(newY) < 4) newY = 0;

        updateElementTransform(selectedTarget, { x: newX, y: newY });
        return;
      }

      // 3. Resizing Handles
      if (isResizing && activeResizeHandle) {
        const deltaX = (e.clientX - resizeStartData.mouseX) / zoomLevel;
        const deltaY = (e.clientY - resizeStartData.mouseY) / zoomLevel;

        if (resizeStartData.target === 'box') {
          const isProportional = config.lockBoxAspectRatio;
          let newW = resizeStartData.initialWidth;
          let newH = resizeStartData.initialHeight;

          if (activeResizeHandle.includes('e')) newW += deltaX * 2;
          if (activeResizeHandle.includes('w')) newW -= deltaX * 2;
          if (activeResizeHandle.includes('s')) newH += deltaY * 2;
          if (activeResizeHandle.includes('n')) newH -= deltaY * 2;

          newW = Math.max(480, Math.min(1300, Math.round(newW)));
          newH = Math.max(300, Math.min(900, Math.round(newH)));

          if (isProportional) {
            const aspect = resizeStartData.initialWidth / resizeStartData.initialHeight;
            newH = Math.round(newW / aspect);
          }

          updateBoxFrame({ containerWidth: newW, containerHeight: newH });
        } else {
          // Element Resizing / Scaling
          const tf = getTransform(resizeStartData.target);
          const isLocked = tf.lockAspectRatio;

          let scaleChangeX = deltaX / 250;
          let scaleChangeY = deltaY / 250;

          if (activeResizeHandle.includes('w')) scaleChangeX = -scaleChangeX;
          if (activeResizeHandle.includes('n')) scaleChangeY = -scaleChangeY;

          if (isLocked) {
            // Proportional Scale
            const dominantChange = Math.abs(scaleChangeX) > Math.abs(scaleChangeY) ? scaleChangeX : scaleChangeY;
            const newScale = Math.max(0.4, Math.min(2.5, Number((resizeStartData.initialScale + dominantChange).toFixed(2))));
            updateElementTransform(resizeStartData.target, {
              scale: newScale,
              scaleX: newScale,
              scaleY: newScale
            });
          } else {
            // Freeform Non-Uniform Scale
            const newScaleX = Math.max(0.4, Math.min(2.5, Number((resizeStartData.initialScaleX + scaleChangeX).toFixed(2))));
            const newScaleY = Math.max(0.4, Math.min(2.5, Number((resizeStartData.initialScaleY + scaleChangeY).toFixed(2))));
            updateElementTransform(resizeStartData.target, {
              scaleX: newScaleX,
              scaleY: newScaleY,
              scale: (newScaleX + newScaleY) / 2
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setIsDraggingElement(false);
      setIsResizing(false);
      setActiveResizeHandle(null);
    };

    if (isPanning || isDraggingElement || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isDraggingElement, isResizing, panStart, dragStartPos, resizeStartData, activeResizeHandle, selectedTarget, zoomLevel, config.lockBoxAspectRatio, getTransform, updateElementTransform, updateBoxFrame]);

  // Pan Start
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' || e.button === 1 || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
    } else {
      // Clicked blank canvas -> select Box Container
      setSelectedTarget('box');
      setActiveInspectorTab('box_frame');
    }
  };

  // Words management
  const handleAddWord = () => {
    const trimmed = newWordInput.trim();
    if (!trimmed) return;
    if (config.wheelItems.includes(trimmed)) {
      showToast('هذه العبارة موجودة بالفعل في العجلة', 'error');
      return;
    }
    setConfig(prev => ({
      ...prev,
      wheelItems: [...prev.wheelItems, trimmed]
    }));
    setNewWordInput('');
    showToast(`تمت إضافة "${trimmed}" إلى العجلة 🎡`);
  };

  const handleRemoveWord = (index: number) => {
    if (config.wheelItems.length <= 3) {
      showToast('يجب أن تحتوي العجلة على 3 عبارات على الأقل للدوران السلس', 'error');
      return;
    }
    setConfig(prev => ({
      ...prev,
      wheelItems: prev.wheelItems.filter((_, i) => i !== index)
    }));
  };

  const handleApplyWordPack = (items: string[], packName: string) => {
    setConfig(prev => ({ ...prev, wheelItems: items }));
    showToast(`تم تطبيق باقة كلمات: ${packName} 🎯`, 'success');
  };

  // Save Settings to Firebase
  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    try {
      const updatedGlobal = {
        ...(globalSettings || {}),
        heroSectionStyle: 'wheel_box' as const,
        wheelBoxConfig: config
      };
      await updateGlobalSettings(updatedGlobal as any);
      showToast('تم حفظ كافة إعدادات وأبعاد ومواقع عناصر بوكس العجلة 3D بنجاح وتطبيقها مباشرة! 🎉', 'success');
    } catch (err) {
      console.error('Error saving wheel box config:', err);
      showToast('حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('هل أنت متأكد من استعادة كافة الأبعاد والمواقع والإعدادات الأصلية لبوكس العجلة 3D؟')) {
      setConfig(DEFAULT_WHEEL_BOX_CONFIG);
      setSelectedTarget('box');
      showToast('تمت استعادة الإعدادات الافتراضية بنجاح 🔄');
    }
  };

  // Reset selected element transform to origin (0, 0, scale 1)
  const handleResetElementTransform = (id: WheelBoxElementId) => {
    updateElementTransform(id, {
      x: 0,
      y: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      lockAspectRatio: true
    });
    showToast(`تمت إعادة ضبط موقع وتحويلات (${ELEMENT_METADATA[id].shortTitle}) إلى المنتصف (0, 0)`, 'info');
  };

  // Bounding box handle renderer for Figma interaction
  const renderResizeHandles = (target: SelectedTarget) => {
    const isLocked = target !== 'box' && lockedElements[target];
    if (isLocked) return null;

    const handles = [
      { id: 'nw', pos: '-top-1.5 -left-1.5 cursor-nwse-resize' },
      { id: 'n', pos: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
      { id: 'ne', pos: '-top-1.5 -right-1.5 cursor-nesw-resize' },
      { id: 'e', pos: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize' },
      { id: 'se', pos: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
      { id: 's', pos: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
      { id: 'sw', pos: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
      { id: 'w', pos: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize' }
    ];

    return (
      <>
        {handles.map(h => (
          <div
            key={h.id}
            onMouseDown={(e) => handleStartResize(e, h.id, target)}
            className={`absolute w-3 h-3 bg-white border-2 border-emerald-600 rounded-xs shadow-xs z-50 hover:bg-emerald-600 hover:scale-125 transition-transform ${h.pos}`}
          />
        ))}
      </>
    );
  };

  const currentBoxW = config.containerWidth || 780;
  const currentBoxH = config.containerHeight || 520;
  const selectedTf = (selectedTarget && selectedTarget !== 'box') ? getTransform(selectedTarget) : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 select-none">
      
      {/* FIGMA TOP BAR & QUICK WORKSPACE CONTROLS */}
      <div className="bg-stone-900 text-stone-100 p-3 sm:p-4 rounded-3xl border border-stone-800 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left Brand & Mode Switcher */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-stone-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Disc className="h-5 w-5 animate-[spin_8s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">استوديو ومحرر بوكس العجلة 3D (Figma Canvas Studio)</h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Visual Frame Editor
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-medium">
                تحكم كامل بالسحب والتحريك الحر وفريمات تغيير الحجم والحفاظ على الأبعاد.
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Canvas Studio vs Live Simulator */}
          <div className="flex items-center bg-stone-800 p-1 rounded-2xl border border-stone-700">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'canvas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>محرر الكانفاس (Figma)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>معاينة الأجهزة الحية</span>
            </button>
          </div>
        </div>

        {/* Center Canvas Tools (Select, Pan, Zoom, Grid, Lock Aspect) */}
        {viewMode === 'canvas' && (
          <div className="flex items-center gap-2 bg-stone-800/90 p-1.5 rounded-2xl border border-stone-700">
            {/* Select Tool (V) */}
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'select' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
              title="أداة التحديد والتحريك (V)"
            >
              <MousePointer className="h-4 w-4" />
            </button>

            {/* Hand / Pan Tool (H) */}
            <button
              type="button"
              onClick={() => setActiveTool('hand')}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'hand' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
              title="أداة تحريك اللوحة والكانفاس (H)"
            >
              <Hand className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-stone-700 mx-1" />

            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
              title="تصغير Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <span className="text-xs font-mono font-bold text-emerald-400 px-1 min-w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(1.8, Number((prev + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
              title="تكبير Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            {/* Reset Zoom & Pan */}
            <button
              type="button"
              onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer text-[10px] font-bold"
              title="إعادة ضبط الرؤية 100%"
            >
              100%
            </button>

            <div className="h-4 w-px bg-stone-700 mx-1" />

            {/* Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showGrid ? 'text-emerald-400 bg-emerald-500/15' : 'text-stone-500 hover:text-stone-300'
              }`}
              title={showGrid ? 'إخفاء شبكة النقاط' : 'إظهار شبكة النقاط (Figma Grid)'}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Right Actions: Reset & Save */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAllSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات ونشرها 🚀'}</span>
          </button>
        </div>
      </div>

      {/* MAIN FIGMA 3-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: FIGMA LAYERS & HIERARCHY TREE (3 COLS ON LG)    */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 bg-white p-4 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
          
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#1a4d2e]" />
              <h3 className="font-black text-stone-900 text-xs">الطبقات والعناصر (Layers)</h3>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              {config.elementsOrder.length + 1} عناصر
            </span>
          </div>

          {/* Root Canvas Box Frame Layer Item */}
          <div
            onClick={() => {
              setSelectedTarget('box');
              setActiveInspectorTab('box_frame');
            }}
            className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
              selectedTarget === 'box'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-[#1a4d2e]'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-stone-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                🔲
              </div>
              <div className="truncate">
                <span className="text-xs font-black block truncate">إطار البوكس الرئيسي (Canvas Frame)</span>
                <span className="text-[10px] text-stone-400 font-mono block">
                  {currentBoxW} × {currentBoxH}px {config.lockBoxAspectRatio ? '🔒' : '🔓'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateBoxFrame({ lockBoxAspectRatio: !config.lockBoxAspectRatio });
                }}
                className="p-1 rounded-md text-stone-400 hover:text-stone-800 transition-colors"
                title={config.lockBoxAspectRatio ? 'إلغاء قفل الأبعاد' : 'قفل نسبة الأبعاد'}
              >
                {config.lockBoxAspectRatio ? <Lock className="h-3.5 w-3.5 text-emerald-600" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Child Layers Tree (Interactive Elements) */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-stone-400 block px-1">عناصر المحتوى الداخلي:</span>
            
            {config.elementsOrder.map((elementId, index) => {
              const meta = ELEMENT_METADATA[elementId];
              const Icon = meta.icon;
              const isSelected = selectedTarget === elementId;
              const isVisible = getElementVisibility(elementId);
              const isLocked = !!lockedElements[elementId];
              const tf = getTransform(elementId);
              const isFirst = index === 0;
              const isLast = index === config.elementsOrder.length - 1;

              return (
                <div
                  key={elementId}
                  onClick={() => {
                    setSelectedTarget(elementId);
                    setActiveInspectorTab('transform');
                  }}
                  className={`flex items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-stone-900'
                      : isVisible
                      ? 'bg-white border-stone-200 hover:border-stone-300 text-stone-800'
                      : 'bg-stone-100 border-stone-200/50 opacity-50 text-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${meta.color} shrink-0`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">{meta.shortTitle}</span>
                        {!isVisible && (
                          <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">مخفي</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono">
                        <span>X:{tf.x}</span>
                        <span>Y:{tf.y}</span>
                        <span>{Math.round(tf.scale * 100)}%</span>
                        <span>{tf.lockAspectRatio ? '🔒' : '🔓'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Layer Quick Actions */}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Up */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveElement(index, 'up')}
                      className="p-1 text-stone-400 hover:text-stone-900 disabled:opacity-20 cursor-pointer"
                      title="تحريك لأعلى"
                    >
                      <MoveUp className="h-3 w-3" />
                    </button>
                    {/* Down */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveElement(index, 'down')}
                      className="p-1 text-stone-400 hover:text-stone-900 disabled:opacity-20 cursor-pointer"
                      title="تحريك لأسفل"
                    >
                      <MoveDown className="h-3 w-3" />
                    </button>
                    {/* Lock */}
                    <button
                      type="button"
                      onClick={() => handleToggleLock(elementId)}
                      className={`p-1 transition-colors cursor-pointer ${isLocked ? 'text-amber-600' : 'text-stone-400 hover:text-stone-800'}`}
                      title={isLocked ? 'إلغاء قفل التحريك' : 'قفل العنصر ضد السحب'}
                    >
                      {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </button>
                    {/* Visibility */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(elementId)}
                      className={`p-1 transition-colors cursor-pointer ${isVisible ? 'text-stone-400 hover:text-stone-800' : 'text-red-500'}`}
                      title={isVisible ? 'إخفاء' : 'إظهار'}
                    >
                      {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Preset Layout Models */}
          <div className="pt-3 border-t border-stone-100 space-y-2">
            <span className="text-[10px] font-extrabold text-stone-500 block">نماذج ترتيب سريعة:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, elementsOrder: ['promo', 'wheel', 'search', 'suggestions'] }))}
                className="p-1.5 text-[11px] font-bold bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-xl transition-all text-center"
              >
                كلاسيكي متوازن
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, elementsOrder: ['wheel', 'search', 'suggestions', 'promo'] }))}
                className="p-1.5 text-[11px] font-bold bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-xl transition-all text-center"
              >
                العجلة في القمة
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, elementsOrder: ['search', 'suggestions', 'wheel', 'promo'] }))}
                className="p-1.5 text-[11px] font-bold bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-xl transition-all text-center"
              >
                البحث أولاً
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, elementsOrder: ['promo', 'search', 'wheel', 'suggestions'] }))}
                className="p-1.5 text-[11px] font-bold bg-stone-50 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-xl transition-all text-center"
              >
                البحث بينهما
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CENTER COLUMN: FIGMA INTERACTIVE CANVAS / SIMULATOR (6 COLS) */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-3">
          
          {viewMode === 'canvas' ? (
            /* FIGMA INFINITE CANVAS VIEWPORT */
            <div 
              ref={canvasViewportRef}
              onMouseDown={handleCanvasMouseDown}
              style={{
                backgroundImage: showGrid 
                  ? 'radial-gradient(#d1d5db 1.2px, transparent 1.2px)' 
                  : undefined,
                backgroundSize: showGrid ? '20px 20px' : undefined
              }}
              className={`relative bg-[#f4f4f2] w-full min-h-[580px] rounded-3xl border border-stone-300/80 overflow-hidden shadow-inner flex items-center justify-center select-none ${
                activeTool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              }`}
            >
              {/* Canvas Coordinate / Status Badge */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-stone-900/85 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1.5 rounded-full shadow-md border border-stone-700 pointer-events-none">
                <Crosshair className="h-3 w-3 text-emerald-400 animate-pulse" />
                <span>Target: {selectedTarget === 'box' ? 'Canvas Frame (البوكس)' : ELEMENT_METADATA[selectedTarget as WheelBoxElementId]?.shortTitle}</span>
                <span>•</span>
                <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
              </div>

              {/* Scalable & Pannable Artboard Container */}
              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.05s ease-out'
                }}
                className="relative flex flex-col items-center justify-center p-8 shrink-0"
              >
                {/* Center Snap Guidelines (Visual Figma Snap) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-px bg-emerald-500/20 dashed" />
                  <div className="h-full w-px bg-emerald-500/20 dashed absolute" />
                </div>

                {/* THE MAIN WHEEL BOX CANVAS FRAME */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTarget('box');
                    setActiveInspectorTab('box_frame');
                  }}
                  style={{
                    width: `${currentBoxW}px`,
                    minHeight: `${currentBoxH}px`,
                    borderRadius: config.borderRadius ? `${config.borderRadius}px` : '32px',
                    padding: config.boxPadding ? `${config.boxPadding}px` : '24px',
                    border: (config.boxBorderWidth && config.boxBorderWidth > 0)
                      ? `${config.boxBorderWidth}px solid ${config.boxBorderColor || '#e5e1da'}`
                      : '2px dashed rgba(26, 77, 46, 0.25)',
                    backgroundColor: config.backgroundMode === 'dark' 
                      ? '#09090b' 
                      : config.backgroundMode === 'glass' 
                      ? 'rgba(255,255,255,0.65)' 
                      : config.backgroundMode === 'emerald_glow'
                      ? 'rgba(16, 185, 129, 0.06)'
                      : 'transparent',
                    boxShadow: selectedTarget === 'box' 
                      ? '0 0 0 2px #10b981, 0 20px 40px -15px rgba(0,0,0,0.15)' 
                      : '0 10px 30px -10px rgba(0,0,0,0.08)'
                  }}
                  className={`relative flex flex-col items-center justify-center transition-shadow duration-150 ${
                    selectedTarget === 'box' ? 'ring-2 ring-emerald-500 ring-offset-4 ring-offset-stone-200' : ''
                  }`}
                >
                  {/* Bounding Box Resizers for Box Container */}
                  {selectedTarget === 'box' && renderResizeHandles('box')}

                  {/* Frame Dimension Tag */}
                  {selectedTarget === 'box' && (
                    <div className="absolute -top-7 right-4 bg-emerald-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-xs z-40 pointer-events-none">
                      W: {currentBoxW}px × H: {currentBoxH}px {config.lockBoxAspectRatio ? '🔒 Locked' : '🔓 Free'}
                    </div>
                  )}

                  {/* RENDER CANVAS CHILD ELEMENTS WITH LIVE FIGMA TRANSFORM BOX */}
                  {config.elementsOrder.map((elementId) => {
                    const isSelected = selectedTarget === elementId;
                    const isVisible = getElementVisibility(elementId);
                    const isLocked = !!lockedElements[elementId];
                    const tf = getTransform(elementId);
                    const meta = ELEMENT_METADATA[elementId];

                    if (!isVisible) return null;

                    return (
                      <div
                        key={elementId}
                        onMouseDown={(e) => handleStartDragElement(e, elementId)}
                        style={{
                          transform: `translate3d(${tf.x}px, ${tf.y}px, 0) scale(${tf.scaleX || tf.scale}, ${tf.scaleY || tf.scale})`,
                          opacity: tf.opacity ?? 1,
                          zIndex: isSelected ? 40 : (tf.zIndex ?? 10),
                          cursor: isLocked ? 'not-allowed' : (activeTool === 'select' ? 'move' : 'default')
                        }}
                        className={`relative my-2 ${
                          elementId === 'wheel' ? 'w-full sm:w-[160%] sm:max-w-none' : 'w-full'
                        } flex items-center justify-center transition-transform duration-75 group ${
                          isSelected 
                            ? 'ring-2 ring-emerald-500 rounded-2xl ring-offset-2' 
                            : 'hover:ring-1 hover:ring-emerald-400/60 rounded-xl'
                        }`}
                      >
                        {/* 8-point Figma Transform Handles when Selected */}
                        {isSelected && renderResizeHandles(elementId)}

                        {/* Coordinate & Sizing Readout Badge */}
                        {isSelected && (
                          <div className="absolute -top-6 right-2 bg-stone-900 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-md z-50 flex items-center gap-1 pointer-events-none">
                            <span className="text-emerald-400">{meta.shortTitle}</span>
                            <span>|</span>
                            <span>X:{tf.x} Y:{tf.y}</span>
                            <span>|</span>
                            <span>{Math.round((tf.scaleX || tf.scale) * 100)}%</span>
                            <span>{tf.lockAspectRatio ? '🔒' : '🔓'}</span>
                          </div>
                        )}

                        {/* ELEMENT CONTENT RENDER (REAL LIVE ANIMATION PRESERVED) */}
                        {elementId === 'promo' && (
                          <div className="flex flex-col items-center justify-center text-center w-full px-2 pointer-events-none">
                            {config.promoBadge && (
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a4d2e]/10 border border-[#1a4d2e]/20 text-xs sm:text-sm font-extrabold text-[#1a4d2e] mb-1.5 shadow-xs">
                                <Sparkles className="w-3.5 h-3.5 text-[#1a4d2e]" />
                                <span>{config.promoBadge}</span>
                              </div>
                            )}
                            {config.promoHeading && (
                              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight leading-tight max-w-2xl text-center">
                                {config.promoHeading}
                              </h2>
                            )}
                          </div>
                        )}

                        {elementId === 'wheel' && (
                          <div className="relative w-full flex items-center justify-center py-2 pointer-events-none overflow-visible">
                            {/* Live Wheel Component Frame */}
                            <div className="w-full pointer-events-auto overflow-visible">
                              <BlurredVerticalTextScroller
                                config={{
                                  ...config,
                                  showPromo: false,
                                  showSearch: false,
                                  showSuggestions: false
                                }}
                                className="!py-0 !border-none !shadow-none !bg-transparent"
                              />
                            </div>
                          </div>
                        )}

                        {elementId === 'search' && (
                          <div className="w-full max-w-xl mx-auto pointer-events-none">
                            <div className="relative flex items-center bg-white/85 border-2 border-stone-900 rounded-full p-2 shadow-xl backdrop-blur-md">
                              <input
                                type="text"
                                readOnly
                                value=""
                                placeholder={config.searchPlaceholder}
                                className="flex-1 bg-transparent border-none text-stone-900 placeholder-stone-500 px-6 text-base font-bold text-right"
                                dir="rtl"
                              />
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-900 text-white shrink-0 shadow-md">
                                <ArrowRight className="w-6 h-6 text-white stroke-[2.5] rotate-180" />
                              </div>
                            </div>
                          </div>
                        )}

                        {elementId === 'suggestions' && (
                          <div className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 px-1 flex-nowrap pointer-events-none">
                            {(config.suggestionSets[0]?.items || []).map((sug, idx) => (
                              <div
                                key={idx}
                                className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-white/90 border border-stone-300 text-stone-800 shadow-xs truncate"
                              >
                                <span className="truncate">{sug.label}</span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}

                </div>
              </div>
            </div>
          ) : (
            /* LIVE DEVICE SIMULATOR VIEW */
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center justify-between">
                <span className="text-xs font-black text-stone-800">محاكي الأجهزة الحية والتجاوب:</span>
                <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewDevice === 'desktop' ? 'bg-white text-[#1a4d2e] shadow-xs' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>كمبيوتر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('tablet')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewDevice === 'tablet' ? 'bg-white text-[#1a4d2e] shadow-xs' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    <Tablet className="h-3.5 w-3.5" />
                    <span>تابلت</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewDevice === 'mobile' ? 'bg-white text-[#1a4d2e] shadow-xs' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>هاتف</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#fbfbf9] p-4 rounded-3xl border border-stone-200 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[500px]">
                <div className={`w-full transition-all duration-300 ${
                  previewDevice === 'mobile' 
                    ? 'max-w-[360px] border-4 border-stone-800 rounded-[38px] bg-white shadow-2xl p-1 overflow-hidden' 
                    : previewDevice === 'tablet'
                    ? 'max-w-[680px] border-4 border-stone-700 rounded-[28px] bg-white shadow-xl p-2 overflow-hidden'
                    : 'max-w-full'
                }`}>
                  <BlurredVerticalTextScroller
                    config={config}
                    className="my-0"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Canvas Helper Quick Bar */}
          <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between text-[11px] text-stone-600 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1a4d2e]">💡 نصيحة Figma:</span>
              <span>انقر على أي عنصر لتحديده وتحريكه بالسحب، أو استخدم مقابض الزوايا لتغيير الحجم.</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="bg-white px-1.5 py-0.5 rounded border border-stone-300">Shift + Drag: سريع</span>
              <span className="bg-white px-1.5 py-0.5 rounded border border-stone-300">Arrows: تحريك 1px</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: FIGMA PROPERTIES & PHYSICS INSPECTOR (3 COLS)  */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 bg-white p-4 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
          
          {/* Inspector Tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 gap-0.5">
            <button
              type="button"
              onClick={() => setActiveInspectorTab('transform')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                activeInspectorTab === 'transform' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              الموقع والأبعاد
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('box_frame')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                activeInspectorTab === 'box_frame' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              إطار الصندوق
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('content')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                activeInspectorTab === 'content' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              المحتوى
            </button>
          </div>

          {/* TAB 1: TRANSFORM & POSITION INSPECTOR */}
          {activeInspectorTab === 'transform' && selectedTarget && selectedTarget !== 'box' && (
            <div className="space-y-4">
              
              {/* Selected Element Header */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">العنصر المحدد حالياً:</span>
                  <h4 className="text-xs font-black text-stone-900">{ELEMENT_METADATA[selectedTarget].title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleResetElementTransform(selectedTarget)}
                  className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="إعادة التمركز للأصل (0, 0)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Coordinates X & Y */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-stone-700 block">الإحداثيات والموضع (Position):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-bold">
                      <span>محور X (أفقي)</span>
                      <span className="font-mono font-bold text-stone-800">{selectedTf?.x}px</span>
                    </div>
                    <input
                      type="number"
                      value={selectedTf?.x ?? 0}
                      onChange={(e) => updateElementTransform(selectedTarget, { x: Number(e.target.value) })}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                    />
                    <div className="flex items-center justify-between pt-1 gap-1">
                      <button
                        type="button"
                        onClick={() => updateElementTransform(selectedTarget, { x: (selectedTf?.x ?? 0) - 5 })}
                        className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-0.5 rounded text-[10px] font-bold"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementTransform(selectedTarget, { x: 0 })}
                        className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-0.5 rounded text-[10px] font-bold"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementTransform(selectedTarget, { x: (selectedTf?.x ?? 0) + 5 })}
                        className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-0.5 rounded text-[10px] font-bold"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-bold">
                      <span>محور Y (عمودي)</span>
                      <span className="font-mono font-bold text-stone-800">{selectedTf?.y}px</span>
                    </div>
                    <input
                      type="number"
                      value={selectedTf?.y ?? 0}
                      onChange={(e) => updateElementTransform(selectedTarget, { y: Number(e.target.value) })}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                    />
                    <div className="flex items-center justify-between pt-1 gap-1">
                      <button
                        type="button"
                        onClick={() => updateElementTransform(selectedTarget, { y: (selectedTf?.y ?? 0) - 5 })}
                        className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-0.5 rounded text-[10px] font-bold"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementTransform(selectedTarget, { y: 0 })}
                        className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-0.5 rounded text-[10px] font-bold"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementTransform(selectedTarget, { y: (selectedTf?.y ?? 0) + 5 })}
                        className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-0.5 rounded text-[10px] font-bold"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sizing & Aspect Ratio Lock */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-700">تغيير الحجم والتكبير (Scale):</span>
                  {/* Aspect Ratio Mode Switcher */}
                  <button
                    type="button"
                    onClick={() => updateElementTransform(selectedTarget, { lockAspectRatio: !selectedTf?.lockAspectRatio })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      selectedTf?.lockAspectRatio 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {selectedTf?.lockAspectRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{selectedTf?.lockAspectRatio ? 'الحفاظ على الأبعاد (متناسب)' : 'تغيير حر (Freeform X/Y)'}</span>
                  </button>
                </div>

                {selectedTf?.lockAspectRatio ? (
                  /* Uniform Proportional Scale Slider */
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600 font-bold">نسبة الحجم الكلي:</span>
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {Math.round((selectedTf?.scale ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.2"
                      step="0.05"
                      value={selectedTf?.scale ?? 1}
                      onChange={(e) => updateElementTransform(selectedTarget, { scale: Number(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                ) : (
                  /* Freeform Scale X & Scale Y Sliders */
                  <div className="space-y-2">
                    <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-600">العرض الأفقي (Scale X):</span>
                        <span className="font-mono text-emerald-700 font-black">{Math.round((selectedTf?.scaleX ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="2.2"
                        step="0.05"
                        value={selectedTf?.scaleX ?? 1}
                        onChange={(e) => updateElementTransform(selectedTarget, { scaleX: Number(e.target.value) })}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                    <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-600">الارتفاع الرأسي (Scale Y):</span>
                        <span className="font-mono text-emerald-700 font-black">{Math.round((selectedTf?.scaleY ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="2.2"
                        step="0.05"
                        value={selectedTf?.scaleY ?? 1}
                        onChange={(e) => updateElementTransform(selectedTarget, { scaleY: Number(e.target.value) })}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Opacity & Quick Alignment */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600 font-bold">الشفافية (Opacity):</span>
                    <span className="font-mono font-bold text-stone-800">{Math.round((selectedTf?.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={selectedTf?.opacity ?? 1}
                    onChange={(e) => updateElementTransform(selectedTarget, { opacity: Number(e.target.value) })}
                    className="w-full accent-stone-800 cursor-pointer"
                  />
                </div>

                {/* Quick Align Buttons */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-500">محاذاة سريعة للمنتصف:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateElementTransform(selectedTarget, { x: 0 })}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-800 text-center"
                    >
                      توسيط أفقي
                    </button>
                    <button
                      type="button"
                      onClick={() => updateElementTransform(selectedTarget, { y: 0 })}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-800 text-center"
                    >
                      توسيط رأسي
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetElementTransform(selectedTarget)}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold text-center"
                    >
                      الأصل (0,0)
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BOX CONTAINER FRAME INSPECTOR */}
          {activeInspectorTab === 'box_frame' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black text-stone-900">أبعاد وهندسة الصندوق الرئيسي (Box Frame)</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">التحكم في عرض وارتفاع وانحناء وتوهج البوكس التفاعلي.</p>
              </div>

              {/* Box Width & Height */}
              <div className="space-y-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">الأبعاد (W × H):</span>
                  <button
                    type="button"
                    onClick={() => updateBoxFrame({ lockBoxAspectRatio: !config.lockBoxAspectRatio })}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      config.lockBoxAspectRatio ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {config.lockBoxAspectRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{config.lockBoxAspectRatio ? 'مقفل 🔒' : 'حر 🔓'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-500 font-bold mb-1">
                      <span>عرض الصندوق (Width)</span>
                      <span className="font-mono text-stone-800 font-bold">{currentBoxW}px</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="1200"
                      step="10"
                      value={currentBoxW}
                      onChange={(e) => {
                        const newW = Number(e.target.value);
                        if (config.lockBoxAspectRatio) {
                          const aspect = currentBoxW / currentBoxH;
                          updateBoxFrame({ containerWidth: newW, containerHeight: Math.round(newW / aspect) });
                        } else {
                          updateBoxFrame({ containerWidth: newW });
                        }
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-stone-500 font-bold mb-1">
                      <span>ارتفاع الصندوق (Height)</span>
                      <span className="font-mono text-stone-800 font-bold">{currentBoxH}px</span>
                    </div>
                    <input
                      type="range"
                      min="350"
                      max="850"
                      step="10"
                      value={currentBoxH}
                      onChange={(e) => {
                        const newH = Number(e.target.value);
                        if (config.lockBoxAspectRatio) {
                          const aspect = currentBoxW / currentBoxH;
                          updateBoxFrame({ containerHeight: newH, containerWidth: Math.round(newH * aspect) });
                        } else {
                          updateBoxFrame({ containerHeight: newH });
                        }
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Corner Radius & Padding */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-500 font-bold">
                    <span>انحناء الزوايا</span>
                    <span className="font-mono text-stone-800">{config.borderRadius ?? 32}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="64"
                    step="4"
                    value={config.borderRadius ?? 32}
                    onChange={(e) => updateBoxFrame({ borderRadius: Number(e.target.value) })}
                    className="w-full accent-[#1a4d2e] cursor-pointer"
                  />
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-500 font-bold">
                    <span>الهامش الداخلي</span>
                    <span className="font-mono text-stone-800">{config.boxPadding ?? 24}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="4"
                    value={config.boxPadding ?? 24}
                    onChange={(e) => updateBoxFrame({ boxPadding: Number(e.target.value) })}
                    className="w-full accent-[#1a4d2e] cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Theme Mode */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <label className="block text-xs font-extrabold text-stone-700">نمط خلفية البوكس</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'transparent', name: 'شفاف بالكامل' },
                    { id: 'emerald_glow', name: 'توهج زمردي' },
                    { id: 'glass', name: 'زجاجي Glass' },
                    { id: 'dark', name: 'ستوديو داكن 3D' }
                  ].map(bg => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateBoxFrame({ backgroundMode: bg.id as any })}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        (config.backgroundMode || 'transparent') === bg.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadow Style */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <label className="block text-xs font-extrabold text-stone-700">الظل والتوهج (Box Shadow)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'none', name: 'بدون ظل' },
                    { id: 'soft', name: 'ناعم' },
                    { id: 'glow', name: 'توهج 3D' }
                  ].map(sh => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => updateBoxFrame({ boxShadowStyle: sh.id as any })}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        (config.boxShadowStyle || 'none') === sh.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {sh.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CONTENT & PHYSICS SETTINGS */}
          {activeInspectorTab === 'content' && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              
              {/* Wheel Physics: Speed & Radius */}
              <div className="space-y-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-xs font-black text-stone-900 block">فيزياء دوران وانحناءة العجلة:</span>
                
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                    <span>سرعة الدوران</span>
                    <span className="font-mono text-emerald-700 font-bold">{config.wheelSpeed} deg/s</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="32"
                    step="1"
                    value={config.wheelSpeed}
                    onChange={(e) => setConfig(prev => ({ ...prev, wheelSpeed: Number(e.target.value) }))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                    <span>نصف قطر التقوس (Radius)</span>
                    <span className="font-mono text-blue-700 font-bold">{config.wheelRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="260"
                    max="420"
                    step="10"
                    value={config.wheelRadius}
                    onChange={(e) => setConfig(prev => ({ ...prev, wheelRadius: Number(e.target.value) }))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Wheel Words Management */}
              <div className="space-y-2">
                <span className="text-xs font-black text-stone-900 block">كلمات العجلة ({config.wheelItems.length}):</span>
                
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={e => setNewWordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWord(); } }}
                    placeholder="إضافة عبارة جديدة..."
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddWord}
                    className="bg-[#1a4d2e] text-white px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
                  >
                    + إضافة
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200 max-h-36 overflow-y-auto">
                  {config.wheelItems.map((word, idx) => (
                    <div key={idx} className="inline-flex items-center gap-1 bg-white border border-stone-200 px-2 py-0.5 rounded-lg text-xs font-bold text-stone-800">
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWord(idx)}
                        className="text-stone-400 hover:text-red-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ready Packs */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <span className="text-[10px] font-extrabold text-stone-500 block">باقات كلمات جاهزة:</span>
                <div className="grid grid-cols-2 gap-1">
                  {PRESET_WORD_PACKS.map(pack => (
                    <button
                      key={pack.name}
                      type="button"
                      onClick={() => handleApplyWordPack(pack.items, pack.name)}
                      className="p-1.5 text-[11px] font-bold bg-stone-100 hover:bg-[#1a4d2e] hover:text-white rounded-lg text-center transition-all truncate"
                    >
                      {pack.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promo Text Editor */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <span className="text-xs font-black text-stone-900 block">النص الدعائي:</span>
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">البادج المضيء</label>
                  <input
                    type="text"
                    value={config.promoBadge}
                    onChange={(e) => setConfig(prev => ({ ...prev, promoBadge: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-0.5">العنوان الترويجي</label>
                  <textarea
                    rows={2}
                    value={config.promoHeading}
                    onChange={(e) => setConfig(prev => ({ ...prev, promoHeading: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Search Placeholder */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <span className="text-xs font-black text-stone-900 block">شريط البحث:</span>
                <input
                  type="text"
                  value={config.searchPlaceholder}
                  onChange={(e) => setConfig(prev => ({ ...prev, searchPlaceholder: e.target.value }))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                />
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
