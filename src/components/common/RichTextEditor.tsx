import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, Highlighter, 
  Sparkles, HelpCircle, Eye, Trash2
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder = "اكتب وصفاً منسقاً لمحلك ومميزاته هنا...", required = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const isFocusedRef = useRef(false);

  // Sync value from parent ONLY when not focused to avoid cursor jumping
  useEffect(() => {
    if (editorRef.current && !isFocusedRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Clean up common empty state codes that browsers auto-insert inside contentEditable
      if (html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>' || html.trim() === '') {
        onChange('');
      } else {
        onChange(html);
      }
    }
  };

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const handleHighlight = (bgClass: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim() || 'نص مضلل';
    
    // Create a styled span
    const startTag = `<span class="${bgClass} text-stone-900 px-1.5 py-0.5 rounded-sm font-semibold">`;
    const endTag = `</span>`;
    const html = `${startTag}${selectedText}${endTag}`;

    executeCommand('insertHTML', html);
    setShowHighlightDropdown(false);
  };

  const handleRemoveHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    if (selectedText) {
      executeCommand('insertHTML', selectedText);
    }
    setShowHighlightDropdown(false);
  };

  const highlightColors = [
    { name: 'أصفر', bgClass: 'bg-amber-100', dotClass: 'bg-amber-100 border-amber-300' },
    { name: 'وردي', bgClass: 'bg-rose-100', dotClass: 'bg-rose-100 border-rose-300' },
    { name: 'أزرق', bgClass: 'bg-blue-100', dotClass: 'bg-blue-100 border-blue-300' },
    { name: 'أخضر', bgClass: 'bg-emerald-100', dotClass: 'bg-emerald-100 border-emerald-300' }
  ];

  return (
    <div className="border border-stone-200 rounded-2xl bg-white shadow-2xs overflow-hidden" dir="rtl">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-stone-50 border-b border-stone-200 select-none">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
            className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="نص عريض (Bold)"
          >
            <Bold className="h-4 w-4 stroke-[2.5]" />
            <span className="text-[10px] font-bold sm:inline hidden">عريض</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
            className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="نص مائل (Italic)"
          >
            <Italic className="h-4 w-4" />
            <span className="text-[10px] font-bold sm:inline hidden">مائل</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}
            className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="تحته خط (Underline)"
          >
            <Underline className="h-4 w-4" />
            <span className="text-[10px] font-bold sm:inline hidden">تحته خط</span>
          </button>

          <div className="w-[1px] h-5 bg-stone-200 mx-1"></div>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
            className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="قائمة نقطية (Bullet List)"
          >
            <List className="h-4 w-4" />
            <span className="text-[10px] font-bold sm:inline hidden">قائمة نقطية</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}
            className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="قائمة رقمية (Numbered List)"
          >
            <ListOrdered className="h-4 w-4" />
            <span className="text-[10px] font-bold sm:inline hidden">قائمة رقمية</span>
          </button>

          <div className="w-[1px] h-5 bg-stone-200 mx-1"></div>

          {/* Highlight Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHighlightDropdown(!showHighlightDropdown)}
              className={`p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                showHighlightDropdown ? 'bg-stone-100' : ''
              }`}
              title="تظليل بالألوان الفاتحة (Highlight)"
            >
              <Highlighter className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold">تظليل ملون</span>
            </button>

            {showHighlightDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowHighlightDropdown(false)}
                ></div>
                <div className="absolute top-full right-0 mt-1.5 bg-white border border-stone-200 rounded-xl p-2 shadow-lg z-50 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-[9px] font-black text-stone-400 px-2.5 pb-1.5 border-b border-stone-100 mb-1">اختر لون التظليل الفاتح:</p>
                  <div className="space-y-1">
                    {highlightColors.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleHighlight(color.bgClass); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-black hover:bg-stone-50 transition-colors text-right cursor-pointer`}
                      >
                        <span className={`w-4 h-4 rounded-full ${color.dotClass} border shrink-0`}></span>
                        <span className="text-stone-700">{color.name}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleRemoveHighlight(); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-black hover:bg-rose-50 text-rose-600 transition-colors text-right cursor-pointer border-t border-stone-100 mt-1.5 pt-2"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>إزالة التظليل</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className={`p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer ${
            showHelp ? 'bg-stone-100 text-stone-800' : ''
          }`}
          title="تعليمات التنسيق"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Help Panel */}
      {showHelp && (
        <div className="bg-amber-50/75 border-b border-stone-200 p-4 text-stone-800 text-xs leading-relaxed space-y-2 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-1.5 text-amber-900 font-black">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>نصائح وحيل لتنسيق النبذة:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-stone-700 font-medium mr-4">
            <li>اكتب النص بشكل طبيعي، ثم قم بتحديد الكلمات المراد تجميلها بالماوس واضغط على أزرار التنسيق (عريض، مائل، تظليل ملون).</li>
            <li>النبذة المنسقة تظهر فوراً بالتنسيق الجمالي الذي يراه الزائر تماماً دون الحاجة لمعاينة منفصلة.</li>
            <li>تنسيق القوائم النقطية والرقمية مفيد جداً لعرض قائمة الوجبات، المنتجات، المزايا أو أسعار الخدمات بوضوح تام.</li>
          </ul>
        </div>
      )}

      {/* Visual contentEditable Editing Area */}
      <div className="relative min-h-[180px] bg-[#fdfcfb]">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => { isFocusedRef.current = true; }}
          onBlur={() => { isFocusedRef.current = false; handleInput(); }}
          className="prose prose-stone max-w-none w-full min-h-[180px] px-5 py-4 text-stone-800 text-sm leading-relaxed outline-none focus:outline-none transition-all formatted-bio-editor select-text font-medium
            [&_strong]:font-black [&_strong]:text-stone-900 [&_em]:italic 
            [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mr-4 [&_ul]:space-y-1.5 [&_ul]:my-2 
            [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mr-4 [&_ol]:space-y-1.5 [&_ol]:my-2 
            [&_li]:text-stone-700 [&_li]:font-medium [&_span]:inline [&_u]:underline"
          style={{ direction: 'rtl' }}
        ></div>
        {/* Placeholder styling fallback for contentEditable in React */}
        {!value && (
          <div 
            className="absolute top-4 right-5 text-stone-400 text-sm font-medium select-none pointer-events-none"
            dir="rtl"
          >
            {placeholder}
          </div>
        )}
      </div>

      <div className="bg-stone-50/50 border-t border-stone-200 px-4 py-2 flex items-center justify-between text-[10px] text-stone-400 font-bold select-none">
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>مظهر حقيقي ومرئي لزوار محلك ✨</span>
        </div>
        <span>يدعم الكتابة والتنسيق المباشر</span>
      </div>
    </div>
  );
}
