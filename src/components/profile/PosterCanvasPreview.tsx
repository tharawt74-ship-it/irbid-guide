import React, { useRef, useState, useEffect } from 'react';
import { PosterTemplate, PosterElement } from '../../types/posterDesigner';
import { Business } from '../../types';
import { 
  resolveVariableText, 
  getElementImageSrc, 
  getQrCodeImageUrl, 
  getProcessedElement,
  detectTextDirection,
  getElementTextAlignment,
  getElementBorderRadiusCSS,
  getLogoFilterCSS,
  PosterExtraVars 
} from '../admin/qr-designer/designerUtils';

interface PosterCanvasPreviewProps {
  template: PosterTemplate;
  business: Business;
  extraVars?: PosterExtraVars;
  id?: string;
  className?: string;
}

export const PosterCanvasPreview: React.FC<PosterCanvasPreviewProps> = ({
  template,
  business,
  extraVars,
  id = 'merchant-poster-preview-canvas',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.5);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateScale = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width > 0 && template.canvasWidth > 0) {
        setScale(width / template.canvasWidth);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [template.canvasWidth]);

  const sortedElements = [...(template.elements || [])]
    .filter(el => !el.hidden)
    .filter(el => {
      if (extraVars?.includeEnglish === false && (el.type === 'english_text' || el.id === 'el-english-slogan')) {
        return false;
      }
      if (extraVars?.includeContact === false && (el.type === 'working_hours' || el.id === 'el-hours-badge' || el.type === 'contact_bar' || el.id === 'el-contact-bar')) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.zIndex - b.zIndex);

  const canvasBackground = template.backgroundGradient
    ? `linear-gradient(${template.backgroundGradient.direction || 'to bottom'}, ${template.backgroundGradient.from}, ${template.backgroundGradient.to})`
    : (template.backgroundColor || '#ffffff');

  return (
    <div 
      ref={containerRef} 
      className={`w-full relative overflow-hidden rounded-3xl shadow-xl border border-stone-200/80 bg-stone-100 flex items-center justify-center ${className}`}
      style={{
        aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}`
      }}
    >
      <div
        id={id}
        dir="rtl"
        className="relative select-none origin-top-left shadow-2xl transition-all duration-150"
        style={{
          width: `${template.canvasWidth}px`,
          height: `${template.canvasHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          background: canvasBackground,
          direction: 'rtl'
        }}
      >
        {sortedElements.map((rawEl: PosterElement) => {
          const el = getProcessedElement(rawEl, extraVars);

          let text = resolveVariableText(el.text, business, '', extraVars);

          // Overrides for titles and sections:
          if (el.id === 'el-scan-title' || (el.type === 'hero_title' && (el.y || 0) < 500)) {
            if (extraVars?.overrideTitle) text = extraVars.overrideTitle;
          } else if (el.id === 'el-wave-title' || (el.type === 'hero_title' && (el.y || 0) >= 500)) {
            if (extraVars?.overrideWaveTitle) text = extraVars.overrideWaveTitle;
          }

          if (el.id === 'el-scan-sub' || (el.type === 'subtitle' && (el.y || 0) < 500)) {
            if (extraVars?.overrideSubtitle) text = extraVars.overrideSubtitle;
          } else if (el.id === 'el-wave-sub' || (el.type === 'subtitle' && (el.y || 0) >= 500)) {
            if (extraVars?.overrideWaveSubtitle) text = extraVars.overrideWaveSubtitle;
          }

          if (el.type === 'english_text' || el.id === 'el-english-slogan') {
            if (extraVars?.overrideEnglishText) text = extraVars.overrideEnglishText;
          }

          if (el.id === 'el-digital-badge' || el.type === 'shape_badge') {
            if (extraVars?.overrideDigitalBadge) text = extraVars.overrideDigitalBadge;
          }

          if (el.id === 'el-instructions' || el.name?.includes('تعليمات الكاميرا')) {
            if (extraVars?.overrideInstructions) text = extraVars.overrideInstructions;
          }

          if (el.id === 'el-category-badge') {
            if (extraVars?.overrideCategoryBadge) text = extraVars.overrideCategoryBadge;
          }

          if (el.type === 'table_number' || el.id === 'el-table-badge') {
            if (extraVars?.tableBadgeMode === 'welcome') {
              text = extraVars.overrideTableBadgeText || el.text || '🍽️ نتشرف بخدمتكم • أهلاً وسهلاً بكم';
            } else if (extraVars?.tableBadgeMode === 'table') {
              if (extraVars.tableNumber && extraVars.tableNumber.trim()) {
                const trimmed = extraVars.tableNumber.trim();
                text = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
              } else {
                text = extraVars.overrideTableBadgeText || '';
              }
            } else if (extraVars?.overrideTableBadgeText) {
              text = extraVars.overrideTableBadgeText;
            } else if (extraVars?.tableNumber && extraVars.tableNumber.trim()) {
              const trimmed = extraVars.tableNumber.trim();
              text = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
            }
          }

          const imageSrc = getElementImageSrc(el, business, extraVars?.coverImage, extraVars);
          const qrCodeUrl = el.type === 'qr_code' ? getQrCodeImageUrl(el, business, extraVars?.customQrColor, extraVars?.customQrBgColor, extraVars?.customQrTargetUrl) : '';

          const itemDir = detectTextDirection(text, el);
          const { textAlign, justifyContent } = getElementTextAlignment(el.textAlign, itemDir);

          const elementBackground = el.backgroundGradient 
            ? `linear-gradient(${el.backgroundGradient.direction || 'to bottom'}, ${el.backgroundGradient.from}, ${el.backgroundGradient.to})`
            : (el.type === 'shape_wave' ? 'transparent' : (el.backgroundColor || 'transparent'));

          const isFoodPhoto = el.type === 'food_photo' || el.id === 'el-food-photo' || el.id === 'el-ff-food-img';
          const isLogo = el.type === 'logo' || el.id === 'el-logo';

          let extraTransform = '';
          let transformOrigin: string | undefined = undefined;

          if (isFoodPhoto) {
            const scale = extraVars?.dishScale ?? 1;
            const dx = extraVars?.dishOffsetX ?? 0;
            const dy = extraVars?.dishOffsetY ?? 0;
            if (scale !== 1 || dx !== 0 || dy !== 0) {
              extraTransform = ` translate(${dx}px, ${dy}px) scale(${scale})`;
              transformOrigin = 'center center';
            }
          } else if (isLogo) {
            const scale = extraVars?.logoScale ?? 1;
            const dx = extraVars?.logoOffsetX ?? 0;
            const dy = extraVars?.logoOffsetY ?? 0;
            if (scale !== 1 || dx !== 0 || dy !== 0) {
              extraTransform = ` translate(${dx}px, ${dy}px) scale(${scale})`;
              transformOrigin = 'center center';
            }
          }

          const isLogoUnconstrained = isLogo && (extraVars?.removeLogoSquareFrame ?? Boolean(extraVars?.customPosterLogo));
          const isDishUnconstrained = isFoodPhoto && (extraVars?.removeDishCircleFrame ?? Boolean(extraVars?.customPosterFoodPhoto));
          const isUnconstrained = isLogoUnconstrained || isDishUnconstrained;

          const elementBoxStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            zIndex: el.zIndex,
            opacity: el.opacity ?? 1,
            transform: `rotate(${el.rotation || 0}deg)${extraTransform}`,
            transformOrigin: transformOrigin,
            background: isUnconstrained ? 'transparent' : elementBackground,
            borderWidth: isUnconstrained ? 0 : (el.borderWidth ? `${el.borderWidth}px` : undefined),
            borderStyle: isUnconstrained ? 'none' : (el.borderStyle || 'solid'),
            borderColor: isUnconstrained ? 'transparent' : el.borderColor,
            borderRadius: isUnconstrained ? 0 : getElementBorderRadiusCSS(el),
            boxShadow: isUnconstrained ? 'none' : el.boxShadow,
            padding: isUnconstrained ? 0 : (el.padding ? `${el.padding}px` : undefined),
            fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
            fontWeight: el.fontWeight as any,
            fontFamily: el.fontFamily || 'Cairo, sans-serif',
            color: el.color || '#000000',
            textAlign: textAlign,
            direction: itemDir,
            unicodeBidi: 'plaintext',
            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
            lineHeight: el.lineHeight || 1.3,
            overflow: isUnconstrained ? 'visible' : 'hidden',
            boxSizing: 'border-box'
          };

          return (
            <div key={el.id} id={`preview-${el.id}`} dir={itemDir} style={elementBoxStyle}>
              {el.type === 'qr_code' && (
                <div className="w-full h-full flex items-center justify-center p-1">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    style={{
                      borderRadius: '0px'
                    }}
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {(el.type === 'logo' || el.type === 'food_photo' || el.type === 'custom_image') && (() => {
                let imgRadius = getElementBorderRadiusCSS(el);
                let imgObjectFit = el.objectFit || 'cover';
                if (isUnconstrained) {
                  imgRadius = '0px';
                  imgObjectFit = 'contain';
                }

                return (
                  <img
                    src={imageSrc}
                    alt={el.name}
                    className="w-full h-full pointer-events-none select-none"
                    style={{
                      objectFit: imgObjectFit,
                      borderRadius: imgRadius,
                      filter: getLogoFilterCSS(el.logoFilter),
                      border: 'none',
                      boxShadow: 'none',
                      background: 'transparent'
                    }}
                    crossOrigin="anonymous"
                  />
                );
              })()}

              {el.type === 'shape_wave' && (
                <svg 
                  viewBox="0 0 500 50" 
                  preserveAspectRatio="none" 
                  className="w-full h-full"
                  style={{
                    fill: el.svgFill || el.backgroundColor || '#1a4d2e'
                  }}
                >
                  <path d={el.svgPath || "M0,0 C150,50 350,-20 500,20 L500,0 L0,0 Z"}></path>
                </svg>
              )}

              {(el.type === 'shape_path' || (el.svgPath && el.type !== 'shape_wave')) && (
                <svg 
                  viewBox={`0 0 ${el.width} ${el.height}`} 
                  className="w-full h-full pointer-events-none select-none"
                  style={{ overflow: 'visible' }}
                >
                  <path 
                    d={el.svgPath || ''} 
                    fill={el.svgFill || el.backgroundColor || 'none'} 
                    stroke={el.borderColor || el.color || 'none'} 
                    strokeWidth={el.borderWidth || 2} 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                </svg>
              )}

              {(el.type === 'platform_branding' || el.id === 'el-footer-branding' || el.id?.includes('footer-platform')) && (
                <div 
                  className="w-full h-full flex flex-col justify-center select-none"
                  style={{
                    alignItems: el.textAlign === 'center' ? 'center' : (el.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                    gap: '4px'
                  }}
                >
                  <img
                    src={extraVars?.platformLogoUrl || '/logo.png'}
                    alt="Logo"
                    className="object-contain pointer-events-none"
                    style={{
                      maxHeight: `${Math.min((el.height || 80) * 0.55, 38)}px`,
                      maxWidth: '180px',
                      height: 'auto',
                      filter: getLogoFilterCSS(el.logoFilter)
                    }}
                    crossOrigin="anonymous"
                  />
                  <span
                    dir="ltr"
                    className="font-mono tracking-wider font-extrabold"
                    style={{
                      fontSize: el.fontSize ? `${el.fontSize}px` : '13px',
                      color: el.color || '#1a4d2e',
                      lineHeight: 1
                    }}
                  >
                    {extraVars?.platformDomain || 'shofibirbid.site'}
                  </span>
                </div>
              )}

              {!['qr_code', 'logo', 'food_photo', 'custom_image', 'shape_wave', 'platform_branding'].includes(el.type) && !el.id?.includes('footer-branding') && !el.id?.includes('footer-platform') && text ? (
                <div 
                  dir={itemDir}
                  className="w-full h-full flex items-center select-none"
                  style={{
                    justifyContent: justifyContent,
                    textAlign: textAlign,
                    direction: itemDir,
                    unicodeBidi: 'plaintext',
                    wordBreak: 'break-word',
                    fontFamily: el.fontFamily || 'Cairo, sans-serif'
                  }}
                >
                  {text}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
