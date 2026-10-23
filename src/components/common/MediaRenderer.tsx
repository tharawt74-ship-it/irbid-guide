import React, { useState } from 'react';
import { Play, ExternalLink, Image as ImageIcon, Video, Maximize2, X } from 'lucide-react';
import { parseVideoUrl } from '../../lib/videoUtils';

interface MediaRendererProps {
  type: 'image' | 'video';
  url: string;
  caption?: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto' | 'banner';
  autoPlay?: boolean;
}

export function MediaRenderer({
  type,
  url,
  caption,
  className = '',
  aspectRatio = 'video',
  autoPlay = false
}: MediaRendererProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!url || !url.trim()) return null;

  const parsedVideo = type === 'video' ? parseVideoUrl(url) : null;

  const aspectClass = 
    aspectRatio === 'video' ? 'aspect-video' :
    aspectRatio === 'square' ? 'aspect-square' :
    aspectRatio === 'banner' ? 'aspect-[21/9]' : 'aspect-auto';

  // Video renderer
  if (type === 'video') {
    if (!parsedVideo) {
      return (
        <div className={`space-y-2 ${className}`}>
          <div className={`relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-md ${aspectClass}`}>
            <iframe
              src={url}
              title={caption || 'فيديو'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          {caption && (
            <p className="text-xs text-stone-600 font-medium px-1 text-right flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#1a4d2e]" />
              <span>{caption}</span>
            </p>
          )}
        </div>
      );
    }

    if (parsedVideo.platform === 'direct') {
      return (
        <div className={`relative rounded-2xl overflow-hidden bg-black ${className}`}>
          <video
            src={parsedVideo.embedUrl || parsedVideo.originalUrl}
            controls
            playsInline
            autoPlay={autoPlay}
            className={`w-full ${aspectClass} object-cover rounded-2xl`}
          />
          {caption && (
            <div className="p-3 bg-stone-900/80 text-white text-xs font-medium text-right backdrop-blur-xs">
              {caption}
            </div>
          )}
        </div>
      );
    }

    if (parsedVideo.embedUrl) {
      return (
        <div className={`space-y-2 ${className}`}>
          <div className={`relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-md ${aspectClass}`}>
            <iframe
              src={parsedVideo.embedUrl}
              title={caption || 'فيديو'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          {caption && (
            <p className="text-xs text-stone-600 font-medium px-1 text-right flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#1a4d2e]" />
              <span>{caption}</span>
            </p>
          )}
        </div>
      );
    }

    // Fallback for tiktok / unsupported direct embed link
    return (
      <div className={`p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 text-white text-center space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-amber-400">
          <Play className="h-6 w-6 fill-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold">مشاهدة مقطع الفيديو على المنصة الرسمية</h4>
          {caption && <p className="text-xs text-stone-300 mt-1">{caption}</p>}
        </div>
        <a
          href={parsedVideo.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4b] hover:from-[#133b22] hover:to-[#1a4d2e] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          <span>فتح وتشغيل الفيديو</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // Image renderer
  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <div 
          onClick={() => setShowLightbox(true)}
          className={`relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group cursor-pointer shadow-xs hover:shadow-md transition-all ${aspectClass}`}
        >
          <img
            src={url}
            alt={caption || 'صورة المحل'}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-stone-900/80 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs">
              <Maximize2 className="h-3.5 w-3.5" />
              تكبير الصورة
            </span>
          </div>
        </div>
        {caption && (
          <p className="text-xs text-stone-600 font-medium px-1 text-right flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-[#1a4d2e]" />
            <span>{caption}</span>
          </p>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={url}
              alt={caption || 'صورة المحل'}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            {caption && (
              <div className="bg-stone-900/90 text-white text-sm font-bold px-4 py-2 rounded-xl text-center backdrop-blur-xs border border-white/10">
                {caption}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
