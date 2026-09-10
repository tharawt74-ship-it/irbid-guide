import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Sparkles, Tag, FolderOpen, ChevronLeft } from 'lucide-react';
import { getCategoryMeta } from '../lib/categoryMeta';
import { cleanCategoryName } from './CategoryButtonLabel';

interface CategoryItem {
  name: string;
  subcategories?: string[];
}

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (name: string, subcategory?: string) => void;
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

  // Filter categories by search term for standard display, but also prepare search-specific subsets
  const matchedMainCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const matchedSubcategories: { subName: string; parentName: string }[] = [];
  categories.forEach(cat => {
    if (cat.subcategories) {
      cat.subcategories.forEach(sub => {
        if (sub.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchedSubcategories.push({
            subName: sub,
            parentName: cat.name
          });
        }
      });
    }
  });

  const isAllSelected = !selectedCategory || selectedCategory === 'الكل' || selectedCategory === '';

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#fdfcfb] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#e5e1da]/80 relative flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200/60 shrink-0 bg-white">
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
              className="w-full pr-10 pl-10 py-2.5 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30 focus:border-[#1a4d2e] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {searchTerm.trim() !== '' ? (
            // Search Results Layout
            <div className="space-y-6">
              {matchedMainCategories.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-[#1a4d2e] tracking-wider flex items-center gap-1.5 bg-[#1a4d2e]/5 px-3 py-1.5 rounded-lg w-max">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>الأقسام الرئيسية المطابقة ({matchedMainCategories.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                    {matchedMainCategories.map((cat) => {
                      const isSelected = !isAllSelected && selectedCategory === cat.name;
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
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
                            isSelected ? 'bg-white/20 text-white' : bg
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-xs sm:text-sm font-black truncate max-w-full px-1">{cleanCategoryName(cat.name)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {matchedSubcategories.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-amber-700 tracking-wider flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg w-max">
                    <Tag className="h-3.5 w-3.5" />
                    <span>التصنيفات الفرعية المطابقة ({matchedSubcategories.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchedSubcategories.map((sub, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectCategory(sub.parentName, sub.subName);
                          onClose();
                        }}
                        className="flex items-center justify-between p-3.5 bg-white border border-stone-200/80 rounded-2xl hover:border-[#1a4d2e] hover:bg-[#1a4d2e]/5 transition-all duration-150 text-right cursor-pointer group w-full"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-stone-50 group-hover:bg-emerald-50 text-stone-400 group-hover:text-[#1a4d2e] flex items-center justify-center shrink-0 transition-colors">
                            <Tag className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-stone-800 group-hover:text-[#1a4d2e] truncate">
                              {sub.subName}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5 font-bold">
                              في قسم: {cleanCategoryName(sub.parentName)}
                            </div>
                          </div>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-stone-300 group-hover:text-[#1a4d2e] group-hover:translate-x-[-2px] transition-all ml-1 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedMainCategories.length === 0 && matchedSubcategories.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
                    <Search className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-stone-800">لا توجد نتائج تطابق "{searchTerm}"</p>
                    <p className="text-xs text-stone-400">تأكد من كتابة الكلمة بشكل صحيح أو جرب كلمات بحث أخرى</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Standard Categories Grid Layout (When Search is Empty)
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
              {/* "All" Option */}
              {searchTerm === '' && (
                <button
                  onClick={() => {
                    onSelectCategory('');
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 text-center group cursor-pointer ${
                    isAllSelected
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-lg shadow-[#1a4d2e]/15'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-[#1a4d2e] hover:bg-[#1a4d2e]/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 ${
                    isAllSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#1a4d2e]'
                  }`}>
                    {React.createElement(getCategoryMeta('الكل').icon, { className: 'h-6 w-6' })}
                  </div>
                  <span className="text-xs sm:text-sm font-black">الكل</span>
                </button>
              )}

              {categories.map((cat) => {
                const isSelected = !isAllSelected && selectedCategory === cat.name;
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
                    <span className="text-xs sm:text-sm font-black truncate max-w-full px-1">{cleanCategoryName(cat.name)}</span>
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

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
