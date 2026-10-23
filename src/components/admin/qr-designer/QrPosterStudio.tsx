import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Business } from '../../../types';
import { PosterElement, PosterElementType, PosterTemplate } from '../../../types/posterDesigner';
import { PRESET_TEMPLATES, PRESET_REVIEWS_TEMPLATES, CANVAS_FORMATS } from './designerTemplates';
import { DesignerCanvas } from './DesignerCanvas';
import { DesignerToolbar } from './DesignerToolbar';
import { DesignerLayersPanel } from './DesignerLayersPanel';
import { DesignerPropertiesPanel } from './DesignerPropertiesPanel';
import { DesignerTemplatesModal } from './DesignerTemplatesModal';
import { exportPosterAsPng, printPosterTemplate } from './designerUtils';
import confetti from 'canvas-confetti';

interface QrPosterStudioProps {
  businesses: Business[];
  initialTemplate?: PosterTemplate;
  onSaveSystemDefaultTemplate?: (template: PosterTemplate) => Promise<void> | void;
  initialReviewsTemplate?: PosterTemplate;
  onSaveSystemDefaultReviewsTemplate?: (template: PosterTemplate) => Promise<void> | void;
}

const STORAGE_KEY_CUSTOM_TEMPLATES = 'shofi_qr_custom_templates_v1';
const STORAGE_KEY_DEFAULT_TEMPLATE = 'shofi_qr_default_template_v1';

