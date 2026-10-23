import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}

export function QRCodeDisplay({
  value,
  size = 160,
  className = '',
  level = 'M',
  includeMargin = false
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setDataUrl('');
      return;
    }

    QRCode.toDataURL(value, {
      width: Math.max(size * 2, 240), // 2x for crisp rendering
      margin: includeMargin ? 2 : 1,
      errorCorrectionLevel: level,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isMounted) setDataUrl(url);
      })
      .catch(err => {
        console.warn('QR Code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, level, includeMargin]);

  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`bg-stone-100 flex items-center justify-center rounded-lg ${className}`}
      >
        <span className="inline-block w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img 
      src={dataUrl} 
      alt="QR Code" 
      width={size} 
      height={size}
      style={{ width: size, height: size }}
      className={`block select-none ${className}`} 
    />
  );
}

export default QRCodeDisplay;
