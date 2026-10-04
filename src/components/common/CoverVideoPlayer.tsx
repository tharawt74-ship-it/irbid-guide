import React, { useState, useRef } from 'react';
import { parseVideoUrl } from '../../lib/videoUtils';
import { Volume2, VolumeX, Play, Pause, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface CoverVideoPlayerProps {
  videoUrl: string;
  posterImage?: string;
  isHovered?: boolean; // When true (on card hover), play the video
  className?: string;
  autoPlay?: boolean; // For detail page banner
  controlsPosition?: 'top-left' | 'bottom-left';
  extraControls?: React.ReactNode; // Extra buttons to place beside video controls (e.g., Favorite, Share)
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showOnlyMuteControl?: boolean; // When true, shows only the mute button (for cards on hover)
}

export function CoverVideoPlayer({
  videoUrl,
  posterImage,
  isHovered = false,
  className = "w-full h-full object-cover",
  autoPlay = false,
  controlsPosition = 'bottom-left',
  extraControls,
  isExpanded: externalIsExpanded,
  onToggleExpand,
  showOnlyMuteControl = false
}: CoverVideoPlayerProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const parsed = parseVideoUrl(videoUrl);

  const baseShouldPlay = autoPlay || isHovered;
  const shouldPlay = baseShouldPlay && isPlaying;

  if (!parsed || !parsed.embedUrl) {
    if (posterImage) {
      return (
        <div className="relative w-full h-full overflow-hidden">
          <img
            src={posterImage}
            alt="الغلاف"
            className={className}
          />
          {extraControls && controlsPosition === 'top-left' && (
            <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-1.5">
              {extraControls}
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  // Memoize stable embed URL with enablejsapi=1 so postMessage commands work without reloading iframe src
  const embedUrlWithApi = React.useMemo(() => {
    if (!parsed || !parsed.embedUrl) return '';
    if (parsed.platform === 'youtube' && parsed.videoId) {
      return `https://www.youtube-nocookie.com/embed/${parsed.videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${parsed.videoId}&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1&fs=0&autohide=1&cc_load_policy=0`;
    } else if (parsed.platform === 'vimeo' && parsed.videoId) {
      return `https://player.vimeo.com/video/${parsed.videoId}?autoplay=1&muted=1&controls=0&loop=1&background=1&title=0&byline=0&portrait=0`;
    } else if (parsed.platform === 'facebook') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(parsed.originalUrl)}&show_text=false&autoplay=true&mute=1`;
    }
    return parsed.embedUrl;
  }, [parsed?.videoId, parsed?.platform, parsed?.originalUrl]);

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (parsed.platform === 'direct' && videoRef.current) {
      videoRef.current.muted = nextMuted;
    } else if (iframeRef.current && iframeRef.current.contentWindow) {
      if (parsed.platform === 'youtube') {
        const cmd = nextMuted ? 'mute' : 'unMute';
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        );
      } else if (parsed.platform === 'vimeo') {
        const val = nextMuted ? 0 : 1;
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'setVolume', value: val }),
          '*'
        );
      }
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (parsed.platform === 'direct' && videoRef.current) {
      if (nextPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    } else if (iframeRef.current && iframeRef.current.contentWindow) {
      if (parsed.platform === 'youtube') {
        const cmd = nextPlaying ? 'playVideo' : 'pauseVideo';
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        );
      } else if (parsed.platform === 'vimeo') {
        const method = nextPlaying ? 'play' : 'pause';
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method }),
          '*'
        );
      }
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalIsExpanded(prev => !prev);
    }
  };

  const controlsPositionClass =
    controlsPosition === 'top-left'
      ? 'top-3.5 left-3.5'
      : 'bottom-3 left-3';

  // Responsive scale & fit transition
  const isSocialPlatform = parsed.platform === 'facebook' || parsed.platform === 'instagram' || parsed.platform === 'tiktok';
  const iframeScaleClass = (isExpanded || isSocialPlatform)
    ? 'w-full h-full object-cover scale-100'
    : 'w-[155%] h-[155%] sm:w-[210%] sm:h-[210%] md:w-[250%] md:h-[250%] lg:w-[280%] lg:h-[280%] object-cover';

  return (
    <div className="relative w-full h-full overflow-hidden group/covervideo select-none transition-all duration-500 ease-in-out">
      {/* Poster Image shown when not hovered / not playing */}
      {posterImage && !shouldPlay && (
        <img
          src={posterImage}
          alt="صورة الغلاف"
          className={`${className} transition-opacity duration-500`}
        />
      )}

      {/* Video element or cropped iframe when playing */}
      {shouldPlay && (
        <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center transition-all duration-500 ease-in-out">
          {parsed.platform === 'direct' ? (
            <video
              ref={videoRef}
              src={parsed.originalUrl}
              autoPlay={shouldPlay}
              loop
              muted={isMuted}
              playsInline
              className={`w-full h-full pointer-events-none transition-all duration-500 ease-in-out ${isExpanded ? 'object-contain' : 'object-cover'}`}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none transition-all duration-500 ease-in-out">
              <iframe
                ref={iframeRef}
                src={embedUrlWithApi}
                title="فيديو الغلاف"
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full max-w-none max-h-none border-0 pointer-events-none transition-all duration-500 ease-in-out ${iframeScaleClass}`}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            </div>
          )}

          {/* Transparent blocker overlay so native platform controls/popups are never clickable */}
          <div className="absolute inset-0 z-10 bg-transparent pointer-events-none" />
        </div>
      )}

      {/* Control Buttons Container (Top-Left or Bottom-Left) */}
      <div className={`absolute ${controlsPositionClass} z-30 flex items-center gap-1.5`}>
        {/* Play / Pause Toggle Button */}
        {baseShouldPlay && !showOnlyMuteControl && (
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
            title={isPlaying ? "إيقاف مؤقت" : "تشغيل الفيديو"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white fill-white translate-x-0.5" />
            )}
          </button>
        )}

        {/* Sound / Mute Toggle Button */}
        {shouldPlay && (
          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
            title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-white/80" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        {/* 3rd Button: Expand / Restore Video View (Available on Mobile, Tablet & Desktop) */}
        {shouldPlay && !showOnlyMuteControl && (
          <button
            type="button"
            onClick={handleExpandClick}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
            title={isExpanded ? "إعادة الحجم الطبيعي للغلاف" : "توسيع الغلاف لنسق الفيديو الكامل"}
            aria-label={isExpanded ? "إعادة الحجم الطبيعي للغلاف" : "توسيع الغلاف لنسق الفيديو الكامل"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-amber-400 transition-transform duration-300" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white transition-transform duration-300" />
            )}
          </button>
        )}

        {/* Facebook direct link button if platform is Facebook */}
        {shouldPlay && parsed.platform === 'facebook' && (
          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-8 px-2.5 rounded-full bg-blue-600/80 hover:bg-blue-600 backdrop-blur-md text-white border border-blue-400/30 flex items-center gap-1.5 text-xs font-medium shadow-md transition-all cursor-pointer active:scale-95"
            title="مشاهدة الفيديو مباشرة على فيسبوك"
          >
            <ExternalLink className="h-3.5 w-3.5 text-white" />
            <span className="hidden xs:inline">فيسبوك</span>
          </a>
        )}
        {extraControls}
      </div>

      {/* When video is available but not hovering and controls are bottom-left, show subtle video indicator */}
      {!baseShouldPlay && controlsPosition === 'bottom-left' && (
        <div className="absolute bottom-3 left-3 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center pointer-events-none shadow-xs">
          <Play className="h-3.5 w-3.5 fill-white text-white translate-x-0.5" />
        </div>
      )}
    </div>
  );
}
