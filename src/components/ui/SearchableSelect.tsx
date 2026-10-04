import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'اختر...', className, id }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option => option.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={cn(
          "w-full bg-white border border-[#e5e1da] rounded-2xl px-4 py-3.5 text-sm cursor-pointer flex items-center justify-between transition-colors",
          isOpen ? "ring-2 ring-[#1a4d2e]/20 border-[#1a4d2e]" : "hover:border-stone-300",
          className
        )}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setSearch('');
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }}
        id={id}
      >
        <span className={cn("block truncate", !value && "text-stone-400")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-stone-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-stone-100 flex items-center gap-2">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent outline-none text-sm"
              placeholder="اكتب للبحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-stone-500">لا يوجد نتائج</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-stone-50",
                    value === option ? "bg-[#1a4d2e]/5 text-[#1a4d2e] font-bold" : "text-stone-700"
                  )}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
