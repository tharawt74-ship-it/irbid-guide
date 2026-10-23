import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  limit 
} from 'firebase/firestore';
import { 
  MessageSquare, 
  Trash2, 
  Search, 
  Eye, 
  X, 
  ShieldAlert, 
  User, 
  Clock, 
  ShieldCheck, 
  Lock 
} from 'lucide-react';

interface ChatRoomItem {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  userId: string;
  userEmail?: string;
  lastMessageText?: string;
  lastMessageAt?: number;
  businessOwnerId?: string;
  isSuspended?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

interface ChatModerationPanelProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function ChatModerationPanel({ showToast }: ChatModerationPanelProps) {
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomItem | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'chatRooms'), orderBy('lastMessageAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const list: ChatRoomItem[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChatRoomItem);
      });
      setRooms(list);
    } catch (err) {
      console.error("Error fetching chat rooms:", err);
      showToast("فشل تحميل سجل المحادثات والدردشة", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoomMessages = async (room: ChatRoomItem) => {
    try {
      setSelectedRoom(room);
      setLoadingMessages(true);
      setRoomMessages([]);
      
      const q = query(collection(db, 'chatRooms', room.id, 'messages'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const list: ChatMessage[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      setRoomMessages(list);
    } catch (err) {
      console.error("Error fetching room messages:", err);
      showToast("فشل تحميل رسائل الدردشة الخاصة بهذه الغرفة", "error");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleToggleSuspendRoom = async (room: ChatRoomItem) => {
    try {
      const newStatus = !room.isSuspended;
      await updateDoc(doc(db, 'chatRooms', room.id), { isSuspended: newStatus });
      showToast(newStatus ? "تم تعليق المحادثة وإيقاف تراسل أطرافها" : "تم إلغاء تعليق المحادثة وتفعيل التراسل", "success");
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isSuspended: newStatus } : r));
      if (selectedRoom?.id === room.id) {
        setSelectedRoom(prev => prev ? { ...prev, isSuspended: newStatus } : null);
      }
    } catch (err) {
      console.error("Error toggling room status:", err);
      showToast("فشل تحديث حالة تعليق الغرفة", "error");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الغرفة وجميع رسائلها نهائياً؟")) return;
    try {
      // Fetch messages subcollection to delete them first
      const messagesSnap = await getDocs(collection(db, 'chatRooms', roomId, 'messages'));
      const deletePromises = messagesSnap.docs.map(docSnap => 
        deleteDoc(doc(db, 'chatRooms', roomId, 'messages', docSnap.id))
      );
      await Promise.all(deletePromises);

      // Delete parent chatRoom
      await deleteDoc(doc(db, 'chatRooms', roomId));
      showToast("تم حذف المحادثة وجميع أرسالها بنجاح", "success");
      setRooms(prev => prev.filter(r => r.id !== roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
    } catch (err) {
      console.error("Error deleting room:", err);
      showToast("فشل حذف الغرفة ورسائلها", "error");
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = 
      room.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-900">رقابة المحادثات والدردشة العامة</h3>
          <p className="text-xs text-stone-500">مراقبة غرف التراسل النشطة بين الزوار ومحلات المدينة لحمايتهم من الاحتيال والإرسال المزعج</p>
        </div>
        <div className="text-xs font-black text-[#1a4d2e] bg-emerald-50 px-4.5 py-2.5 rounded-2xl border border-emerald-100">
          إجمالي محادثات النظام: {rooms.length}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#e5e1da] shadow-xs">
        <div className="relative w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المحل، البريد الإلكتروني للمستخدم، أو محتوى الرسالة الأخيرة..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left/Middle Column: Rooms list */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
              جاري تحميل قائمة المحادثات العامة...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
              لا توجد غرف دردشة مطابقة لبحثك
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => handleOpenRoomMessages(room)}
                  className={`bg-white p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    selectedRoom?.id === room.id
                      ? 'border-[#1a4d2e] ring-2 ring-[#1a4d2e]/10 shadow-sm'
                      : 'border-[#e5e1da] hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-stone-900">{room.businessName}</h4>
                      {room.isSuspended && (
                        <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-md text-[9px] font-black">
                          معلقة
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 font-bold">
                      <User className="h-3 w-3 text-stone-400" />
                      <span>المستخدم: {room.userEmail || "زائر مجهول"}</span>
                    </div>

                    {room.lastMessageText && (
                      <p className="text-xs text-stone-600 line-clamp-1 italic font-bold">
                        "{room.lastMessageText}"
                      </p>
                    )}

                    {room.lastMessageAt && (
                      <div className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>منذ: {new Date(room.lastMessageAt).toLocaleString('ar-JO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSuspendRoom(room);
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        room.isSuspended
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                      title={room.isSuspended ? 'إلغاء تعليق المحادثة' : 'تعليق المحادثة'}
                    >
                      <Lock className="h-4 w-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="حذف المحادثة بالكامل"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Messages inspection */}
        <div className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs min-h-[400px] flex flex-col justify-between">
          {selectedRoom ? (
            <div className="flex-1 flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex justify-between items-start border-b border-stone-100 pb-3 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-stone-900">{selectedRoom.businessName}</h4>
                    <span className="text-[10px] text-stone-500 font-bold block">{selectedRoom.userEmail}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedRoom(null)}
                    className="p-1 hover:bg-stone-100 rounded-lg cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5 text-stone-500" />
                  </button>
                </div>

                {/* Messages scroller */}
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-stone-400 font-bold">
                    جاري تحميل الرسائل...
                  </div>
                ) : roomMessages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-stone-400 font-bold">
                    لا توجد رسائل مكتوبة في هذه الغرفة بعد
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {roomMessages.map((msg) => {
                      const isOwner = msg.senderId === selectedRoom.businessOwnerId;
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col max-w-[85%] ${
                            isOwner ? 'mr-auto items-start' : 'ml-auto items-end'
                          }`}
                        >
                          <span className="text-[9px] text-stone-400 mb-0.5 font-bold">
                            {isOwner ? 'المحل التجاري' : 'العميل'}
                          </span>
                          <div className={`p-2.5 rounded-2xl text-xs leading-relaxed font-bold ${
                            isOwner 
                              ? 'bg-stone-100 text-stone-800 rounded-tr-none' 
                              : 'bg-emerald-50 text-emerald-950 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box Footer operations */}
              <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
                <button
                  onClick={() => handleToggleSuspendRoom(selectedRoom)}
                  className={`w-full py-2.5 rounded-xl font-black text-xs transition-colors cursor-pointer border ${
                    selectedRoom.isSuspended
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-stone-800 hover:bg-stone-900 text-white'
                  }`}
                >
                  {selectedRoom.isSuspended ? 'إلغاء تعليق وتجميد المحادثة' : 'تعليق وتجميد هذه المحادثة فوراً'}
                </button>
                <button
                  onClick={() => handleDeleteRoom(selectedRoom.id)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-colors cursor-pointer"
                >
                  حذف كامل سجل الغرفة نهائياً
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-16 text-stone-400">
              <MessageSquare className="h-10 w-10 text-stone-300" />
              <h5 className="text-xs font-black text-stone-700">معاينة الغرفة التدقيقية</h5>
              <p className="text-[11px] text-stone-400 max-w-[180px] leading-relaxed">اختر محادثة من القائمة الجانبية لقراءة الرسائل ومراقبة التجاوزات أو كشف الاحتيال</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
