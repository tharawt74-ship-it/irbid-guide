/**
 * Utility functions for video URL parsing and embedding
 */

export interface ParsedVideoInfo {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'vimeo' | 'drive' | 'direct' | 'unknown';
  embedUrl: string | null;
  videoId?: string;
  originalUrl: string;
}

export function parseVideoUrl(url: string | undefined | null): ParsedVideoInfo | null {
  if (!url || typeof url !== 'string') return null;
  let cleaned = url.trim();
  if (!cleaned) return null;

  // Extract src if full iframe HTML was pasted
  if (cleaned.includes('<iframe') && cleaned.includes('src=')) {
    const match = cleaned.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  // Ensure protocol
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('//') && !cleaned.startsWith('data:') && !cleaned.startsWith('blob:')) {
    cleaned = 'https://' + cleaned;
  }

  // Direct video files (.mp4, .webm, .ogg, .mov, firebase storage videos, etc.)
  if (
    /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i.test(cleaned) || 
    (cleaned.includes('firebasestorage') && (cleaned.includes('video') || cleaned.includes('.mp4') || cleaned.includes('.mov')))
  ) {
    return {
      platform: 'direct',
      embedUrl: cleaned,
      originalUrl: cleaned
    };
  }

  // YouTube (standard, shorts, youtu.be, embed, m.youtube.com)
  if (cleaned.includes('youtube.com') || cleaned.includes('youtu.be')) {
    let videoId = '';
    if (cleaned.includes('shorts/')) {
      const parts = cleaned.split('shorts/');
      videoId = parts[1]?.split(/[?#&/]/)[0] || '';
    } else if (cleaned.includes('youtu.be/')) {
      const parts = cleaned.split('youtu.be/');
      videoId = parts[1]?.split(/[?#&/]/)[0] || '';
    } else if (cleaned.includes('embed/')) {
      const parts = cleaned.split('embed/');
      videoId = parts[1]?.split(/[?#&/]/)[0] || '';
    } else if (cleaned.includes('watch')) {
      try {
        const parsed = new URL(cleaned);
        videoId = parsed.searchParams.get('v') || '';
      } catch {
        const match = cleaned.match(/[?&]v=([^&#]+)/);
        if (match) videoId = match[1];
      }
    } else {
      // Direct ID after youtube.com/
      const match = cleaned.match(/youtube\.com\/([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }

    if (videoId) {
      return {
        platform: 'youtube',
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1`,
        originalUrl: cleaned
      };
    }
  }

  // Vimeo
  if (cleaned.includes('vimeo.com')) {
    const match = cleaned.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
    if (match && match[3]) {
      return {
        platform: 'vimeo',
        videoId: match[3],
        embedUrl: `https://player.vimeo.com/video/${match[3]}`,
        originalUrl: cleaned
      };
    }
  }

  // Google Drive
  if (cleaned.includes('drive.google.com')) {
    const match = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        platform: 'drive',
        videoId: match[1],
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        originalUrl: cleaned
      };
    }
  }

  // Instagram Reels, Posts, TV
  if (cleaned.includes('instagram.com')) {
    let code = '';
    if (cleaned.includes('/reel/')) {
      code = cleaned.split('/reel/')[1]?.split(/[/?#&]/)[0] || '';
    } else if (cleaned.includes('/reels/')) {
      code = cleaned.split('/reels/')[1]?.split(/[/?#&]/)[0] || '';
    } else if (cleaned.includes('/p/')) {
      code = cleaned.split('/p/')[1]?.split(/[/?#&]/)[0] || '';
    } else if (cleaned.includes('/tv/')) {
      code = cleaned.split('/tv/')[1]?.split(/[/?#&]/)[0] || '';
    }

    if (code) {
      return {
        platform: 'instagram',
        videoId: code,
        embedUrl: `https://www.instagram.com/reel/${code}/embed/?theme=dark&hidecaption=true`,
        originalUrl: cleaned
      };
    }
  }

  // TikTok
  if (cleaned.includes('tiktok.com')) {
    const match = cleaned.match(/\/video\/(\d+)/);
    if (match && match[1]) {
      return {
        platform: 'tiktok',
        videoId: match[1],
        embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
        originalUrl: cleaned
      };
    }
    return {
      platform: 'tiktok',
      embedUrl: null,
      originalUrl: cleaned
    };
  }

  // Facebook
  if (cleaned.includes('facebook.com') || cleaned.includes('fb.watch')) {
    return {
      platform: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleaned)}&show_text=0&width=500`,
      originalUrl: cleaned
    };
  }

  // Fallback direct / unknown embed URL
  return {
    platform: 'unknown',
    embedUrl: cleaned,
    originalUrl: cleaned
  };
}