export const QrPosterStudio: React.FC<QrPosterStudioProps> = ({
  businesses,
  initialTemplate,
  onSaveSystemDefaultTemplate,
  initialReviewsTemplate,
  onSaveSystemDefaultReviewsTemplate
}) => {
  const [posterMode, setPosterMode] = useState<'menu' | 'reviews'>('menu');

  // Load initial template
  const getInitialTemplateForMode = (mode: 'menu' | 'reviews'): PosterTemplate => {
    if (mode === 'reviews') {
      if (initialReviewsTemplate) return initialReviewsTemplate;
      try {
        const savedDefault = localStorage.getItem('shofi_qr_reviews_default_template_v1');
        if (savedDefault) return JSON.parse(savedDefault);
      } catch (e) {
        console.error('Error loading default reviews template:', e);
      }
      return PRESET_REVIEWS_TEMPLATES[0];
    }

    if (initialTemplate) return initialTemplate;
    try {
      const savedDefault = localStorage.getItem(STORAGE_KEY_DEFAULT_TEMPLATE);
      if (savedDefault) return JSON.parse(savedDefault);
    } catch (e) {
      console.error('Error loading default template:', e);
    }
    return PRESET_TEMPLATES[0];
  };

  const [currentTemplate, setCurrentTemplate] = useState<PosterTemplate>(() => getInitialTemplateForMode('menu'));
  const [history, setHistory] = useState<PosterTemplate[]>(() => [getInitialTemplateForMode('menu')]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const handleSwitchMode = (newMode: 'menu' | 'reviews') => {
    if (newMode === posterMode) return;
    setPosterMode(newMode);
    const tpl = getInitialTemplateForMode(newMode);
    setCurrentTemplate(tpl);
    setHistory([tpl]);
    setHistoryIndex(0);
    showToast(newMode === 'reviews' ? 'تم الانتقال إلى محرر بوسترات التقييمات والمراجعات' : 'تم الانتقال إلى محرر بوسترات المنيو والمعلومات');
  };

  // Synchronization refs for infallible event listeners
  const historyRef = useRef<PosterTemplate[]>(history);
  const historyIndexRef = useRef<number>(0);
  const currentTemplateRef = useRef<PosterTemplate>(currentTemplate);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
    currentTemplateRef.current = currentTemplate;
  }, [history, historyIndex, currentTemplate]);

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>(['el-qr-box']);
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : (selectedElementIds.length > 0 ? selectedElementIds[selectedElementIds.length - 1] : null);
  const selectedElements = currentTemplate.elements.filter(el => selectedElementIds.includes(el.id));
  const selectedElement = selectedElementIds.length === 1 ? (selectedElements[0] || null) : null;

  const handleSelectElement = useCallback((id: string | null, multi: boolean = false) => {
    if (id === null) {
      setSelectedElementIds([]);
      return;
    }
    if (multi) {
      setSelectedElementIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(item => item !== id);
        } else {
          return [...prev, id];
        }
      });
    } else {
      setSelectedElementIds([id]);
    }
  }, []);

  const [zoom, setZoom] = useState<number>(0.65);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [isPenToolActive, setIsPenToolActive] = useState<boolean>(false);

  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(businesses[0] || null);

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [savedTemplates, setSavedTemplates] = useState<PosterTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_TEMPLATES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  // Push to undo/redo history
  const pushState = useCallback((newTemplate: PosterTemplate) => {
    const currentIdx = historyIndexRef.current;
    const currentHist = historyRef.current;
    const updatedHistory = currentHist.slice(0, currentIdx + 1);
    updatedHistory.push(newTemplate);
    if (updatedHistory.length > 50) updatedHistory.shift();

    const newIdx = updatedHistory.length - 1;
    historyRef.current = updatedHistory;
    historyIndexRef.current = newIdx;
    currentTemplateRef.current = newTemplate;

    setHistory(updatedHistory);
    setHistoryIndex(newIdx);
    setCurrentTemplate(newTemplate);
  }, []);

  // Commit current template snapshot to history (e.g. after drag, resize, pen stroke)
  const handleCommitHistory = useCallback(() => {
    pushState({ ...currentTemplateRef.current, updatedAt: Date.now() });
  }, [pushState]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    const currentIdx = historyIndexRef.current;
    const currentHist = historyRef.current;
    if (currentIdx > 0) {
      const prevIndex = currentIdx - 1;
      const targetState = currentHist[prevIndex];
      historyIndexRef.current = prevIndex;
      currentTemplateRef.current = targetState;
      setHistoryIndex(prevIndex);
      setCurrentTemplate(targetState);
      showToast('↩ تم التراجع (Undo)', 'info');
    }
  }, [showToast]);

  const handleRedo = useCallback(() => {
    const currentIdx = historyIndexRef.current;
    const currentHist = historyRef.current;
    if (currentIdx < currentHist.length - 1) {
      const nextIndex = currentIdx + 1;
      const targetState = currentHist[nextIndex];
      historyIndexRef.current = nextIndex;
      currentTemplateRef.current = targetState;
      setHistoryIndex(nextIndex);
      setCurrentTemplate(targetState);
      showToast('↪ تم الإعادة (Redo)', 'info');
    }
  }, [showToast]);

  // Update specific element
  const handleUpdateElement = useCallback((id: string, patch: Partial<PosterElement>) => {
    setCurrentTemplate(prev => {
      const updatedElements = prev.elements.map(el => {
        if (el.id === id) {
          return { ...el, ...patch };
        }
        return el;
      });
      const updated = { ...prev, elements: updatedElements, updatedAt: Date.now() };
      currentTemplateRef.current = updated;
      return updated;
    });
  }, []);

  // Add element directly (from Pen Tool or custom creators)
  const handleAddElementDirect = useCallback((element: PosterElement) => {
    const current = currentTemplateRef.current;
    const updated = {
      ...current,
      elements: [...current.elements, element],
      updatedAt: Date.now()
    };
    pushState(updated);
    setSelectedElementIds([element.id]);
    showToast(`تمت إضافة "${element.name}" إلى التصميم ✨`);
  }, [pushState, showToast]);

  // Update element with history recording on completion
  const handleUpdateElementWithHistory = useCallback((id: string, patch: Partial<PosterElement>) => {
    const updatedElements = currentTemplate.elements.map(el => {
      if (el.id === id) {
        return { ...el, ...patch };
      }
      return el;
    });
    pushState({ ...currentTemplate, elements: updatedElements, updatedAt: Date.now() });
  }, [currentTemplate, pushState]);

  // Add new element
  const handleAddElement = (type: PosterElementType) => {
    const maxZ = currentTemplate.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    const newId = `el-${type}-${Date.now()}`;

    let newElement: PosterElement;

    switch (type) {
      case 'business_name':
        newElement = {
          id: newId,
          type: 'business_name',
          name: 'اسم المحل التجاري',
          x: 100,
          y: 100,
          width: 400,
          height: 50,
          zIndex: maxZ + 1,
          text: '{{business_name}}',
          fontSize: 32,
          fontWeight: '900',
          color: '#111827',
          textAlign: 'right'
        };
        break;
      case 'qr_code':
        newElement = {
          id: newId,
          type: 'qr_code',
          name: 'رمز الاستجابة QR',
          x: 247,
          y: 350,
          width: 300,
          height: 300,
          zIndex: maxZ + 1,
          qrColor: '#0f766e',
          qrBgColor: '#ffffff',
          borderRadius: 24,
          borderColor: '#0f766e',
          borderWidth: 4,
          padding: 16
        };
        break;
      case 'logo':
        newElement = {
          id: newId,
          type: 'logo',
          name: 'شعار المحل',
          x: 347,
          y: 80,
          width: 100,
          height: 100,
          zIndex: maxZ + 1,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: '#e5e7eb',
          clipShape: 'rounded'
        };
        break;
      case 'food_photo':
        newElement = {
          id: newId,
          type: 'food_photo',
          name: 'صورة وجبة ترويجية',
          x: 247,
          y: 650,
          width: 300,
          height: 200,
          zIndex: maxZ + 1,
          src: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
          borderRadius: 24,
          borderWidth: 4,
          borderColor: '#ffffff'
        };
        break;
      case 'table_number':
        newElement = {
          id: newId,
          type: 'table_number',
          name: 'رقم الطاولة',
          x: 297,
          y: 700,
          width: 200,
          height: 45,
          zIndex: maxZ + 1,
          text: 'طاولة رقم 01',
          fontSize: 16,
          fontWeight: '800',
          color: '#065f46',
          backgroundColor: '#d1fae5',
          borderRadius: 99,
          borderColor: '#6ee7b7',
          borderWidth: 1.5,
          textAlign: 'center'
        };
        break;
      case 'working_hours':
        newElement = {
          id: newId,
          type: 'working_hours',
          name: 'أوقات العمل',
          x: 197,
          y: 850,
          width: 400,
          height: 45,
          zIndex: maxZ + 1,
          text: '⏰ أوقات العمل: {{working_hours}}',
          fontSize: 14,
          fontWeight: '700',
          color: '#334155',
          backgroundColor: '#f1f5f9',
          borderRadius: 14,
          textAlign: 'center'
        };
        break;
      case 'contact_bar':
        newElement = {
          id: newId,
          type: 'contact_bar',
          name: 'رقم الاتصال',
          x: 197,
          y: 910,
          width: 400,
          height: 45,
          zIndex: maxZ + 1,
          text: '📞 للطلب والاستفسار: {{phone}}',
          fontSize: 15,
          fontWeight: '800',
          color: '#111827',
          textAlign: 'center'
        };
        break;
      case 'hero_title':
        newElement = {
          id: newId,
          type: 'hero_title',
          name: 'عنوان ترويجي',
          x: 100,
          y: 200,
          width: 594,
          height: 50,
          zIndex: maxZ + 1,
          text: 'امسح الكود لتصفح المنيو الذكي 📱',
          fontSize: 28,
          fontWeight: '900',
          color: '#0f766e',
          textAlign: 'center'
        };
        break;
      case 'shape_rect':
        newElement = {
          id: newId,
          type: 'shape_rect',
          name: 'مستطيل خلفية',
          x: 50,
          y: 200,
          width: 694,
          height: 300,
          zIndex: 1,
          backgroundColor: '#f8fafc',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#e2e8f0'
        };
        break;
      case 'shape_circle':
        newElement = {
          id: newId,
          type: 'shape_circle',
          name: 'دائرة زخرفية',
          x: 300,
          y: 300,
          width: 200,
          height: 200,
          zIndex: 1,
          backgroundColor: '#ecfdf5',
          borderRadius: 999
        };
        break;
      default:
        newElement = {
          id: newId,
          type: 'custom_text',
          name: 'نص مخصص',
          x: 100,
          y: 150,
          width: 300,
          height: 40,
          zIndex: maxZ + 1,
          text: 'أهلاً بكم في منشأتنا',
          fontSize: 18,
          fontWeight: '700',
          color: '#111827',
          textAlign: 'right'
        };
    }

    pushState({
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement]
    });
    setSelectedElementIds([newId]);
  };

  // Duplicate single element
  const handleDuplicateElement = (id: string) => {
    const el = currentTemplate.elements.find(item => item.id === id);
    if (!el) return;

    const maxZ = currentTemplate.elements.reduce((max, item) => Math.max(max, item.zIndex), 0);
    const newId = `el-${el.type}-${Date.now()}`;
    const duplicated: PosterElement = {
      ...el,
      id: newId,
      name: `${el.name} (نسخة)`,
      x: Math.min(currentTemplate.canvasWidth - el.width, el.x + 20),
      y: Math.min(currentTemplate.canvasHeight - el.height, el.y + 20),
      zIndex: maxZ + 1
    };

    pushState({
      ...currentTemplate,
      elements: [...currentTemplate.elements, duplicated]
    });
    setSelectedElementIds([newId]);
  };

  // Duplicate all selected elements (single or multiple)
  const handleDuplicateSelected = useCallback(() => {
    const ids = selectedElementIds;
    if (ids.length === 0) return;

    const newElements: PosterElement[] = [];
    const newIds: string[] = [];
    let maxZ = currentTemplateRef.current.elements.reduce((max, item) => Math.max(max, item.zIndex), 0);

    currentTemplateRef.current.elements.forEach(el => {
      if (ids.includes(el.id)) {
        maxZ += 1;
        const newId = `el-${el.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const duplicated: PosterElement = {
          ...el,
          id: newId,
          name: `${el.name} (نسخة)`,
          x: Math.min(currentTemplateRef.current.canvasWidth - el.width, el.x + 20),
          y: Math.min(currentTemplateRef.current.canvasHeight - el.height, el.y + 20),
          zIndex: maxZ
        };
        newElements.push(duplicated);
        newIds.push(newId);
      }
    });

    if (newElements.length > 0) {
      pushState({
        ...currentTemplateRef.current,
        elements: [...currentTemplateRef.current.elements, ...newElements]
      });
      setSelectedElementIds(newIds);
      showToast(`تم تكرار ${newElements.length} عنصر بنجاح`);
    }
  }, [selectedElementIds, pushState, showToast]);

  // Delete single element
  const handleDeleteElement = (id: string) => {
    const updated = currentTemplate.elements.filter(el => el.id !== id);
    pushState({ ...currentTemplate, elements: updated });
    setSelectedElementIds(prev => prev.filter(item => item !== id));
  };

  // Delete all selected elements (single or multiple)
  const handleDeleteSelected = useCallback(() => {
    const ids = selectedElementIds;
    if (ids.length === 0) return;

    const count = ids.length;
    const updated = currentTemplateRef.current.elements.filter(el => !ids.includes(el.id));
    pushState({ ...currentTemplateRef.current, elements: updated });
    setSelectedElementIds([]);
    showToast(count > 1 ? `تم حذف ${count} عناصر` : 'تم حذف العنصر المحدد', 'info');
  }, [selectedElementIds, pushState, showToast]);

  // Bulk update elements (properties, lock, visibility)
  const handleBulkUpdateElements = useCallback((ids: string[], patch: Partial<PosterElement>) => {
    const updated = currentTemplateRef.current.elements.map(el => {
      if (ids.includes(el.id)) {
        return { ...el, ...patch };
      }
      return el;
    });
    pushState({ ...currentTemplateRef.current, elements: updated });
  }, [pushState]);

  // Align selected elements to each other
  const handleAlignSelectedElements = useCallback((type: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
    const current = currentTemplateRef.current;
    const targetEls = current.elements.filter(el => selectedElementIds.includes(el.id) && !el.locked);
    if (targetEls.length <= 1) return;

    const minX = Math.min(...targetEls.map(e => e.x));
    const maxX = Math.max(...targetEls.map(e => e.x + e.width));
    const minY = Math.min(...targetEls.map(e => e.y));
    const maxY = Math.max(...targetEls.map(e => e.y + e.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const updated = current.elements.map(el => {
      if (!selectedElementIds.includes(el.id) || el.locked) return el;
      switch (type) {
        case 'left':
          return { ...el, x: minX };
        case 'right':
          return { ...el, x: maxX - el.width };
        case 'center-x':
          return { ...el, x: Math.round(centerX - el.width / 2) };
        case 'top':
          return { ...el, y: minY };
        case 'bottom':
          return { ...el, y: maxY - el.height };
        case 'center-y':
          return { ...el, y: Math.round(centerY - el.height / 2) };
        default:
          return el;
      }
    });

    pushState({ ...current, elements: updated });
    showToast('تمت محاذاة العناصر المحددة');
  }, [selectedElementIds, pushState, showToast]);

  // Distribute spacing evenly between selected elements
  const handleDistributeSelectedElements = useCallback((type: 'horizontal' | 'vertical') => {
    const current = currentTemplateRef.current;
    const targetEls = current.elements.filter(el => selectedElementIds.includes(el.id) && !el.locked);
    if (targetEls.length < 3) return;

    if (type === 'horizontal') {
      const sorted = [...targetEls].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const innerWidth = sorted.slice(1, -1).reduce((sum, el) => sum + el.width, 0);
      const span = (last.x - (first.x + first.width)) - innerWidth;
      const gap = span / (sorted.length - 1);

      let curX = first.x + first.width + gap;
      const posMap: Record<string, number> = {};
      for (let i = 1; i < sorted.length - 1; i++) {
        posMap[sorted[i].id] = Math.round(curX);
        curX += sorted[i].width + gap;
      }

      const updated = current.elements.map(el => {
        if (posMap[el.id] !== undefined) {
          return { ...el, x: posMap[el.id] };
        }
        return el;
      });
      pushState({ ...current, elements: updated });
      showToast('تم توزيع العناصر أفقياً بالتساوي');
    } else {
      const sorted = [...targetEls].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const innerHeight = sorted.slice(1, -1).reduce((sum, el) => sum + el.height, 0);
      const span = (last.y - (first.y + first.height)) - innerHeight;
      const gap = span / (sorted.length - 1);

      let curY = first.y + first.height + gap;
      const posMap: Record<string, number> = {};
      for (let i = 1; i < sorted.length - 1; i++) {
        posMap[sorted[i].id] = Math.round(curY);
        curY += sorted[i].height + gap;
      }

      const updated = current.elements.map(el => {
        if (posMap[el.id] !== undefined) {
          return { ...el, y: posMap[el.id] };
        }
        return el;
      });
      pushState({ ...current, elements: updated });
      showToast('تم توزيع العناصر رأسياً بالتساوي');
    }
  }, [selectedElementIds, pushState, showToast]);

  // Reorder element zIndex
  const handleReorderElement = (id: string, direction: 'up' | 'down') => {
    const sorted = [...currentTemplate.elements].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex(el => el.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < sorted.length - 1) {
      const target = sorted[index + 1];
      const tempZ = sorted[index].zIndex;
      sorted[index].zIndex = target.zIndex;
      target.zIndex = tempZ;
    } else if (direction === 'down' && index > 0) {
      const target = sorted[index - 1];
      const tempZ = sorted[index].zIndex;
      sorted[index].zIndex = target.zIndex;
      target.zIndex = tempZ;
    }

    pushState({ ...currentTemplate, elements: sorted });
  };

  // Keyboard Shortcuts (Undo/Redo Ctrl+Z, Ctrl+Y, Deselect Escape, Delete, Duplicate, Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input, textarea or select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const isZ = e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ';
      const isY = e.key === 'y' || e.key === 'Y' || e.code === 'KeyY';
      const isD = e.key === 'd' || e.key === 'D' || e.code === 'KeyD';
      const isP = e.key === 'p' || e.key === 'P' || e.code === 'KeyP';

      // Undo: Ctrl+Z or Cmd+Z (without shift)
      if ((e.ctrlKey || e.metaKey) && isZ && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && isY) || ((e.ctrlKey || e.metaKey) && isZ && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Deselect or close Pen Tool: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedElementIds([]);
        setIsPenToolActive(false);
        return;
      }

      // Toggle Pen Tool: P
      if (isP && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsPenToolActive(prev => !prev);
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      // Duplicate: Ctrl+D or Cmd+D
      if ((e.ctrlKey || e.metaKey) && isD) {
        e.preventDefault();
        if (selectedElementIds.length > 0) {
          handleDuplicateSelected();
        }
        return;
      }

      // Arrow keys nudge (single or group)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const current = currentTemplateRef.current;

        let deltaX = 0;
        let deltaY = 0;
        if (e.key === 'ArrowUp') deltaY = -step;
        if (e.key === 'ArrowDown') deltaY = step;
        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;

        let hasMovedAny = false;
        const updated = current.elements.map(el => {
          if (!selectedElementIds.includes(el.id) || el.locked) return el;
          hasMovedAny = true;
          const newX = Math.max(0, Math.min(current.canvasWidth - el.width, el.x + deltaX));
          const newY = Math.max(0, Math.min(current.canvasHeight - el.height, el.y + deltaY));
          return { ...el, x: newX, y: newY };
        });

        if (hasMovedAny) {
          pushState({ ...current, elements: updated });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, handleUndo, handleRedo, handleDeleteSelected, handleDuplicateSelected, pushState]);

  // Save current template as custom preset
  const handleSaveTemplate = () => {
    setIsSaving(true);
    const templateToSave: PosterTemplate = {
      ...currentTemplate,
      id: `custom_tpl_${Date.now()}`,
      title: currentTemplate.title || 'قالب مخصص',
      updatedAt: Date.now()
    };

    const updatedSaved = [...savedTemplates.filter(t => t.id !== templateToSave.id), templateToSave];
    setSavedTemplates(updatedSaved);
    localStorage.setItem(STORAGE_KEY_CUSTOM_TEMPLATES, JSON.stringify(updatedSaved));

    setTimeout(() => {
      setIsSaving(false);
      showToast('تم حفظ القالب بنجاح في مكتبة القوالب الخاصة بك ✨');
    }, 400);
  };

  // Set as System Default for all merchants
  const handleSetAsDefault = async () => {
    try {
      if (posterMode === 'reviews') {
        localStorage.setItem('shofi_qr_reviews_default_template_v1', JSON.stringify(currentTemplate));
        if (onSaveSystemDefaultReviewsTemplate) {
          await onSaveSystemDefaultReviewsTemplate(currentTemplate);
        }
        showToast('تم اعتماد هذا القالب كقالب افتراضي لبوسترات المراجعات والتقييمات بنجاح! ⭐');
      } else {
        localStorage.setItem(STORAGE_KEY_DEFAULT_TEMPLATE, JSON.stringify(currentTemplate));
        if (onSaveSystemDefaultTemplate) {
          await onSaveSystemDefaultTemplate(currentTemplate);
        }
        showToast('تم اعتماد هذا القالب كقالب افتراضي لبوسترات المنيو والمعلومات العامة بنجاح! 🚀');
      }
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء حفظ القالب الافتراضي', 'error');
    }
  };

  // Print
  const handlePrint = () => {
    printPosterTemplate(currentTemplate, selectedBusiness);
  };

  // Export PNG
  const handleExportPng = () => {
    const filename = `qr_poster_${selectedBusiness?.name || 'shofi_irbid'}.png`;
    exportPosterAsPng('designer-export-canvas', filename);
  };

  // 📺 Full Screen Studio Support
  const studioContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (studioContainerRef.current?.requestFullscreen) {
        studioContainerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  return (
    <div 
      ref={studioContainerRef}
      className={`flex flex-col bg-stone-950 transition-all select-none ${
        isFullscreen 
          ? 'fixed inset-0 z-[999999] w-screen h-screen rounded-none border-0 shadow-none' 
          : 'h-[calc(100vh-140px)] min-h-[680px] rounded-3xl overflow-hidden border border-stone-800 shadow-2xl relative'
      }`}
    >
      
      {/* Toast Notification Alert */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 border border-emerald-500 text-white px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Poster Mode Switcher Bar (Menu vs Reviews) */}
      <div className="bg-stone-900 border-b border-stone-800 px-4 py-2 flex items-center justify-between gap-2 text-xs font-bold shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium hidden sm:inline">قسم المحرر:</span>
          <button
            type="button"
            onClick={() => handleSwitchMode('menu')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              posterMode === 'menu'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>بوسترات المنيو والمعلومات</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('reviews')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              posterMode === 'reviews'
                ? 'bg-amber-600 text-white font-black shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>⭐</span>
            <span>بوسترات التقييمات والمراجعات</span>
          </button>
        </div>
        <span className="text-[11px] text-stone-400 hidden md:inline">
          {posterMode === 'reviews' ? 'قالب التقييمات منفصل كلياً عن قالب المنيو' : 'قالب المنيو منفصل كلياً عن قالب التقييمات'}
        </span>
      </div>

      {/* Top Studio Toolbar */}
      <DesignerToolbar
        template={currentTemplate}
        onAddElement={handleAddElement}
        onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
        onSaveTemplate={handleSaveTemplate}
        onSetAsDefault={handleSetAsDefault}
        onPrint={handlePrint}
        onExportPng={handleExportPng}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        zoom={zoom}
        setZoom={setZoom}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        showGuidelines={showGuidelines}
        setShowGuidelines={setShowGuidelines}
        showRulers={showRulers}
        setShowRulers={setShowRulers}
        isPenToolActive={isPenToolActive}
        setIsPenToolActive={setIsPenToolActive}
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onSelectBusiness={setSelectedBusiness}
        selectedElementId={selectedElementId}
        selectedCount={selectedElementIds.length}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        isSaving={isSaving}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Studio Work Area (Layers Panel on Left, Canvas in Center, Properties on Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Layers Stack (Photoshop style) */}
        <DesignerLayersPanel
          elements={currentTemplate.elements}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          onSelectElement={handleSelectElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onReorderElement={handleReorderElement}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}
        />

        {/* Artboard Canvas Workspace */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-stone-900">
          <DesignerCanvas
            template={currentTemplate}
            selectedElementId={selectedElementId}
            selectedElementIds={selectedElementIds}
            onSelectElement={handleSelectElement}
            onUpdateElement={handleUpdateElement}
            onCommitHistory={handleCommitHistory}
            selectedBusiness={selectedBusiness}
            zoom={zoom}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            showGuidelines={showGuidelines}
            showRulers={showRulers}
            isPenToolActive={isPenToolActive}
            onClosePenTool={() => setIsPenToolActive(false)}
            onAddElement={handleAddElementDirect}
          />
        </div>

        {/* Properties & Typography Inspector */}
        <DesignerPropertiesPanel
          selectedElement={selectedElement}
          selectedElements={selectedElements}
          canvasWidth={currentTemplate.canvasWidth}
          canvasHeight={currentTemplate.canvasHeight}
          onUpdateElement={handleUpdateElement}
          onBulkUpdateElements={handleBulkUpdateElements}
          onAlignSelectedElements={handleAlignSelectedElements}
          onDistributeSelectedElements={handleDistributeSelectedElements}
          onDeleteSelectedElements={handleDeleteSelected}
          onDuplicateSelectedElements={handleDuplicateSelected}
          onSelectElement={handleSelectElement}
          onClearSelection={() => setSelectedElementIds([])}
        />
      </div>

      {/* Templates Browser Modal */}
      <DesignerTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={(tpl) => {
          pushState({ ...tpl, id: `tpl_${Date.now()}` });
          setSelectedElementIds([]);
          showToast(`تم تحميل وتطبيق "${tpl.title}" على ساحة العمل 🎨`);
        }}
        savedTemplates={savedTemplates}
        onDeleteSavedTemplate={(id) => {
          const filtered = savedTemplates.filter(t => t.id !== id);
          setSavedTemplates(filtered);
          localStorage.setItem(STORAGE_KEY_CUSTOM_TEMPLATES, JSON.stringify(filtered));
          showToast('تم حذف القالب المحفوظ', 'info');
        }}
        activeTemplateId={currentTemplate.id}
        presetTemplates={posterMode === 'reviews' ? PRESET_REVIEWS_TEMPLATES : PRESET_TEMPLATES}
      />

    </div>
  );
};
