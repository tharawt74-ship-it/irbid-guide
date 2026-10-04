import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Crown, ArrowLeft, ExternalLink, Touchpad, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { InFeedPromoCard } from '../../types';
import { Link } from 'react-router';

interface InFeedPromoCardItemProps {
  card: InFeedPromoCard;
  className?: string;
}

export function InFeedPromoCardItem({ card, className = '' }: InFeedPromoCardItemProps) {
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [isControlsTouchVisible, setIsControlsTouchVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVideo = card.mediaType === 'video' && Boolean(card.videoUrl);
  const isEmbedVideo = isVideo && (card.videoUrl?.includes('youtube') || card.videoUrl?.includes('youtu.be'));
  const isExternalLink = card.buttonLink?.startsWith('http://') || card.buttonLink?.startsWith('https://');

  const actionText = card.buttonText || 'عرض التفاصيل';
  const actionTarget = card.buttonLink || (card.businessId ? `/business/${card.businessId}` : '#');
  const isLayoutFull = card.promoCardLayout === 'full';
  const isHoverOnly = card.promoCardContentDisplay === 'hover';

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Convert standard YouTube links to embed format with autoplay and loop
  const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`;
      }
      if (url.includes('youtube.com/embed/')) {
        return url.includes('autoplay') ? url : `${url}?autoplay=1&mute=1&loop=1`;
      }
    } catch {
      return url;
    }
    return url;
  };

  // Video Ref callback that reliably enforces muted autoplay on initial load
  const setVideoElementRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element) {
      element.defaultMuted = true;
      element.muted = isMuted;
      if (isPlaying && element.paused) {
        const playPromise = element.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Autoplay with muted is permitted by browsers
            });
        }
      }
    }
  }, [isMuted, isPlaying]);

  // Autoplay video automatically on mount and whenever videoUrl updates
  useEffect(() => {
    if (isVideo && !isEmbedVideo && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = isMuted;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Keep state synchronized if restricted
          });
      }
    }
  }, [card.videoUrl, isVideo, isEmbedVideo, isMuted]);

  // Dedicated Play/Pause handler - ONLY this button or the paused center button controls playback
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
        setIsPlaying(true);
      }
    }
  };

  // Dedicated Mute/Unmute handler
  const handleToggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  // Card click: toggles content details in Hover/Tap mode AND unconditionally toggles video controls on touch screen
  const handleCardClick = () => {
    if (isHoverOnly) {
      setIsTouchActive(prev => !prev);
    }
    // Video controls unconditionally toggle on tap for touch screens regardless of contentDisplayMode
    setIsControlsTouchVisible(prev => {
      const next = !prev;
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (next) {
        controlsTimeoutRef.current = setTimeout(() => {
          setIsControlsTouchVisible(false);
        }, 4000);
      }
      return next;
    });
  };

  const getMediaFitClass = (fit?: 'crop' | 'fit' | 'fill' | 'pad') => {
    switch (fit) {
      case 'fit':
        return 'object-contain';
      case 'fill':
        return 'object-fill';
      case 'pad':
        return 'object-contain p-2.5 sm:p-3.5 bg-stone-950/90';
      case 'crop':
      default:
        return 'object-cover';
    }
  };
  const mediaFitClass = getMediaFitClass(card.promoCardMediaFit);

  // Custom Video Controls with site-specific styling - ALWAYS AND UNCONDITIONALLY hover by mouse OR tap on touch screen
  const customVideoControls = isVideo && !isEmbedVideo && (
    <div 
      className={`flex items-center gap-1.5 z-30 transition-all duration-300 ${
        isControlsTouchVisible
          ? 'opacity-100 pointer-events-auto translate-y-0'
          : 'opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none -translate-y-1 group-hover:translate-y-0'
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={handleTogglePlay}
        className="h-8 px-2.5 rounded-full bg-stone-950/85 hover:bg-stone-950 text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 border border-white/20 cursor-pointer pointer-events-auto"
        title={isPlaying ? "إيقاف مؤقت للفيديو" : "تشغيل / استئناف الفيديو"}
        aria-label={isPlaying ? "إيقاف مؤقت للفيديو" : "تشغيل / استئناف الفيديو"}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5 fill-white text-white" />
            <span className="text-[10px] font-bold text-stone-200">إيقاف</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 mr-0.5" />
            <span className="text-[10px] font-bold text-emerald-400">تشغيل</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleToggleMute}
        className="w-8 h-8 rounded-full bg-stone-950/85 hover:bg-stone-950 text-white flex items-center justify-center transition-all shadow-md active:scale-95 border border-white/20 cursor-pointer pointer-events-auto"
        title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
        aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-stone-300" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
        )}
      </button>
    </div>
  );

  // Center play button overlay when visitor has paused the video
  const centerPausedOverlay = isVideo && !isEmbedVideo && !isPlaying && (
    <div
      onClick={handleTogglePlay}
      className="absolute inset-0 flex items-center justify-center z-25 cursor-pointer pointer-events-auto bg-black/25 transition-all"
    >
      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-stone-950/85 hover:bg-stone-950 text-white flex items-center justify-center shadow-xl border-2 border-emerald-400/90 transition-transform hover:scale-105 active:scale-95">
        <Play className="w-6 h-6 fill-white text-white mr-0.5" />
      </div>
    </div>
  );

  // Render Layout: Full overlay format (Background media with floating content)
  if (isLayoutFull) {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative bg-stone-900 rounded-2xl sm:rounded-3xl border-2 border-amber-400/90 ring-2 ring-amber-400/40 shadow-[0_0_22px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)] hover:border-amber-400 transition-all duration-300 overflow-hidden w-full h-full min-h-[390px] sm:min-h-[440px] flex flex-col justify-end select-none cursor-pointer ${className}`}
        dir="rtl"
      >
        {/* Absolute Background Media */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          {isVideo ? (
            isEmbedVideo ? (
              <iframe
                src={getEmbedUrl(card.videoUrl)}
                title={card.title}
                className="w-full h-full border-0 pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={setVideoElementRef}
                src={card.videoUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className={`w-full h-full pointer-events-none ${mediaFitClass}`}
              />
            )
          ) : card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.title}
              className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${mediaFitClass}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900 to-stone-950 text-amber-200 p-4 text-center">
              <Sparkles className="h-10 w-10 text-amber-500 mb-2" />
              <span className="text-xs font-black">{card.businessName || 'مساحة ترويجية مميزة'}</span>
            </div>
          )}
        </div>

        {/* Centered Resume Button when paused */}
        {centerPausedOverlay}

        {/* Dark gradient overlay for text legibility */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/65 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
            isHoverOnly
              ? isTouchActive
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
              : 'opacity-100'
          }`} 
        />

        {/* Permanent Top Sponsored Badge */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md border border-amber-300/60 pointer-events-none">
          <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0 text-amber-950" />
          <span>ممول</span>
        </div>

        {/* Top Left: Business Logo/Name + Custom Video Controls */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 flex items-center gap-1.5">
          {card.businessName && (
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[11px] font-bold pointer-events-none">
              {card.businessLogo && (
                <img src={card.businessLogo} alt="" className="w-4 h-4 rounded-full object-cover" />
              )}
              <span className="truncate max-w-[120px]">{card.businessName}</span>
            </div>
          )}
          {customVideoControls}
        </div>

        {/* Tap notice for touch devices when details are hidden */}
        {isHoverOnly && !isTouchActive && (
          <div className="sm:hidden absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-300/30">
            <Touchpad className="w-3 h-3" />
            <span>انقر لإظهار التفاصيل</span>
          </div>
        )}

        {/* Floating Content over media */}
        <div 
          className={`relative z-20 p-5 sm:p-6 space-y-4 flex flex-col justify-end transition-all duration-300 ${
            isHoverOnly
              ? isTouchActive
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
              : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
          onClick={(e) => {
            if (isHoverOnly) e.stopPropagation();
          }}
        >
          <div className="space-y-1.5 text-right">
            <h3 className="font-black text-white text-base sm:text-lg leading-snug line-clamp-2">
              {card.title}
            </h3>

            {card.subtitle && (
              <p className="text-stone-200 text-xs sm:text-sm leading-relaxed line-clamp-2 font-medium">
                {card.subtitle}
              </p>
            )}
          </div>

          <div>
            {isExternalLink ? (
              <a
                href={actionTarget}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-stone-950 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>{actionText}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link
                to={actionTarget}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-stone-950 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>{actionText}</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Layout: Standard format (Top media container + Bottom details body)
  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-400/90 ring-2 ring-amber-400/40 shadow-[0_0_22px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)] hover:border-amber-400 transition-all duration-300 overflow-hidden w-full h-full min-h-[390px] sm:min-h-[440px] flex flex-col justify-between ${className}`}
      dir="rtl"
    >
      {/* Permanent Top Sponsored Badge */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md border border-amber-300/60 pointer-events-none">
        <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0 text-amber-950" />
        <span>ممول</span>
      </div>

      <div className="flex flex-col flex-1">
        {/* Media Container */}
        <div className="relative aspect-[16/10] sm:h-52 w-full bg-stone-900 overflow-hidden shrink-0">
          {isVideo ? (
            isEmbedVideo ? (
              <iframe
                src={getEmbedUrl(card.videoUrl)}
                title={card.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={setVideoElementRef}
                src={card.videoUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className={`w-full h-full pointer-events-none ${mediaFitClass}`}
              />
            )
          ) : card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.title}
              className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${mediaFitClass}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 p-4 text-center">
              <Sparkles className="h-10 w-10 text-amber-600 mb-2" />
              <span className="text-xs font-black">{card.businessName || 'مساحة ترويجية مميزة'}</span>
            </div>
          )}

          {/* Centered Resume Button when paused */}
          {centerPausedOverlay}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Top Left: Custom Video Controls */}
          <div className="absolute top-2.5 left-2.5 z-30">
            {customVideoControls}
          </div>

          {/* Business indicator if available */}
          {card.businessName && (
            <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[11px] font-bold">
              {card.businessLogo && (
                <img src={card.businessLogo} alt="" className="w-4 h-4 rounded-full object-cover" />
              )}
              <span className="truncate max-w-[140px]">{card.businessName}</span>
            </div>
          )}

          {/* Tap notice for touch devices in standard layout */}
          {isHoverOnly && !isTouchActive && (
            <div className="sm:hidden absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-300/30">
              <Touchpad className="w-3 h-3" />
              <span>انقر للتفاصيل</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div 
          className={`p-4 sm:p-5 flex-1 flex flex-col justify-between transition-all duration-300 ${
            isHoverOnly
              ? isTouchActive
                ? 'opacity-100 translate-y-0'
                : 'opacity-25 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
              : 'opacity-100 translate-y-0'
          }`}
          onClick={(e) => {
            if (isHoverOnly) e.stopPropagation();
          }}
        >
          <div className="space-y-1.5">
            <h3 className="font-black text-stone-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#1a4d2e] transition-colors">
              {card.title}
            </h3>

            {card.subtitle && (
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed line-clamp-2 font-medium">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div 
        className={`p-4 sm:p-5 pt-0 transition-all duration-300 ${
          isHoverOnly
            ? isTouchActive
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        }`}
        onClick={(e) => {
          if (isHoverOnly) e.stopPropagation();
        }}
      >
        {isExternalLink ? (
          <a
            href={actionTarget}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#1a4d2e] hover:bg-[#143d24] text-white py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer"
          >
            <span>{actionText}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link
            to={actionTarget}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#1a4d2e] hover:bg-[#143d24] text-white py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer"
          >
            <span>{actionText}</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
