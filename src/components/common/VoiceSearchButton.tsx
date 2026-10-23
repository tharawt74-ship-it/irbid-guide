import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  title?: string;
}

export function VoiceSearchButton({
  onTranscript,
  className = '',
  size = 'md',
  variant = 'light',
  title = 'البحث الصوتي'
}: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleToggleListening = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('خاصية الإدخال الصوتي غير مدعومة في هذا المتصفح');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const isInsideIframe = window.self !== window.top;

    // Prompt browser for microphone permission if needed
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.warn('Microphone permission check failed:', err);
        if (isInsideIframe) {
          setErrorMessage('المتصفح يحظر المايك داخل إطار المعاينة، افتح الموقع برابط مستقل');
          return;
        }
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح');
          return;
        }
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'ar-JO';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          onTranscript(transcript.trim());
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          if (isInsideIframe) {
            setErrorMessage('المتصفح يحظر المايك داخل إطار المعاينة، افتح الموقع برابط مستقل');
          } else {
            setErrorMessage('يرجى السماح بالوصول إلى الميكروفون للبحث الصوتي');
          }
        } else if (event.error === 'no-speech') {
          // Silent timeout
        } else if (event.error === 'language-not-supported') {
          try {
            recognition.lang = 'ar-SA';
            recognition.start();
            return;
          } catch {
            setErrorMessage('لغة التعرف الصوتي غير مدعومة');
          }
        } else {
          setErrorMessage('تعذر التقاط الصوت، حاول مجدداً');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      if (isInsideIframe) {
        setErrorMessage('المتصفح يحظر المايك داخل إطار المعاينة، افتح الموقع برابط مستقل');
      } else {
        setErrorMessage('تعذر تشغيل الإدخال الصوتي');
      }
    }
  };

  // Dimensions & sizes
  const sizeClasses = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-8 h-8 p-1.5 text-sm',
    lg: 'w-10 h-10 md:w-11 md:h-11 p-2 text-base'
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5 md:w-6 md:h-6'
  }[size];

  // Colors & visual states
  let colorClasses = '';
  if (isListening) {
    colorClasses = 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30 animate-pulse';
  } else if (variant === 'dark') {
    colorClasses = 'text-white/80 hover:text-white hover:bg-white/15 bg-white/5 border border-white/20';
  } else {
    colorClasses = 'text-stone-400 hover:text-stone-700 hover:bg-stone-100 bg-transparent';
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggleListening}
        className={`rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 ${sizeClasses} ${colorClasses} ${className}`}
        title={isListening ? 'جاري الاستماع... اضغط للإيقاف' : title}
        aria-label={isListening ? 'جاري الاستماع' : 'البحث الصوتي'}
      >
        {isListening ? (
          <Mic className={`${iconSizes} animate-bounce text-white`} />
        ) : (
          <Mic className={iconSizes} />
        )}
      </button>

      {errorMessage && (
        <div 
          role="alert" 
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-stone-700 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
