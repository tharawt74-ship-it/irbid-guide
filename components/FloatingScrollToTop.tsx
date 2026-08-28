import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function FloatingScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-28 md:bottom-8 left-4 z-50 p-3 rounded-2xl bg-[#1a4d2e] text-white shadow-xl hover:bg-[#143d24] active:scale-90 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 border border-emerald-500/30 flex items-center justify-center cursor-pointer group"
      title="العودة لأعلى الصفحة"
      aria-label="العودة لأعلى الصفحة"
    >
      <ArrowUp className="h-5 w-5 text-white group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
