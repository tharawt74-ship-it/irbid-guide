import React, { useState } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { getCategoryMeta } from '../pages/Home';

interface CategoryItem {
  name: string;
  subcategories?: string[];
}

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
}

export function CategoriesModal({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoriesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filter categories by search term
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.subcategories && cat.subcategories.some(sub => sub.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#fdfcfb] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-xl border border-[#e5e1da]/80 relative flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-lg">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-stone-900">جميع الأقسام والتصنيفات</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 sm:p-6 border-b border-stone-200/40 bg-stone-50/50 shrink-0">
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="ابحث عن قسم أو تصنيف فرعي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30 focus:border-[#1a4d2e] transition-all"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">
              لا توجد أقسام تطابق بحثك. جرب كلمة أخرى.
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
              {/* "All" Option */}
              {searchTerm === '' && (
                <button
                  onClick={() => {
                    onSelectCategory('');
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 text-center group cursor-pointer ${
                    selectedCategory === ''
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-lg shadow-[#1a4d2e]/15'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-[#1a4d2e] hover:bg-[#1a4d2e]/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 ${
                    selectedCategory === '' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#1a4d2e]'
                  }`}>
                    {React.createElement(getCategoryMeta('الكل').icon, { className: 'h-6 w-6' })}
                  </div>
                  <span className="text-xs sm:text-sm font-black">الكل</span>
                </button>
              )}

              {filteredCategories.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                const { icon: Icon, bg } = getCategoryMeta(cat.name);
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      onSelectCategory(cat.name);
                      onClose();
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 text-center group cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-lg shadow-[#1a4d2e]/15'
                        : 'bg-white text-stone-800 border-stone-200 hover:border-[#1a4d2e] hover:bg-[#1a4d2e]/5'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 ${
                      isSelected ? 'bg-white/20 text-white' : bg
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs sm:text-sm font-black truncate max-w-full px-1">{cat.name}</span>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <span className={`text-[9px] mt-1 font-medium ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                        {cat.subcategories.length} تصنيف فرعي
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
