import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Bot, 
  Send, 
  X, 
  RotateCcw, 
  Sparkles, 
  Minimize2, 
  Maximize2,
  ExternalLink,
  MessageCircle,
  Phone,
  MapPin,
  Star,
  Store,
  ChevronLeft,
  Clock,
  ShoppingCart,
  Zap,
  PlusCircle,
  CheckCircle2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  askAiAssistant, 
  ChatMessage, 
  ActionLink, 
  BusinessCardItem,
  reportMissingPlaceLead 
} from '../../lib/aiAssistantService';
import { useCart } from '../../contexts/CartContext';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { playAiHoverSound, playAiClickSound } from '../../utils/aiSoundEffects';

// Helper to format basic markdown to JSX safely
const formatMarkdown = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

export function AiSiteAssistant() {
  const navigate = useNavigate();
  const { addItem, totalCount } = useCart();
  const { globalSettings } = useSystemSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(() => {
    return localStorage.getItem('shofi_ai_opened_once') === 'true';
  });

  // Sync isOpen state with global events and localStorage
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ai-assistant-state-changed', { detail: { isOpen } }));
    if (isOpen) {
      setHasOpenedOnce(true);
      localStorage.setItem('shofi_ai_opened_once', 'true');
    }
  }, [isOpen]);

  // Cart toast notification feedback
  const [cartToast, setCartToast] = useState<{ message: string; itemName: string } | null>(null);

  // Missing place lead tracking
  const [missingLeadSubmitted, setMissingLeadSubmitted] = useState<{ [key: string]: boolean }>({});
  const [missingLeadPhone, setMissingLeadPhone] = useState<{ [key: string]: string }>({});

  const initialGreeting: ChatMessage = {
    id: 'welcome-msg',
    sender: 'assistant',
    text: `مرحباً بك في **شو في بإربد؟** 🌸✨\n\nأنا **ربداوي AI** 🤖، مرشدك التفاعلي المجاني:\n- 🟢 **معرفة المحلات المفتوحة الآن** وساعات عملها.\n- 🏢 **فلترة السكنات والشقق** حسب الجامعة والميزانية.\n- 🏷️ **مقارنة الأسعار والعروض** واختيار الأوفر لك.\n- 🛒 **إضافة للسلة والطلب الفوري** من داخل الشات.\n- 📢 **تسجيل المحلات غير الموجودة** لإضافتها فوراً.\n\nاكتب لي ما الذي تبحث عنه في إربد وسأساعدك فوراً!`,
    actions: [
      { label: '🟢 مطاعم مفتوحة الآن', path: '/search?category=مطاعم' },
      { label: '🏠 سكنات طالبات اليرموك', path: '/housing?q=طالبات' },
      { label: '🏷️ مقارنة أقوى العروض', path: '/offers' },
      { label: '💼 وظائف شاغرة اليوم', path: '/jobs' },
      { label: '🕌 مواقيت الصلاة بإربد', path: '/prayer-times' },
      { label: '🚌 خطوط الباصات', path: '/transportation' }
    ],
    timestamp: Date.now()
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Global window event listeners to toggle/open assistant from mobile navbar or anywhere
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true);
      setHasOpenedOnce(true);
      if (e?.detail?.query) {
        handleSendMessage(e.detail.query);
      }
    };

    const handleToggleEvent = () => {
      setIsOpen(prev => !prev);
      setHasOpenedOnce(true);
    };

    window.addEventListener('open-ai-assistant', handleOpenEvent);
    window.addEventListener('toggle-ai-assistant', handleToggleEvent);

    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenEvent);
      window.removeEventListener('toggle-ai-assistant', handleToggleEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [messages, isOpen]);

  // Handle Cart Toast timeout
  useEffect(() => {
    if (cartToast) {
      const t = setTimeout(() => setCartToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [cartToast]);

  // If AI Assistant is disabled by Admin, hide completely
  if (globalSettings?.enableAiAssistant === false) {
    return null;
  }

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsFullScreen(false);
    } else {
      setIsOpen(true);
      setHasOpenedOnce(true);
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    playAiClickSound();

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askAiAssistant(text);
      const aiMsg: ChatMessage = {
        id: 'msg-ai-' + Date.now(),
        sender: 'assistant',
        text: response.text,
        actions: response.actions,
        cards: response.cards,
        appliedFilters: response.appliedFilters,
        isMissingPlace: response.isMissingPlace,
        missingPlaceName: response.missingPlaceName,
        comparisonMode: response.comparisonMode,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: 'msg-err-' + Date.now(),
        sender: 'assistant',
        text: 'أنا في خدمتك دائماً! يمكنك استكشاف خدمات المنصة عبر الأقسام التالية:',
        actions: [
          { label: '🔍 البحث في المنصة', path: '/search' },
          { label: '🍽️ المطاعم والكافيهات', path: '/search?category=مطاعم' },
          { label: '🏠 الشقق والسكنات', path: '/housing' },
          { label: '🏷️ قسم العروض', path: '/offers' }
        ],
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: ActionLink) => {
    navigate(action.path);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialGreeting]);
  };

  // Feature #4: Add to Cart handler
  const handleAddToCart = (card: BusinessCardItem) => {
    if (!card.cartItemData) {
      // Fallback sample product
      const pVal = card.price ? String(card.price).replace(/[^\d.]/g, '') || '5' : '5';
      addItem(
        {
          id: `product-${card.id}`,
          name: card.name,
          price: pVal,
          imageUrl: card.imageUrl,
          category: card.category
        },
        {
          id: card.id,
          name: card.name,
          phone: card.phone || card.whatsapp
        }
      );
    } else {
      const itemPriceStr = typeof card.cartItemData.price === 'number'
        ? String(card.cartItemData.price)
        : String(card.cartItemData.price).replace(/[^\d.]/g, '') || '5';

      addItem(
        {
          id: card.cartItemData.id,
          name: card.cartItemData.name,
          price: itemPriceStr,
          originalPrice: card.cartItemData.originalPrice,
          imageUrl: card.cartItemData.image || card.imageUrl,
          category: card.cartItemData.category || card.category
        },
        {
          id: card.cartItemData.businessId,
          name: card.cartItemData.businessName,
          phone: card.cartItemData.businessPhone || card.phone
        }
      );
    }

    setCartToast({
      message: 'تمت الإضافة إلى سلة التسوق!',
      itemName: card.name
    });
  };

  // Feature #4: Instant WhatsApp Order with context-aware template
  const handleInstantOrder = (card: BusinessCardItem) => {
    const rawNumber = card.whatsapp || card.phone || '';
    const cleanNum = rawNumber.replace(/\D/g, '');
    const finalNumber = cleanNum.startsWith('962') ? cleanNum : cleanNum.startsWith('0') ? '962' + cleanNum.slice(1) : cleanNum;

    let messageText = '';
    if (card.type === 'job') {
      messageText = `مرحباً، أود التقديم للشاغر الوظيفي: "${card.name}" المعلن عنه في منصة "شو في بإربد؟". هل الشاغر ما زال متاحاً؟`;
    } else if (card.type === 'housing') {
      messageText = `مرحباً، أود الاستفسار عن حجز ومعاينة السكن: "${card.name}" المعروض على منصة "شو في بإربد؟".`;
    } else if (card.type === 'product') {
      messageText = `مرحباً، أود طلب المنتج: "${card.name}" ${card.price ? `بسعر ${card.price}` : ''} من خلال منصة "شو في بإربد؟".`;
    } else {
      messageText = `مرحباً ${card.name}، أود الاستفسار والطلب من خلال منصة "شو في بإربد؟" عن خدماتكم ومنتجاتكم.`;
    }

    const url = `https://wa.me/${finalNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Feature #5: Submit missing place lead
  const handleSubmitMissingLead = async (missingName: string) => {
    const phone = missingLeadPhone[missingName] || '';
    await reportMissingPlaceLead(missingName, phone, 'تم الإرسال من مساعد الشات الذكي');
    setMissingLeadSubmitted(prev => ({ ...prev, [missingName]: true }));
  };

  return (
    <>
      {/* Floating Trigger Button on the Right (Visible on md+ desktop/tablet, hidden on mobile in favor of bottom nav) */}
      <div 
        id="ai-assistant-trigger-container"
        className="hidden md:flex fixed bottom-8 right-6 lg:right-8 z-[80] items-center gap-3"
      >
        <motion.button
          id="ai-assistant-open-btn"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onMouseEnter={playAiHoverSound}
          onClick={() => {
            playAiClickSound();
            handleToggle();
          }}
          className={`relative group flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl transition-all duration-300 shrink-0 cursor-pointer ${
            isOpen 
              ? 'bg-[#153e25] text-white ring-4 ring-[#1a4d2e]/25 shadow-2xl' 
              : 'bg-[#1a4d2e] hover:bg-[#143d24] text-white shadow-[#1a4d2e]/35'
          }`}
          title={isOpen ? "إغلاق ربداوي AI" : "فتح ربداوي AI"}
          aria-label={isOpen ? "إغلاق ربداوي AI" : "فتح ربداوي AI"}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform group-hover:scale-110" />
          ) : (
            <Bot className="w-7 h-7 transition-transform group-hover:rotate-6 text-emerald-300" />
          )}
          
          {!hasOpenedOnce && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          )}

          {totalCount > 0 && (
            <span className="absolute -bottom-1 -left-1 bg-amber-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {totalCount}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 bg-white/98 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#1a4d2e]/20 shadow-xl text-xs font-bold text-[#1a4d2e] pointer-events-none whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>ربداوي AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Chat Assistant Modal / Drawer on the Right */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Soft Backdrop overlay on mobile or full-screen mode to prevent background distraction */}
            {(isFullScreen || window.innerWidth < 768) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-stone-950/30 backdrop-blur-[4px] z-[80] transition-opacity"
              />
            )}

            <motion.div
              id="ai-assistant-panel"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`fixed z-[90] sm:z-[9999] flex flex-col overflow-hidden bg-white text-stone-900 shadow-2xl shadow-emerald-950/10 border border-stone-100/90 transform-gpu will-change-transform ${
                isFullScreen
                  ? 'top-2 sm:top-4 bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 max-w-5xl mx-auto rounded-3xl h-[calc(100dvh-16px)] sm:h-[calc(100dvh-32px)]'
                  : 'bottom-[82px] sm:bottom-24 right-2.5 sm:right-8 left-2.5 sm:left-auto w-auto sm:w-[480px] max-w-[calc(100vw-20px)] sm:max-w-[480px] h-[calc(100dvh-100px)] sm:h-[min(720px,calc(100dvh-130px))] rounded-[28px]'
              }`}
              style={{ direction: 'rtl' }}
            >
              {/* Ultra Modern Header - Minimalist & Elegant */}
              <div className="bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between select-none shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    {/* Glowing outer aura */}
                    <span className="absolute inset-0 rounded-full bg-emerald-500/10 blur-[6px] animate-pulse"></span>
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#1a4d2e] to-[#2d824d] flex items-center justify-center border border-emerald-600/10 shadow-sm shrink-0">
                      <Bot className="w-5.5 h-5.5 text-white" />
                      <span className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-stone-900 text-sm sm:text-base tracking-tight leading-none">ربداوي AI</h3>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">
                        PRO 3.5
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-medium mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      مساعدك الذكي الحصري في إربد
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Reset Chat */}
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="بدء محادثة جديدة"
                    className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-50 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Full-screen toggle button */}
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? "الوضع المدمج" : "وضع ملء الشاشة"}
                    className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-50 rounded-xl transition-all duration-200 hidden sm:flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsFullScreen(false);
                    }}
                    title="إغلاق المساعد"
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Cart Toast Feedback */}
              <AnimatePresence>
                {cartToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-emerald-900/95 backdrop-blur-md text-white text-xs px-5 py-3 flex items-center justify-between shadow-lg z-10 border-b border-emerald-800/20"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                      <span>{cartToast.message} ({cartToast.itemName})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/cart');
                        if (window.innerWidth < 640) setIsOpen(false);
                      }}
                      className="bg-white text-emerald-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xs hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      عرض السلة ({totalCount})
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Body Container with warm background and editorial message spacing */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 bg-[#faf9f6]">
                {messages.length === 1 && (
                  /* Stunning ChatGPT/Gemini Landing State */
                  <div className="py-6 sm:py-8 flex flex-col items-center text-center space-y-6 max-w-sm mx-auto">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-emerald-50 to-emerald-200/50 flex items-center justify-center border border-emerald-500/20 shadow-xs"
                    >
                      <Sparkles className="w-8 h-8 text-[#1a4d2e]" />
                    </motion.div>
                    
                    <div className="space-y-2">
                      <h4 className="text-lg sm:text-xl font-extrabold text-stone-900">أهلاً بك، أنا ربداوي AI</h4>
                      <p className="text-xs sm:text-sm text-stone-500 leading-relaxed font-medium">
                        مساعدك الذكي الحصري في محافظة إربد. اسألني عن أي شيء، قارن العروض، استكشف السكنات، أو اطلب فورياً!
                      </p>
                    </div>

                    {/* Premium Bento Suggestions Grid */}
                    <div className="grid grid-cols-2 gap-2.5 w-full pt-4">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('كافيهات ومطاعم مفتوحة الآن')}
                        className="p-3 text-right rounded-2xl bg-white border border-stone-200/60 hover:border-emerald-600/30 hover:bg-emerald-50/25 transition-all text-stone-800 text-xs font-bold shadow-2xs cursor-pointer group active:scale-98"
                      >
                        <div className="text-base mb-1 group-hover:scale-110 transition-transform">🍔</div>
                        <div className="text-stone-900 font-extrabold">مطاعم مفتوحة</div>
                        <div className="text-[10px] text-stone-400 font-medium mt-0.5">ساعات عمل حية الآن</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage('قارن بين أقوى العروض الحالية في إربد')}
                        className="p-3 text-right rounded-2xl bg-white border border-stone-200/60 hover:border-emerald-600/30 hover:bg-emerald-50/25 transition-all text-stone-800 text-xs font-bold shadow-2xs cursor-pointer group active:scale-98"
                      >
                        <div className="text-base mb-1 group-hover:scale-110 transition-transform">🏷️</div>
                        <div className="text-stone-900 font-extrabold">مقارنة العروض</div>
                        <div className="text-[10px] text-stone-400 font-medium mt-0.5">أفضل الأسعار والتوفير</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage('سكن طالبات قرب جامعة اليرموك بسعر أقل من 150')}
                        className="p-3 text-right rounded-2xl bg-white border border-stone-200/60 hover:border-emerald-600/30 hover:bg-emerald-50/25 transition-all text-stone-800 text-xs font-bold shadow-2xs cursor-pointer group active:scale-98"
                      >
                        <div className="text-base mb-1 group-hover:scale-110 transition-transform">🏠</div>
                        <div className="text-stone-900 font-extrabold">سكنات طالبات</div>
                        <div className="text-[10px] text-stone-400 font-medium mt-0.5">قرب جامعة اليرموك</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage('وظائف مناسبة للطلاب والشباب في إربد')}
                        className="p-3 text-right rounded-2xl bg-white border border-stone-200/60 hover:border-emerald-600/30 hover:bg-emerald-50/25 transition-all text-stone-800 text-xs font-bold shadow-2xs cursor-pointer group active:scale-98"
                      >
                        <div className="text-base mb-1 group-hover:scale-110 transition-transform">💼</div>
                        <div className="text-stone-900 font-extrabold">شواغر ووظائف</div>
                        <div className="text-[10px] text-stone-400 font-medium mt-0.5">فرص تناسب الطلاب اليوم</div>
                      </button>
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  // Skip displaying the welcome message inside the regular feed if we are showing the landing state
                  if (msg.id === 'welcome-msg' && messages.length === 1) return null;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {msg.sender === 'assistant' ? (
                        <div className="flex items-start gap-3 max-w-[96%]">
                          {/* Modern small minimalist Bot Icon */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a4d2e] to-[#2d824d] text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                            <Bot className="w-4.5 h-4.5 text-white" />
                          </div>
                          
                          <div className="flex flex-col items-start min-w-0">
                            {/* Sophisticated ChatGPT style text block */}
                            <div className="bg-white text-stone-800 border border-stone-200/40 rounded-3xl rounded-tr-none px-4.5 py-3.5 text-xs sm:text-sm leading-relaxed shadow-3xs font-medium prose prose-stone">
                              <div className="whitespace-pre-line break-words">
                                {formatMarkdown(msg.text)}
                              </div>
                            </div>

                            {/* Applied Filters Badge Engine */}
                            {msg.appliedFilters && msg.appliedFilters.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
                                  <Tag className="w-2.5 h-2.5 text-[#1a4d2e]" />
                                  فلاتر منشطة:
                                </span>
                                {msg.appliedFilters.map((filt, idx) => (
                                  <span 
                                    key={idx}
                                    className="text-[10px] bg-stone-100 text-stone-700 font-bold px-2.5 py-0.5 rounded-lg border border-stone-200/50"
                                  >
                                    {filt}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Ultra Modern Bento Carousel Cards Grid */}
                            {msg.cards && msg.cards.length > 0 && (
                              <div className="mt-3.5 w-full max-w-full">
                                <div className="flex gap-3 overflow-x-auto pb-3 pt-0.5 scrollbar-none snap-x scroll-smooth">
                                  {msg.cards.map((card) => (
                                    <div
                                      key={card.id}
                                      className="snap-start w-[230px] sm:w-[250px] shrink-0 bg-white rounded-2xl border border-stone-200/85 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group text-right"
                                    >
                                      {/* Card Visual Layer */}
                                      <div className="h-28 w-full relative overflow-hidden bg-stone-50 border-b border-stone-100">
                                        {card.imageUrl ? (
                                          <img
                                            src={card.imageUrl}
                                            alt={card.name}
                                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = 'none';
                                            }}
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-stone-50 text-[#1a4d2e]">
                                            <Store className="w-7 h-7 opacity-30" />
                                          </div>
                                        )}

                                        {/* Status Hour Badge */}
                                        {card.type === 'business' && typeof card.isOpen === 'boolean' && (
                                          <div className="absolute top-2.5 right-2.5">
                                            {card.isOpen ? (
                                              <div className="bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse"></span>
                                                <span>{card.statusText || 'مفتوح'}</span>
                                              </div>
                                            ) : (
                                              <div className="bg-stone-900/80 backdrop-blur-md text-stone-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                                                <span>{card.statusText || 'مغلق'}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Discount percentage indicator */}
                                        {card.discountPercentage && (
                                          <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                                            <Tag className="w-2.5 h-2.5" />
                                            <span>خصم {card.discountPercentage}</span>
                                          </div>
                                        )}

                                        {/* Category tag */}
                                        <div className="absolute bottom-2.5 right-2.5 bg-stone-900/70 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-lg">
                                          {card.category}
                                        </div>

                                        {/* Rating display */}
                                        {card.rating && (
                                          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                                            <Star className="w-2.5 h-2.5 fill-current" />
                                            <span>{card.rating.toFixed(1)}</span>
                                          </div>
                                        )}

                                        {/* Premium Price Tag with elegant styling */}
                                        {card.price && (
                                          <div className="absolute bottom-2.5 left-2.5 bg-emerald-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1.5 border border-white/10">
                                            {card.oldPrice && (
                                              <span className="line-through text-stone-300 text-[9px]">{card.oldPrice}</span>
                                            )}
                                            <span className="font-extrabold text-emerald-300">{card.price}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Card Details & Actions */}
                                      <div className="p-3 flex flex-col justify-between flex-1 gap-2.5">
                                        <div>
                                          <div className="flex items-center gap-1">
                                            <h4 className="font-extrabold text-xs sm:text-sm text-stone-900 line-clamp-1 group-hover:text-[#1a4d2e] transition-colors">
                                              {card.name}
                                            </h4>
                                            {card.isVerified && (
                                              <span className="text-[#1a4d2e] text-[10px] shrink-0 font-bold" title="موثق">✓</span>
                                            )}
                                          </div>

                                          {card.address && (
                                            <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-1 line-clamp-1 font-medium">
                                              <MapPin className="w-3 h-3 shrink-0 text-emerald-600" />
                                              <span>{card.address}</span>
                                            </p>
                                          )}

                                          {card.hoursDisplay && (
                                            <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5 font-medium">
                                              <Clock className="w-2.5 h-2.5 text-emerald-600" />
                                              <span>{card.hoursDisplay}</span>
                                            </p>
                                          )}
                                        </div>

                                        {/* Elegant Instant Order & View details layout */}
                                        <div className="pt-2 border-t border-stone-100 flex flex-col gap-1.5">
                                          <div className="flex items-center gap-1.5">
                                            {card.canAddToCart && (
                                              <button
                                                type="button"
                                                onClick={() => handleAddToCart(card)}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                                                title="إضافة لسلة المشتريات"
                                              >
                                                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                                                <span>أضف للسلة</span>
                                              </button>
                                            )}

                                            {card.canOrderInstant && (
                                              <button
                                                type="button"
                                                onClick={() => handleInstantOrder(card)}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                                                title="طلب فوري عبر الواتساب"
                                              >
                                                <Zap className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                                                <span>طلب فوري</span>
                                              </button>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigate(card.path);
                                                if (window.innerWidth < 640) setIsOpen(false);
                                              }}
                                              className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[10px] font-extrabold py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-stone-200/50 active:scale-95 cursor-pointer"
                                            >
                                              <span>عرض التفاصيل</span>
                                              <ChevronLeft className="w-3 h-3 shrink-0" />
                                            </button>

                                            {card.whatsapp && (
                                              <a
                                                href={`https://wa.me/${card.whatsapp.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="واتساب"
                                                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200/40 transition-colors shrink-0"
                                              >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                              </a>
                                            )}

                                            {card.phone && (
                                              <a
                                                href={`tel:${card.phone}`}
                                                title="اتصال هاتف"
                                                className="p-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl border border-stone-200/40 transition-colors shrink-0"
                                              >
                                                <Phone className="w-3.5 h-3.5" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Missing Place Widget Form */}
                            {msg.isMissingPlace && msg.missingPlaceName && (
                              <div className="mt-3.5 w-full bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/70 rounded-2xl p-4 text-right">
                                <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>محل غير مسجل؟ أبلغنا وسنضيفه فوراً</span>
                                </div>
                                
                                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed font-medium">
                                  هل تبحث عن محل <strong>"{msg.missingPlaceName}"</strong>؟ اكتب رقم الهاتف إن وجد وسيتولى فريقنا التواصل معه وتوثيقه بالمنصة مجاناً:
                                </p>

                                {missingLeadSubmitted[msg.missingPlaceName] ? (
                                  <div className="mt-2.5 bg-emerald-100/90 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>🎉 شكراً لك! تم استلام طلبك، سنقوم بالتواصل مع المحل لإضافته للمنصة بأسرع وقت.</span>
                                  </div>
                                ) : (
                                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      placeholder="رقم هاتف المحل أو ملاحظة (اختياري)..."
                                      value={missingLeadPhone[msg.missingPlaceName] || ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setMissingLeadPhone(prev => ({ ...prev, [msg.missingPlaceName!]: v }));
                                      }}
                                      className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 font-medium"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitMissingLead(msg.missingPlaceName!)}
                                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      <span>أرسل الطلب</span>
                                    </button>
                                  </div>
                                )}

                                <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between">
                                  <span className="text-[10px] text-stone-500">هل أنت صاحب هذا المحل؟</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate('/packages');
                                      if (window.innerWidth < 640) setIsOpen(false);
                                    }}
                                    className="text-[11px] text-[#1a4d2e] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>وثّق نشاطك التجاري مجاناً</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Elegant Action Navigation Pills */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5 max-w-full">
                                {msg.actions.map((act, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleActionClick(act)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#1a4d2e] text-[#1a4d2e] hover:text-white border border-stone-200 hover:border-[#1a4d2e] rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 text-right cursor-pointer"
                                  >
                                    <span>{act.label}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                                  </button>
                                ))}
                              </div>
                            )}

                            <span className="text-[10px] text-stone-400 mt-1.5 px-1 font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Beautiful ChatGPT user message bubble design */
                        <div className="flex flex-col items-end max-w-[84%]">
                          <div className="bg-[#1a4d2e] text-white rounded-3xl rounded-tl-none px-4.5 py-3 text-xs sm:text-sm leading-relaxed shadow-3xs font-medium">
                            <div className="whitespace-pre-line break-words">
                              {formatMarkdown(msg.text)}
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-400 mt-1.5 px-1 font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Modern Generating / Thinking State Indicators */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs font-extrabold text-[#1a4d2e] bg-white border border-stone-100 px-4 py-3 rounded-2xl w-fit shadow-2xs"
                  >
                    <div className="flex gap-1.5 items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a4d2e] animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a4d2e] animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a4d2e] animate-bounce"></span>
                    </div>
                    <span>ربداوي AI يحلل قواعد البيانات...</span>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions Horizontal chips displayed above input form only when not on landing screen */}
              {messages.length > 1 && messages.length < 5 && (
                <div className="px-4 py-2.5 bg-[#faf9f6] border-t border-stone-150/40 overflow-x-auto no-scrollbar flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('كافيهات ومطاعم مفتوحة الآن')}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold transition-colors border border-emerald-200/60 cursor-pointer"
                  >
                    🟢 مطاعم مفتوحة الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('قارن بين أقوى العروض الحالية في إربد')}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold transition-colors border border-rose-200/60 cursor-pointer"
                  >
                    🏷️ مقارنة العروض
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('سكن طالبات قرب جامعة اليرموك بسعر أقل من 150')}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[#1a4d2e]/5 hover:bg-[#1a4d2e]/10 text-[#1a4d2e] text-[10px] font-bold transition-colors border border-[#1a4d2e]/20 cursor-pointer"
                  >
                    🏢 سكن طالبات اليرموك
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('وظائف مناسبة للطلاب والشباب في إربد')}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold transition-colors border border-amber-200/80 cursor-pointer"
                  >
                    💼 وظائف طلاب
                  </button>
                </div>
              )}

              {/* Chat Input Capsule - Symmetrical and Extremely Modern */}
              <div className="p-4 bg-white border-t border-stone-100 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 max-w-full"
                >
                  <div className="flex-1 relative flex items-center bg-stone-50 border border-stone-200/80 rounded-2xl focus-within:border-emerald-600 focus-within:bg-white transition-all pl-12">
                    <textarea
                      ref={inputRef as any}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="اسألني عن محلات، عروض، شقق، أو خدمات..."
                      className="w-full bg-transparent px-4 py-3.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none font-medium resize-none min-h-[44px] max-h-[120px] scrollbar-none"
                      rows={1}
                      disabled={isLoading}
                    />

                    {/* Subtle AI sparkle aesthetic details inside the prompt bar */}
                    <div className="absolute left-3.5 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-emerald-600/40 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="w-11 h-11 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] disabled:opacity-30 disabled:hover:bg-[#1a4d2e] text-white flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                    title="إرسال"
                  >
                    <Send className="w-4.5 h-4.5 rtl:rotate-180" />
                  </button>
                </form>
                
                <p className="text-[9px] text-stone-400 text-center mt-2 font-medium leading-none">
                  نموذج ربداوي AI متصل ومحدث حياً بقاعدة بيانات "شو في بإربد؟" لعام 2026
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
