import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage?: number;
  getPageUrl?: (page: number) => string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 15,
  getPageUrl
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-stone-200/80 my-6" dir="rtl">
      <div className="text-xs font-bold text-stone-500">
        عرض <span className="font-black text-stone-900">{startItem}</span> - <span className="font-black text-stone-900">{endItem}</span> من إجمالي <span className="font-black text-[#1a4d2e]">{totalItems}</span> عنصر
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
        {getPageUrl ? (
          <a
            href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(currentPage - 1);
            }}
            aria-disabled={currentPage === 1}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all shadow-xs ${
              currentPage === 1 ? 'opacity-40 pointer-events-none cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <ChevronRight className="h-4 w-4" />
            <span>السابق</span>
          </a>
        ) : (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
            <span>السابق</span>
          </button>
        )}

        {getPageNumbers().map((p, idx) => (
          <React.Fragment key={idx}>
            {typeof p === 'number' ? (
              getPageUrl ? (
                <a
                  key={p}
                  href={getPageUrl(p)}
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(p);
                  }}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center cursor-pointer ${
                    currentPage === p
                      ? 'bg-[#1a4d2e] text-white ring-2 ring-[#1a4d2e]/20'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {p}
                </a>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer ${
                    currentPage === p
                      ? 'bg-[#1a4d2e] text-white ring-2 ring-[#1a4d2e]/20'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {p}
                </button>
              )
            ) : (
              <span key={idx} className="px-1 text-stone-400 font-bold text-xs">...</span>
            )}
          </React.Fragment>
        ))}

        {getPageUrl ? (
          <a
            href={currentPage < totalPages ? getPageUrl(currentPage + 1) : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) onPageChange(currentPage + 1);
            }}
            aria-disabled={currentPage === totalPages}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all shadow-xs ${
              currentPage === totalPages ? 'opacity-40 pointer-events-none cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <span>التالي</span>
            <ChevronLeft className="h-4 w-4" />
          </a>
        ) : (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            <span>التالي</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
