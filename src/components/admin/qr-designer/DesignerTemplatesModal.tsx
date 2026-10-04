import React from 'react';
import { X, Sparkles, Check, LayoutTemplate, Trash2 } from 'lucide-react';
import { PosterTemplate } from '../../../types/posterDesigner';
import { PRESET_TEMPLATES } from './designerTemplates';

interface DesignerTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: PosterTemplate) => void;
  savedTemplates: PosterTemplate[];
  onDeleteSavedTemplate: (id: string) => void;
  activeTemplateId: string;
  presetTemplates?: PosterTemplate[];
}

export const DesignerTemplatesModal: React.FC<DesignerTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  savedTemplates,
  onDeleteSavedTemplate,
  activeTemplateId,
  presetTemplates
}) => {
  if (!isOpen) return null;

  const presetsToDisplay = presetTemplates || PRESET_TEMPLATES;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-stone-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">مكتبة قوالب وتصاميم بوسترات الـ QR</h3>
              <p className="text-xs text-stone-400">اختر قالباً جاهزاً ومصمماً باحترافية لتطبيقه والتعديل عليه بحرية</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Preset Templates Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#ff9f1c] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>القوالب الرسمية المعتمدة لمنصة شو في بإربد</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              {presetsToDisplay.map(tpl => {
                const isActive = tpl.id === activeTemplateId;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50' 
                        : 'bg-stone-800/70 border-stone-700/80 hover:bg-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-black text-white">{tpl.title}</h5>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                            <Check className="h-3 w-3" />
                            <span>المستخدم حالياً</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-700/60 text-[11px] text-stone-400 font-bold">
                      <span>عدد الطبقات: {tpl.elements.length}</span>
                      <span className="text-indigo-400 font-black">تحميل القالب ←</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Saved Templates */}
          {savedTemplates.length > 0 && (
            <div className="space-y-3 border-t border-stone-800 pt-5">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                القوالب المخصصة المحفوظة بواسطتك ({savedTemplates.length})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                {savedTemplates.map(tpl => {
                  const isActive = tpl.id === activeTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isActive 
                          ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50' 
                          : 'bg-stone-800/70 border-stone-700/80 hover:bg-stone-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-sm font-black text-white">{tpl.title}</h5>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSavedTemplate(tpl.id);
                            }}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/50 cursor-pointer"
                            title="حذف القالب المحفوظ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          {tpl.description || 'قالب مخصص تم إنشاؤه عبر ستوديو التصميم'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          onSelectTemplate(tpl);
                          onClose();
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-colors cursor-pointer text-center"
                      >
                        تحميل وتطبيق القالب
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
