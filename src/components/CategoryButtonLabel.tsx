import React, { useRef, useEffect, useState } from 'react';

/**
 * Strips all emojis, symbols, and leading/trailing whitespace from category names.
 */
export function cleanCategoryName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{2B50}]|[\u{2702}-\u{27B0}]|[\u{200D}]|[\u{FE0F}]/gu, '')
    .trim();
}

interface CategoryButtonLabelProps {
  name: string;
  isSelected: boolean;
}

export function CategoryButtonLabel({ name, isSelected }: CategoryButtonLabelProps) {
  const cleanName = cleanCategoryName(name);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [halfDiff, setHalfDiff] = useState<number>(0);

  useEffect(() => {
    if (isSelected && containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      const diff = textWidth - containerWidth;
      if (diff > 0) {
        setHalfDiff(diff / 2 + 2);
      } else {
        setHalfDiff(0);
      }
    } else {
      setHalfDiff(0);
    }
  }, [name, isSelected]);

  // If not selected or text fits within button width, render static centered text
  if (!isSelected || halfDiff === 0) {
    return (
      <span className="text-[11px] sm:text-sm font-bold truncate max-w-full px-1 text-center" title={cleanName}>
        {cleanName}
      </span>
    );
  }

  // When selected and text overflows:
  // We use CSS custom variables --marquee-start and --marquee-end calculated specifically for this text & container size.
  return (
    <div ref={containerRef} className="w-full overflow-hidden px-1 flex justify-center items-center">
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap text-[11px] sm:text-sm font-bold animate-marquee-exact"
        style={{
          '--marquee-start': `-${halfDiff}px`,
          '--marquee-end': `${halfDiff}px`,
        } as React.CSSProperties}
      >
        {cleanName}
      </span>
    </div>
  );
}
