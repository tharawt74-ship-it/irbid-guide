import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, orderBy, arrayUnion 
} from 'firebase/firestore';
import { Business, ChatMessage, ChatRoom } from '../types';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router';
import { 
  MessageSquare, Send, Paperclip, Image as ImageIcon, Trash2, 
  Clock, AlertCircle, ArrowRight, Crown, ChevronLeft, User, 
  Store, X, Lock, Plus, Check, FileText, CheckCircle, 
  DollarSign, AlertTriangle, MessageCircle, ShieldCheck,
  Pencil, Loader2, Tag, Briefcase, ShoppingBag, AtSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { canUseLiveChat } from '../lib/vipHelper';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import { useConfirm } from '../contexts/ConfirmContext';

export function Messages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetBusinessId = searchParams.get('businessId');
  const { confirm } = useConfirm();

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
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Deletion & Editing state
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<ChatMessage | null>(null);
  const [deletingType, setDeletingType] = useState<'me' | 'everyone' | null>(null);
  
  // Mentions state
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [mentionOffers, setMentionOffers] = useState<any[]>([]);
  const [mentionJobs, setMentionJobs] = useState<any[]>([]);
  const [loadingMentionData, setLoadingMentionData] = useState(false);
  
  // Business details for active room
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activePane, setActivePane] = useState<'list' | 'chat'>('list'); // responsive view
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'merchant'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 11. Parse custom mentions in message text into interactive styled badges
  const parseMessageMentions = (text: string) => {
    if (!text) return text;
    
    const regex = /(\[mention-(?:business|product|offer|job):[^\]]+\])/g;
    const parts = text.split(regex);
    
    return parts.map((part, idx) => {
      if (part.startsWith('[mention-') && part.endsWith(']')) {
        const content = part.slice(1, -1); // e.g. "mention-business:ID:Name"
        const [typeAndPrefix, ...rest] = content.split(':');
        const type = typeAndPrefix.replace('mention-', '');
        
        if (type === 'business') {
          const [id, name] = rest;
          return (
            <Link 
              key={idx} 
              to={`/business/${id}`}
              className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-lg mx-1 font-bold text-[11px] transition-all cursor-pointer"
            >
              <Store className="h-3 w-3 text-emerald-700" />
              <span>@{name}</span>
            </Link>
          );
        }
        
        if (type === 'product') {
          const [name, price] = rest;
          return (
            <span 
              key={idx} 
              className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-lg mx-1 font-bold text-[11px]"
            >
              <ShoppingBag className="h-3 w-3 text-amber-700" />
              <span>🍔 {name} ({price} د.أ)</span>
            </span>
          );
        }
        
        if (type === 'offer') {
          const [id, title] = rest;
          return (
            <Link 
              key={idx} 
              to={`/business/${activeRoom?.businessId}`}
              className="inline-flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 px-2 py-0.5 rounded-lg mx-1 font-bold text-[11px] transition-all cursor-pointer"
            >
              <Tag className="h-3 w-3 text-purple-700" />
              <span>🏷️ {title}</span>
            </Link>
          );
        }
        
        if (type === 'job') {
          const [id, title] = rest;
          return (
            <Link 
              key={idx} 
              to={`/jobs`}
              className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-950 border border-blue-300 px-2 py-0.5 rounded-lg mx-1 font-bold text-[11px] transition-all cursor-pointer"
            >
              <Briefcase className="h-3 w-3 text-blue-700" />
              <span>💼 {title}</span>
            </Link>
          );
        }
      }
      return part;
    });
  };

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
        
        // FILTER: Disappearing messages logic & deleted for this user
        const isDeletedForMe = msg.deletedForUsers?.includes(currentUser?.uid || '');
        if ((!msg.expiresAt || msg.expiresAt > now) && !isDeletedForMe) {
          list.push(msg);
        }
      });

      setMessages(list);
      setLoadingMessages(false);
      // Scroll localized container to bottom
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    }, (err) => {
      console.error("Error fetching messages:", err);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeRoom, ownedBusinesses, currentUser]);

  // Scroll messages smoothly or instantly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Keep scroll pinned to bottom whenever messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('auto');
      const timer = setTimeout(() => scrollToBottom('smooth'), 80);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Handle file select & crop modal opening
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('نعتذر، يمكنك فقط إرسال الصور كملف وسائط.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setSelectedFileName(file.name);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File, croppedDataUrl: string) => {
    setSelectedFile(croppedDataUrl);
    setCropModalOpen(false);
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
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
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

  // 6. Delete entire conversation
  const handleDeleteConversation = async (targetRoomId?: string) => {
    const roomId = targetRoomId || activeRoom?.id;
    if (!roomId || !db || !currentUser) return;

    const ok = await confirm({
      title: 'حذف المحادثة بالكامل',
      message: 'هل أنت متأكد من رغبتك في حذف هذه المحادثة بالكامل؟ سيتم مسح كافة الرسائل وسجل الدردشة نهائياً ولا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'نعم، احذف المحادثة',
      cancelText: 'تراجع',
      variant: 'danger'
    });

    if (!ok) return;

    try {
      setDeletingRoom(true);
      // Delete all messages in the subcollection
      const messagesSnap = await getDocs(collection(db, 'chatRooms', roomId, 'messages'));
      const deletePromises = messagesSnap.docs.map((docSnap) => 
        deleteDoc(doc(db, 'chatRooms', roomId, 'messages', docSnap.id))
      );
      await Promise.all(deletePromises);

      // Delete the chat room document
      await deleteDoc(doc(db, 'chatRooms', roomId));

      // Update local state
      setChatRooms(prev => prev.filter(r => r.id !== roomId));
      if (activeRoom?.id === roomId) {
        setActiveRoom(null);
        setMessages([]);
        setSearchParams({});
        if (isMobileView) {
          setActivePane('list');
        }
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      alert("حدث خطأ أثناء محاولة حذف المحادثة. يرجى المحاولة لاحقاً.");
    } finally {
      setDeletingRoom(false);
    }
  };

  // 7. Delete individual message workflow
  const handleDeleteMessageClick = (msg: ChatMessage) => {
    setDeleteTargetMessage(msg);
  };

  const handleConfirmDeleteMessage = async (type: 'me' | 'everyone') => {
    if (!deleteTargetMessage || !activeRoom || !db || !currentUser) return;

    try {
      setDeletingMessageId(deleteTargetMessage.id);
      setDeletingType(type);

      if (type === 'me') {
        // Hide message for this user only
        await updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', deleteTargetMessage.id), {
          deletedForUsers: arrayUnion(currentUser.uid)
        });
      } else {
        // Delete message for everyone
        await deleteDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', deleteTargetMessage.id));

        // If deleted message was the last message, update the room's preview text
        const remaining = messages.filter(m => m.id !== deleteTargetMessage.id);
        const newLastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;

        await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
          lastMessageText: newLastMsg ? (newLastMsg.text || 'أرسل صورة 📷') : 'لا توجد رسائل',
          lastMessageTime: newLastMsg ? newLastMsg.createdAt : Date.now(),
        });
      }

      setDeleteTargetMessage(null);
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("حدث خطأ أثناء محاولة حذف الرسالة.");
    } finally {
      setDeletingMessageId(null);
      setDeletingType(null);
    }
  };

  // Mentions Handlers
  const handleOpenMentionModal = async () => {
    if (!activeRoom || !db) return;
    setMentionModalOpen(true);
    setLoadingMentionData(true);
    try {
      // 1. Get offers
      const offersSnap = await getDocs(query(
        collection(db, 'offers'),
        where('businessId', '==', activeRoom.businessId)
      ));
      setMentionOffers(offersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Get jobs
      const jobsSnap = await getDocs(query(
        collection(db, 'jobs'),
        where('businessId', '==', activeRoom.businessId)
      ));
      setMentionJobs(jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error loading mention items:", err);
    } finally {
      setLoadingMentionData(false);
    }
  };

  const handleSelectMention = (tag: string) => {
    setInputText((prev) => prev ? `${prev} ${tag}` : tag);
    setMentionModalOpen(false);
  };

  // 8. Start editing message
  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text || '');
  };

  // 9. Cancel editing message
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  // 10. Save edited message
  const handleSaveEdit = async (msgId: string) => {
    if (!activeRoom || !db || !currentUser) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      alert("لا يمكن حفظ رسالة فارغة. يمكنك حذف الرسالة إذا أردت إزالتها.");
      return;
    }

    const currentMsg = messages.find(m => m.id === msgId);
    if (currentMsg && currentMsg.text === trimmed) {
      // Nothing changed
      handleCancelEdit();
      return;
    }

    try {
      setIsSavingEdit(true);
      await updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', msgId), {
        text: trimmed,
        isEdited: true,
        editedAt: Date.now()
      });

      // If it's the last message in room, update lastMessageText on chatRoom
      if (messages.length > 0 && messages[messages.length - 1].id === msgId) {
        await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
          lastMessageText: trimmed,
        });
      }

      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      console.error("Error updating message:", err);
      alert("حدث خطأ أثناء حفظ التعديل. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full min-h-0" dir="rtl">
      
      {/* Messages Layout Main Panel */}
      <div className="flex-1 w-full bg-white rounded-2xl md:rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden flex flex-col md:flex-row h-full min-h-0">
        
        {/* RIGHT: Conversations List (Hidden on mobile when chat pane is active) */}
        <div className={`w-full md:w-[360px] lg:w-[380px] shrink-0 border-l border-stone-200/80 flex flex-col bg-stone-50/50 h-full min-h-0 overflow-hidden ${
          isMobileView && activePane === 'chat' ? 'hidden' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-stone-200/60 bg-white space-y-2.5 shrink-0">
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
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 min-h-0 overscroll-contain">
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
                  <div
                    key={room.id}
                    className={`group relative w-full text-right transition-all flex items-center border-r-4 ${
                      isActive 
                        ? 'bg-emerald-50/50 border-r-[#1a4d2e]' 
                        : 'border-r-transparent bg-white hover:bg-stone-50/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoom(room);
                        setSearchParams({ roomId: room.id });
                        setActivePane('chat');
                      }}
                      className="flex-1 text-right p-4 flex items-center gap-3.5 cursor-pointer min-w-0"
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

                    {/* Quick delete conversation button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(room.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 ml-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                      title="حذف المحادثة بالكامل"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT: Active Chat Pane (Full screen on mobile when active) */}
        <div className={`flex-1 flex flex-col bg-white h-full min-h-0 overflow-hidden ${
          isMobileView && activePane === 'list' 
            ? 'hidden' 
            : isMobileView && activePane === 'chat'
            ? 'fixed inset-0 z-[150] bg-[#fbfbfa] flex flex-col h-[100dvh]'
            : 'flex'
        }`}>
          {activeRoom ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-white sm:bg-stone-50/50 flex items-center justify-between gap-3 shrink-0 shadow-xs sm:shadow-none pt-[max(0.875rem,env(safe-area-inset-top))]">
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

                {/* Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Sub status details for the business owner */}
                  {activeBusiness && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      {activeBusiness.premiumMessagingEnabled ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black shadow-2xs">
                          <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          باقة الرسائل المطورة مفعلة ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-500 border border-stone-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                          باقة الرسائل الأساسية (7 أيام)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Delete Conversation Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteConversation()}
                    disabled={deletingRoom}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-red-200/80 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                    title="حذف المحادثة بالكامل"
                  >
                    {deletingRoom ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-600" />
                    )}
                    <span className="hidden sm:inline">حذف المحادثة</span>
                  </button>
                </div>
              </div>

              {/* Message Bubble Stream Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fdfcfb] space-y-4 min-h-0 overscroll-contain"
              >
                
                {/* Information Callout */}
                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 flex gap-3 text-stone-600 max-w-2xl mx-auto text-right">
                  <ShieldCheck className="h-5 w-5 text-[#1a4d2e] shrink-0 mt-0.5" />
                  <div className="text-xs font-bold leading-relaxed">
                    <p>
                      نود إعلامكم بأن جميع الرسائل في هذه الدردشة يتم حذفها تلقائياً وبشكل آمن بعد مرور <span className="text-stone-800 font-black">7 أيام</span> من تاريخ الإرسال.
                    </p>
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
                    const isEditingThis = editingMessageId === msg.id;
                    const canDelete = true;
                    
                    return (
                      <div 
                        key={msg.id}
                        className={`group flex flex-col max-w-[85%] sm:max-w-[70%] transition-all ${
                          isMyMessage ? 'mr-auto items-end' : 'ml-auto items-start'
                        }`}
                      >
                        {/* Sender Label */}
                        <span className="text-[10px] text-stone-400 mb-1 px-1 font-bold">
                          {msg.senderName}
                        </span>

                        {/* Bubble */}
                        <div className={`rounded-2xl p-3.5 shadow-2xs break-words w-full transition-all ${
                          isMyMessage 
                            ? 'bg-[#1a4d2e] text-white rounded-tr-none' 
                            : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
                        }`}>
                          {isEditingThis ? (
                            /* Inline Edit Mode */
                            <div className="space-y-2.5 text-stone-900 w-full">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                rows={2}
                                className={`w-full p-2.5 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 shadow-inner ${
                                  isMyMessage 
                                    ? 'bg-white text-stone-900 border border-emerald-300 focus:ring-emerald-400' 
                                    : 'bg-stone-50 text-stone-900 border border-stone-300 focus:ring-[#1a4d2e]'
                                }`}
                                autoFocus
                                placeholder="اكتب التعديل هنا..."
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs ${
                                    isMyMessage 
                                      ? 'text-emerald-100 hover:text-white bg-black/20 hover:bg-black/30' 
                                      : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200'
                                  }`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>إلغاء</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msg.id)}
                                  disabled={isSavingEdit || !editingText.trim()}
                                  className={`px-3 py-1 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs shadow-xs disabled:opacity-50 ${
                                    isMyMessage 
                                      ? 'bg-emerald-500 hover:bg-emerald-400' 
                                      : 'bg-[#1a4d2e] hover:bg-[#133b22]'
                                  }`}
                                >
                                  {isSavingEdit ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span>حفظ التعديل</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Standard Message Display */
                            <>
                              {/* Text message */}
                              {msg.text && (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{parseMessageMentions(msg.text)}</p>
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
                            </>
                          )}
                        </div>

                        {/* Timing Info, "تم التعديل" Badge, & Action Buttons */}
                        <div className={`flex items-center gap-2 text-[10px] text-stone-400 mt-1 px-1 font-bold ${
                          isMyMessage ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          <span>{formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: ar })}</span>
                          
                          {/* "تم التعديل" Badge below edited message */}
                          {msg.isEdited && (
                            <span 
                              className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md shadow-2xs"
                              title={msg.editedAt ? `تم التعديل: ${formatDistanceToNow(msg.editedAt, { addSuffix: true, locale: ar })}` : 'تم التعديل'}
                            >
                              <Pencil className="h-2.5 w-2.5 text-amber-600" />
                              <span>تم التعديل</span>
                            </span>
                          )}

                          {/* Action Buttons for Sender / Admin */}
                          {!isEditingThis && canDelete && (
                            <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                              {isMyMessage && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMessage(msg)}
                                  className="p-1 hover:bg-stone-100 text-stone-400 hover:text-emerald-700 rounded-md transition-colors cursor-pointer"
                                  title="تعديل الرسالة"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteMessageClick(msg)}
                                disabled={deletingMessageId === msg.id}
                                className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                title="حذف الرسالة"
                              >
                                {deletingMessageId === msg.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Controls Area */}
              {(() => {
                const isOwnerOfActive = ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid;
                const isVisitor = !isOwnerOfActive;

                return (
                  <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-stone-200 bg-white shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:shadow-none z-20">
                    
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

                      {/* Mention Button (Only for visitor) */}
                      {isVisitor && (
                        <button
                          type="button"
                          onClick={handleOpenMentionModal}
                          className="p-3 bg-emerald-50 text-[#1a4d2e] border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                          title="إشارة إلى متجر، منتج، عرض، أو وظيفة"
                        >
                          <AtSign className="h-5 w-5" />
                          <span className="hidden sm:inline text-xs font-black">إشارة</span>
                        </button>
                      )}

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
                );
              })()}
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

      {imageToCrop && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={imageToCrop}
          initialAspectRatio="free"
          fileName={selectedFileName || 'chat-attachment.jpg'}
          onClose={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Custom Message Deletion Options Modal */}
      {deleteTargetMessage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 shadow-xl overflow-hidden text-right transform scale-100 transition-all">
            {/* Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <h3 className="text-sm font-black text-stone-900">خيارات حذف الرسالة</h3>
              <button 
                onClick={() => setDeleteTargetMessage(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5">
              <p className="text-xs text-stone-600 leading-relaxed font-bold mb-4">
                يرجى اختيار طريقة حذف هذه الرسالة:
              </p>
              
              <div className="space-y-2.5">
                {/* Delete for Me Button */}
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteMessage('me')}
                  disabled={deletingType !== null}
                  className="w-full text-right p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-98 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-black text-stone-800">حذف لي فقط</span>
                    <span className="block text-[10px] text-stone-400 mt-0.5 leading-none">سيتم إخفاء هذه الرسالة من صندوق الرسائل الخاص بك فقط.</span>
                  </div>
                  {deletingType === 'me' ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-stone-600 shrink-0" />
                  ) : (
                    <User className="h-4.5 w-4.5 text-stone-400 group-hover:text-stone-600 shrink-0 transition-colors" />
                  )}
                </button>

                {/* Delete for Everyone Button */}
                {(deleteTargetMessage.senderId === currentUser?.uid || currentUser?.email === 'princessofx2344@gmail.com') ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmDeleteMessage('everyone')}
                    disabled={deletingType !== null}
                    className="w-full text-right p-3 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-98 disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-red-700">حذف لدى الجميع</span>
                      <span className="block text-[10px] text-red-400 mt-0.5 leading-none">سيتم مسح هذه الرسالة نهائياً من الصندوق لدى جميع الأطراف.</span>
                    </div>
                    {deletingType === 'everyone' ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-red-600 shrink-0" />
                    ) : (
                      <Trash2 className="h-4.5 w-4.5 text-red-400 group-hover:text-red-600 shrink-0 transition-colors" />
                    )}
                  </button>
                ) : (
                  <div className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-700 font-bold leading-relaxed">
                    لا يمكنك اختيار "حذف لدى الجميع" لأنك لست مرسل هذه الرسالة.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetMessage(null)}
                className="px-4 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Mention Picker Modal */}
      {mentionModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-xl overflow-hidden text-right flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <AtSign className="h-4.5 w-4.5 text-[#1a4d2e]" />
                <h3 className="text-sm font-black text-stone-900">إشارة (منشن) في الرسالة</h3>
              </div>
              <button 
                type="button"
                onClick={() => setMentionModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer animate-none"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-stone-500 leading-relaxed font-bold">
                يمكنك الإشارة إلى المحل الذي تتواصل معه، أو أحد المنتجات، العروض، والوظائف الخاصة به فقط لتسهيل التواصل:
              </p>

              {/* 1. Mention Store Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#1a4d2e] flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
                  <Store className="h-4 w-4" />
                  <span>صفحة المتجر</span>
                </h4>
                <button
                  type="button"
                  onClick={() => handleSelectMention(`[mention-business:${activeRoom?.businessId}:${activeRoom?.businessName}]`)}
                  className="w-full text-right p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs font-black text-emerald-950">إشارة لصفحة المتجر الرئيسية: @{activeRoom?.businessName}</span>
                  <Plus className="h-4 w-4 text-emerald-600" />
                </button>
              </div>

              {/* 2. Menu Items Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-amber-700 flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  <span>المنتجات في المنيو الرقمي</span>
                </h4>
                
                {activeBusiness?.menuItems && activeBusiness.menuItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeBusiness.menuItems.slice(0, 8).map((item: any, index: number) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectMention(`[mention-product:${item.name}:${item.price}]`)}
                        className="text-right p-2.5 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-200 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <div className="min-w-0 flex-1 ml-2">
                          <span className="block font-black text-stone-800 truncate">{item.name}</span>
                          <span className="block text-[10px] text-stone-500 mt-0.5">{item.price} د.أ</span>
                        </div>
                        <Plus className="h-4 w-4 text-amber-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لا يوجد منتجات في منيو هذا المحل حالياً.</p>
                )}
              </div>

              {/* 3. Offers Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-purple-700 flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <Tag className="h-4 w-4" />
                  <span>عروض وتخفيضات المحل</span>
                </h4>
                
                {loadingMentionData ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  </div>
                ) : mentionOffers.length > 0 ? (
                  <div className="space-y-1.5">
                    {mentionOffers.map((offer: any) => (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => handleSelectMention(`[mention-offer:${offer.id}:${offer.title}]`)}
                        className="w-full text-right p-2.5 bg-purple-50/40 hover:bg-purple-50 border border-purple-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-purple-950 truncate max-w-[90%]">{offer.title}</span>
                        <Plus className="h-4 w-4 text-purple-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لا توجد عروض منشورة لهذا المحل حالياً.</p>
                )}
              </div>

              {/* 4. Jobs Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 border-b border-blue-100 pb-1.5">
                  <Briefcase className="h-4 w-4" />
                  <span>الوظائف الشاغرة لدى المحل</span>
                </h4>
                
                {loadingMentionData ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : mentionJobs.length > 0 ? (
                  <div className="space-y-1.5">
                    {mentionJobs.map((job: any) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => handleSelectMention(`[mention-job:${job.id}:${job.title}]`)}
                        className="w-full text-right p-2.5 bg-blue-50/40 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-blue-950 truncate max-w-[90%]">{job.title}</span>
                        <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لا توجد وظائف شاغرة معلنة لهذا المحل حالياً.</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-4 py-3.5 bg-stone-50 border-t border-stone-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMentionModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
