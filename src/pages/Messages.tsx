import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  addDoc, setDoc, updateDoc, onSnapshot, orderBy 
} from 'firebase/firestore';
import { Business, ChatMessage, ChatRoom } from '../types';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router';
import { 
  MessageSquare, Send, Paperclip, Image as ImageIcon, Trash2, 
  Clock, AlertCircle, ArrowRight, Crown, ChevronLeft, User, 
  Store, X, Lock, Plus, Check, FileText, CheckCircle, 
  DollarSign, AlertTriangle, MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { canUseLiveChat } from '../lib/vipHelper';

export function Messages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetBusinessId = searchParams.get('businessId');

  // Automatic redirect if guest
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [currentUser, navigate, location]);

  // Unified lists
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);
  
  // Loading & interactive state
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  // Business details for active room
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activePane, setActivePane] = useState<'list' | 'chat'>('list'); // responsive view
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'merchant'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check window width for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Fetch user owned businesses to distinguish roles
  useEffect(() => {
    async function fetchOwnedBusinesses() {
      if (!currentUser || !db) return;
      try {
        const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const list: Business[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Business);
        });
        setOwnedBusinesses(list);
      } catch (err) {
        console.error("Error fetching owned businesses:", err);
      }
    }
    fetchOwnedBusinesses();
  }, [currentUser]);

  // 2. Fetch/Subscribe to Chat Rooms
  useEffect(() => {
    if (!currentUser || !db) {
      setLoadingRooms(false);
      return;
    }

    // Since we need to show both chats started as a customer AND chats received as business owners:
    // We fetch rooms where userId == currentUser.uid, OR where businessOwnerId == currentUser.uid
    // To avoid complex composite indexes, we can perform two simple queries and merge them in real-time.
    let unsubscribeUser: () => void = () => {};
    let unsubscribeOwner: () => void = () => {};

    try {
      const userRoomsQuery = query(
        collection(db, 'chatRooms'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeUser = onSnapshot(userRoomsQuery, (snapshot) => {
        const userList: ChatRoom[] = [];
        snapshot.forEach((d) => {
          userList.push({ id: d.id, ...d.data() } as ChatRoom);
        });

        // Query rooms where user is the business owner
        const ownerRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('businessOwnerId', '==', currentUser.uid)
        );

        unsubscribeOwner = onSnapshot(ownerRoomsQuery, (ownerSnapshot) => {
          const ownerList: ChatRoom[] = [];
          ownerSnapshot.forEach((d) => {
            ownerList.push({ id: d.id, ...d.data() } as ChatRoom);
          });

          // Merge and de-duplicate by ID
          const mergedMap = new Map<string, ChatRoom>();
          userList.forEach(room => mergedMap.set(room.id, room));
          ownerList.forEach(room => mergedMap.set(room.id, room));

          const mergedList = Array.from(mergedMap.values());
          // Sort by lastMessageTime descending
          mergedList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

          setChatRooms(mergedList);
          setLoadingRooms(false);
        }, (err) => {
          console.error("Owner chat rooms subscription error:", err);
          setLoadingRooms(false);
        });

      }, (err) => {
        console.error("User chat rooms subscription error:", err);
        setLoadingRooms(false);
      });

    } catch (error) {
      console.error("Error setting up chat rooms listener:", error);
      setLoadingRooms(false);
    }

    return () => {
      unsubscribeUser();
      unsubscribeOwner();
    };
  }, [currentUser]);

  // 3. Handle specific creation of room if businessId is provided in URL
  useEffect(() => {
    async function checkAndCreateTargetRoom() {
      if (!currentUser || !db || !targetBusinessId) return;

      // Check if room already exists: businessId_userId
      const roomId = `${targetBusinessId}_${currentUser.uid}`;
      const roomRef = doc(db, 'chatRooms', roomId);
      
      try {
        const docSnap = await getDoc(roomRef);
        if (docSnap.exists()) {
          // Room exists, open it
          const roomData = { id: docSnap.id, ...docSnap.data() } as ChatRoom;
          setActiveRoom(roomData);
          setActivePane('chat');
        } else {
          // Room does not exist, check if business exists and is Gold/VIP
          const bizRef = doc(db, 'businesses', targetBusinessId);
          const bizSnap = await getDoc(bizRef);
          
          if (bizSnap.exists()) {
            const biz = { id: bizSnap.id, ...bizSnap.data() } as Business;
            
            // Strictly check if business is active Golden/VIP plan
            const isEligible = canUseLiveChat(biz);
            
            if (!isEligible) {
              alert("عذراً، ميزة المحادثات المباشرة متوفرة فقط للمحلات والمطاعم ذات الاشتراك الذهبي VIP الفعّال.");
              setSearchParams({});
              return;
            }

            // Create new Chat Room
            const newRoom: ChatRoom = {
              id: roomId,
              businessId: biz.id,
              businessName: biz.name,
              userId: currentUser.uid,
              userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'زبون',
              userEmail: currentUser.email || '',
              lastMessageText: 'بدء المحادثة الجديدة...',
              lastMessageTime: Date.now(),
              unreadByBusiness: true,
              unreadByUser: false,
              businessOwnerId: biz.userId || ''
            };

            await setDoc(roomRef, newRoom);
            setActiveRoom(newRoom);
            setActivePane('chat');
          }
        }
      } catch (err) {
        console.error("Error checking/creating target room:", err);
      }
    }

    checkAndCreateTargetRoom();
  }, [targetBusinessId, currentUser]);

  // 4. Load/Subscribe to active room's messages
  useEffect(() => {
    if (!activeRoom || !db) {
      setMessages([]);
      setActiveBusiness(null);
      return;
    }

    setLoadingMessages(true);

    // Fetch the active business details to check premium messaging add-on status
    const bizRef = doc(db, 'businesses', activeRoom.businessId);
    getDoc(bizRef).then((snap) => {
      if (snap.exists()) {
        setActiveBusiness({ id: snap.id, ...snap.data() } as Business);
      }
    });

    // Mark messages as read based on role
    const isOwnerOfActive = ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid;
    const updateField = isOwnerOfActive ? { unreadByBusiness: false } : { unreadByUser: false };
    
    updateDoc(doc(db, 'chatRooms', activeRoom.id), updateField).catch(e => console.error("Error updating read status:", e));

    // Subscribe to messages
    const messagesQuery = query(
      collection(db, 'chatRooms', activeRoom.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: ChatMessage[] = [];
      const now = Date.now();
      
      snapshot.forEach((d) => {
        const msg = { id: d.id, ...d.data() } as ChatMessage;
        
        // FILTER: Disappearing messages logic
        // If the message has expired, do not show it
        if (!msg.expiresAt || msg.expiresAt > now) {
          list.push(msg);
        }
      });

      setMessages(list);
      setLoadingMessages(false);
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.error("Error fetching messages:", err);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeRoom, ownedBusinesses, currentUser]);

  // Handle file select & base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('نعتذر، يمكنك فقط إرسال الصور كملف وسائط.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile(reader.result as string);
      setSelectedFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db || !activeRoom) return;

    const trimmedText = inputText.trim();
    if (!trimmedText && !selectedFile) return;

    const isOwner = ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser.uid;
    
    // Check retention and media limits based on Business Premium Messaging add-on status
    const isPremiumMessaging = Boolean(activeBusiness?.premiumMessagingEnabled);
    
    // retention period: 7 days default, or based on plan
    let retentionMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    if (isPremiumMessaging && activeBusiness?.premiumMessagingPlan) {
      const plan = activeBusiness.premiumMessagingPlan;
      if (plan === '1_month') retentionMs = 30 * 24 * 60 * 60 * 1000;
      else if (plan === '3_months') retentionMs = 90 * 24 * 60 * 60 * 1000;
      else if (plan === '6_months') retentionMs = 180 * 24 * 60 * 60 * 1000;
      else if (plan === '1_year') retentionMs = 365 * 24 * 60 * 60 * 1000;
    }

    const expiresAt = Date.now() + retentionMs;

    try {
      const msgData: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        senderType: isOwner ? 'business' : 'customer',
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
        text: trimmedText,
        createdAt: Date.now(),
        expiresAt: expiresAt
      };

      // Add media if premium messaging is enabled and file selected
      if (selectedFile) {
        if (isPremiumMessaging) {
          msgData.mediaUrl = selectedFile;
          msgData.mediaType = 'image';
        } else {
          alert("الوسائط غير مدعومة في الحسابات العادية. يجب على صاحب المحل ترقية الخدمة لاستقبال وإرسال الوسائط.");
          setSelectedFile(null);
          setSelectedFileName(null);
          return;
        }
      }

      // Add to messages sub-collection
      const messagesRef = collection(db, 'chatRooms', activeRoom.id, 'messages');
      await addDoc(messagesRef, msgData);

      // Update parent ChatRoom document
      const roomRef = doc(db, 'chatRooms', activeRoom.id);
      await updateDoc(roomRef, {
        lastMessageText: trimmedText || 'أرسل صورة 📷',
        lastMessageTime: Date.now(),
        unreadByBusiness: !isOwner,
        unreadByUser: isOwner,
      });

      setInputText('');
      setSelectedFile(null);
      setSelectedFileName(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const getRetentionLabel = (biz: Business | null) => {
    if (!biz) return '7 أيام';
    if (!biz.premiumMessagingEnabled) return 'أسبوع واحد فقط';
    
    switch (biz.premiumMessagingPlan) {
      case '1_month': return 'شهر كامل';
      case '3_months': return '3 أشهر';
      case '6_months': return '6 أشهر';
      case '1_year': return 'سنة كاملة';
      default: return 'أسبوع واحد';
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col min-h-[calc(100vh-140px)]" dir="rtl">
      
      {/* Messages Layout Main Panel */}
      <div className="flex-1 w-full bg-white rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        
        {/* RIGHT: Conversations List (Hidden on mobile when chat pane is active) */}
        <div className={`w-full md:w-[350px] shrink-0 border-l border-stone-100 flex flex-col bg-stone-50/50 ${
          isMobileView && activePane === 'chat' ? 'hidden' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-stone-200/60 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-black text-stone-950 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#1a4d2e]" />
                <span>محادثاتي والرسائل</span>
              </h1>
              <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] px-2.5 py-0.5 rounded-full text-[11px] font-black">
                {chatRooms.length} محادثة
              </span>
            </div>

            {/* Role Filter Tabs if user owns businesses */}
            {ownedBusinesses.length > 0 && (
              <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    roleFilter === 'all' ? 'bg-white shadow-2xs text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('customer')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    roleFilter === 'customer' ? 'bg-white shadow-2xs text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span>كزبون</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('merchant')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    roleFilter === 'merchant' ? 'bg-white shadow-2xs text-[#ff9f1c] font-black' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Store className="h-3 w-3" />
                  <span>لمحلاتي</span>
                </button>
              </div>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loadingRooms ? (
              <div className="p-10 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e] border-t-transparent animate-spin mx-auto mb-3"></div>
                <span className="text-xs text-stone-400 font-bold">جاري تحميل المحادثات...</span>
              </div>
            ) : chatRooms.filter(room => {
              const isOwner = ownedBusinesses.some(b => b.id === room.businessId) || room.businessOwnerId === currentUser?.uid;
              if (roleFilter === 'customer') return !isOwner;
              if (roleFilter === 'merchant') return isOwner;
              return true;
            }).length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-3">
                <MessageCircle className="h-12 w-12 text-stone-300 mx-auto" />
                <p className="text-xs font-bold leading-relaxed">
                  {roleFilter === 'merchant' 
                    ? 'لا توجد استفسارات مرسلة لمحلاتك التجارية حالياً.' 
                    : roleFilter === 'customer' 
                    ? 'لم تقم ببدء أي محادثات مع محلات إربد كزبون بعد.' 
                    : 'لا توجد محادثات نشطة حالياً.'}
                </p>
                <p className="text-[11px] leading-relaxed text-stone-400">
                  يمكنك مراسلة أي متجر أو مطعم معتمد في الباقة الذهبية VIP بسهولة وسرية تامة.
                </p>
                <Link to="/" className="inline-block mt-3 px-4 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-[11px] font-bold rounded-lg transition-colors">
                  تصفح الدليل الآن
                </Link>
              </div>
            ) : (
              chatRooms.filter(room => {
                const isOwner = ownedBusinesses.some(b => b.id === room.businessId) || room.businessOwnerId === currentUser?.uid;
                if (roleFilter === 'customer') return !isOwner;
                if (roleFilter === 'merchant') return isOwner;
                return true;
              }).map((room) => {
                const isOwner = ownedBusinesses.some(b => b.id === room.businessId) || room.businessOwnerId === currentUser?.uid;
                const isActive = activeRoom?.id === room.id;
                const hasUnread = isOwner ? room.unreadByBusiness : room.unreadByUser;

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveRoom(room);
                      setSearchParams({ roomId: room.id });
                      setActivePane('chat');
                    }}
                    className={`w-full text-right p-4 transition-all flex items-center gap-3.5 hover:bg-stone-50 border-r-4 cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-50/50 border-r-[#1a4d2e]' 
                        : 'border-r-transparent bg-white'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isOwner ? 'bg-[#ff9f1c]/10 text-[#ff9f1c]' : 'bg-[#1a4d2e]/10 text-[#1a4d2e]'
                    }`}>
                      {isOwner ? <User className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-1">
                        <span className={`text-sm block truncate font-black ${hasUnread ? 'text-stone-900' : 'text-stone-700'}`}>
                          {isOwner ? room.userName : room.businessName}
                        </span>
                        <span className="text-[10px] text-stone-400 shrink-0 font-bold">
                          {formatDistanceToNow(room.lastMessageTime, { addSuffix: false, locale: ar })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${hasUnread ? 'text-stone-800 font-bold' : 'text-stone-400'}`}>
                          {room.lastMessageText}
                        </p>
                        
                        {hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 shadow-xs animate-ping"></span>
                        )}
                      </div>

                      {/* Display small badge if the conversation is with their owned business */}
                      {isOwner && (
                        <span className="inline-block mt-1 text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          رسالة مستلمة لـ {room.businessName}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT: Active Chat Pane (Full screen on mobile when active) */}
        <div className={`flex-1 flex flex-col bg-white ${
          isMobileView && activePane === 'list' 
            ? 'hidden' 
            : isMobileView && activePane === 'chat'
            ? 'fixed inset-0 z-50 bg-[#fbfbfa] flex flex-col'
            : 'flex'
        }`}>
          {activeRoom ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-white sm:bg-stone-50/50 flex items-center justify-between gap-3 shrink-0 shadow-xs sm:shadow-none">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Back button on mobile */}
                  {isMobileView && (
                    <button 
                      onClick={() => setActivePane('list')}
                      className="p-2 hover:bg-stone-100 rounded-xl text-stone-700 active:scale-95 transition-all shrink-0 cursor-pointer"
                      title="العودة للقائمة"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}

                  <div className="w-10 h-10 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid ? (
                      <User className="h-4.5 w-4.5" />
                    ) : (
                      <Store className="h-4.5 w-4.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-black text-stone-900 leading-none truncate">
                      {ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid ? (
                        activeRoom.userName
                      ) : (
                        activeRoom.businessName
                      )}
                    </h2>
                    
                    {/* Disappearing warning */}
                    <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1 font-bold">
                      <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                      <span>تختفي الرسائل بعد: </span>
                      <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded-xs">
                        {getRetentionLabel(activeBusiness)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub status details for the business owner */}
                {activeBusiness && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeBusiness.premiumMessagingEnabled ? (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black shadow-2xs">
                        <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        باقة الرسائل المطورة مفعلة ✓
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-stone-100 text-stone-500 border border-stone-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                        باقة الرسائل الأساسية (7 أيام)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Message Bubble Stream Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fdfcfb] space-y-4">
                
                {/* Information Callout */}
                <div className="bg-[#1a4d2e]/5 border border-[#1a4d2e]/10 rounded-2xl p-4 flex gap-3 text-stone-700 max-w-2xl mx-auto">
                  <AlertCircle className="h-5 w-5 text-[#1a4d2e] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 font-bold leading-relaxed">
                    <p className="text-stone-950 font-black">ℹ️ نظام المراسلة والخصوصية المعتمد:</p>
                    <p>
                      الرسائل المرسلة تختفي تلقائياً بعد مرور <span className="text-red-700 font-bold">7 أيام</span> من إرسالها حفاظاً على خصوصية المستخدمين وتوفير المساحة.
                    </p>
                    {activeBusiness?.premiumMessagingEnabled ? (
                      <p className="text-emerald-700 flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" />
                        صاحب هذا المحل قام بترقية خدمة الرسائل! ميزة استقبال الصور مفعلة، وستبقى رسائلكم محفوظة لمدة {getRetentionLabel(activeBusiness)}.
                      </p>
                    ) : (
                      <p className="text-amber-700">
                        ⚠️ هذا المحل مشترك في باقة الرسائل النصية المجانية الأساسية (نص فقط، تختفي بعد أسبوع). لا يمكن إرسال صور أو وسائط حالياً.
                      </p>
                    )}
                  </div>
                </div>

                {loadingMessages ? (
                  <div className="py-20 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e] border-t-transparent animate-spin mx-auto mb-3"></div>
                    <span className="text-xs text-stone-400 font-bold">جاري تحميل رسائل المحادثة...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-stone-400">
                    <MessageCircle className="h-14 w-14 text-stone-200 mx-auto mb-3" />
                    <p className="text-sm font-black text-stone-600">ابدأ المحادثة الآن!</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed mt-1">
                      اكتب استفسارك أو طلبك هنا وسيقوم المعنيون بالرد عليك فوراً.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMessage = msg.senderId === currentUser?.uid;
                    
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${
                          isMyMessage ? 'mr-auto items-end' : 'ml-auto items-start'
                        }`}
                      >
                        {/* Sender Label */}
                        <span className="text-[10px] text-stone-400 mb-1 px-1 font-bold">
                          {msg.senderName}
                        </span>

                        {/* Bubble */}
                        <div className={`rounded-2xl p-3.5 shadow-2xs break-words w-full ${
                          isMyMessage 
                            ? 'bg-[#1a4d2e] text-white rounded-tr-none' 
                            : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
                        }`}>
                          {/* Text message */}
                          {msg.text && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          )}

                          {/* Media image if any */}
                          {msg.mediaUrl && (
                            <div className="mt-2.5 rounded-xl overflow-hidden border border-stone-200/50 max-h-[220px]">
                              <img 
                                src={msg.mediaUrl} 
                                alt="مرفق محادثة" 
                                className="w-full h-full object-cover cursor-zoom-in"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>

                        {/* Timing and Retention Info */}
                        <div className="flex items-center gap-1.5 text-[9px] text-stone-400 mt-1 px-1 font-bold">
                          <span>{formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: ar })}</span>
                          <span>•</span>
                          <span className="text-red-500/80">حذف تلقائي: {formatDistanceToNow(msg.expiresAt, { addSuffix: true, locale: ar })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Controls Area */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-stone-200 bg-white shrink-0 pb-[max(14px,env(safe-area-inset-bottom))] shadow-lg sm:shadow-none">
                
                {/* Show thumbnail of selected media */}
                {selectedFile && (
                  <div className="mb-3 p-2 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-300">
                        <img src={selectedFile} alt="Selected attachment preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold text-stone-600 truncate max-w-[200px]">{selectedFileName}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setSelectedFile(null); setSelectedFileName(null); }}
                      className="p-1 hover:bg-stone-200 rounded-full text-red-500 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  
                  {/* File Upload Trigger */}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (activeBusiness?.premiumMessagingEnabled) {
                        fileInputRef.current?.click();
                      } else {
                        alert("⚠️ ميزة إرسال مرفقات الصور معطلة لهذا المحل. يجب ترقية خدمة الرسائل للاستفادة من هذه الميزة.");
                      }
                    }}
                    className={`p-3 rounded-xl transition-all border shrink-0 cursor-pointer ${
                      activeBusiness?.premiumMessagingEnabled
                        ? 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
                    }`}
                    title={activeBusiness?.premiumMessagingEnabled ? "إرفاق صورة" : "الوسائط معطلة (تتطلب ترقية الخدمة من صاحب المحل)"}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  {/* Input field */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeBusiness?.premiumMessagingEnabled 
                        ? "اكتب رسالتك النصية أو أرفق صورة..."
                        : "اكتب رسالة نصية فقط..."
                    }
                    className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800"
                  />

                  {/* Send CTA */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !selectedFile}
                    className="p-3 bg-[#1a4d2e] text-white hover:bg-[#133b22] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    <Send className="h-5 w-5 transform rotate-180" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-stone-50/20">
              <MessageSquare className="h-16 w-16 text-stone-200 mb-4" />
              <h2 className="text-lg font-black text-stone-700 mb-1">اختر محادثة لبدء الدردشة</h2>
              <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                انقر على إحدى جهات الاتصال النشطة في القائمة اليمنى للبدء بمتابعة محادثاتك أو الرد على الزبائن.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
