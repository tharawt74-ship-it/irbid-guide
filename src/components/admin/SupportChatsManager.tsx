import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Send, 
  User, 
  Phone,
  Search 
} from 'lucide-react';

interface SupportChatsManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function SupportChatsManager({ showToast }: SupportChatsManagerProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Ticket & Message States
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      if (!db) return;
      const snap = await getDocs(query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'), limit(50)));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(list);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status: 'resolved' });
      showToast('تم إغلاق وتصنيف تذكرة الدعم بنجاح', 'success');
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'resolved' } : null);
      }
      fetchTickets();
    } catch (err) {
      console.error('Error resolving ticket:', err);
      showToast('حدث خطأ أثناء تعديل حالة التذكرة', 'error');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply.trim() || !selectedTicket || !db) return;

    try {
      setSending(true);
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      
      const newReply = {
        sender: 'admin',
        text: adminReply.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedReplies = [...(selectedTicket.replies || []), newReply];

      await updateDoc(ticketRef, {
        replies: updatedReplies,
        status: 'open', // Keep open if admin replies but not resolved
        lastRepliedAt: new Date().toISOString()
      });

      setSelectedTicket(prev => prev ? { ...prev, replies: updatedReplies } : null);
      setAdminReply('');
      showToast('تم إرسال الرد الفني للمشترك بنجاح', 'success');
      fetchTickets();
    } catch (err) {
      console.error('Error saving reply:', err);
      showToast('حدث خطأ أثناء حفظ وحقن الرد', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!db) return;
    if (!window.confirm('هل أنت متأكد من حذف تذكرة الدعم الفني هذه نهائياً؟')) return;

    try {
      await deleteDoc(doc(db, 'support_tickets', ticketId));
      showToast('تم حذف التذكرة الفنية من الأرشيف بنجاح', 'info');
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      console.error('Error deleting ticket:', err);
      showToast('حدث خطأ أثناء مسح التذكرة السحابية', 'error');
    }
  };

  const filteredTickets = tickets.filter(t =>
    t.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ticket Feed List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-stone-800">مركز الدعم الفني وتظلمات الملاك</h3>
              <p className="text-xs text-stone-400">إدارة ومتابعة طلبات الدعم، تعديل البيانات، والشكاوى الفنية المقدمة من شركاء المنصة</p>
            </div>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-black">
              {tickets.filter(t => t.status !== 'resolved').length} معلق
            </span>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="البحث باسم المالك، اسم المحل، أو محتوى الشكوى..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            />
          </div>

          {loading ? (
            <div className="py-24 text-center text-stone-400 font-bold">جاري تحميل بطاقات الدعم الفني...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-24 text-center text-stone-400 border border-dashed border-stone-200 rounded-3xl">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">لا يوجد أي بطاقات أو تظلمات معلقة للمراجعة بالمنصة</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 border rounded-2xl transition-all cursor-pointer flex justify-between items-start ${
                    selectedTicket?.id === ticket.id 
                      ? 'bg-emerald-50/40 border-[#1a4d2e]' 
                      : 'bg-stone-50/50 border-stone-200/50 hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-2 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-stone-800">{ticket.ownerName}</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-[10px] text-stone-400 font-bold truncate max-w-[150px]">{ticket.businessName}</span>
                    </div>
                    
                    <p className="text-xs text-stone-600 font-medium line-clamp-1">{ticket.message}</p>
                    
                    <div className="text-[9px] text-stone-400 font-mono font-bold">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('ar-JO') : '-'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2.5 shrink-0 font-bold text-xs">
                    {ticket.status === 'resolved' ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px]">تم الحل</span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] animate-pulse">مفتوح</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveTicket(ticket.id);
                        }}
                        className="text-[10px] text-emerald-700 hover:bg-emerald-100/50 px-2 py-1 rounded-md transition-colors"
                        title="إغلاق التذكرة الفنية وحلها"
                      >
                        إغلاق وحل
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTicket(ticket.id);
                        }}
                        className="text-stone-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="مسح من الأرشيف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Chat / Correspondence Hub */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs h-fit space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-800">تفاصيل ومحادثة الدعم الفني</h3>
            <p className="text-xs text-stone-400">مراجعة المحادثة السابقة وإرسال الردود والمساعدة التقنية المباشرة</p>
          </div>

          {selectedTicket ? (
            <div className="space-y-4 text-xs font-bold">
              {/* Ticket details info */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/50 space-y-2">
                <div className="flex items-center gap-1.5 text-stone-800">
                  <User className="h-4 w-4 text-stone-500" />
                  <span className="text-sm font-black">{selectedTicket.ownerName}</span>
                </div>
                <p className="text-stone-500 truncate">المحل التجاري: {selectedTicket.businessName}</p>
                {selectedTicket.phone && (
                  <a href={`tel:${selectedTicket.phone}`} className="flex items-center gap-1 text-[#1a4d2e] hover:underline font-mono">
                    <Phone className="h-3 w-3" />
                    <span>{selectedTicket.phone}</span>
                  </a>
                )}
              </div>

              {/* Chat Thread */}
              <div className="border border-stone-100 rounded-xl p-3 max-h-60 overflow-y-auto space-y-3 bg-stone-50/50">
                {/* Initial Client Message */}
                <div className="space-y-1">
                  <div className="bg-white border border-stone-200/60 p-2.5 rounded-2xl rounded-tr-none max-w-[85%]">
                    <p className="text-stone-700 font-medium leading-relaxed">{selectedTicket.message}</p>
                  </div>
                  <span className="text-[9px] text-stone-400 font-mono block mr-1">العميل</span>
                </div>

                {/* Replies Thread */}
                {(selectedTicket.replies || []).map((rep: any, idx: number) => {
                  const isAdminMsg = rep.sender === 'admin';
                  return (
                    <div key={idx} className={`space-y-1 flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                      <div className={`p-2.5 rounded-2xl max-w-[85%] ${
                        isAdminMsg 
                          ? 'bg-[#1a4d2e] text-white rounded-tl-none' 
                          : 'bg-white border border-stone-200/60 text-stone-700 rounded-tr-none'
                      }`}>
                        <p className="font-medium leading-relaxed">{rep.text}</p>
                      </div>
                      <span className="text-[9px] text-stone-400 font-mono block mx-1">
                        {isAdminMsg ? 'إدارة المنصة' : 'العميل'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== 'resolved' ? (
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    value={adminReply}
                    onChange={e => setAdminReply(e.target.value)}
                    placeholder="اكتب رد الدعم والمساعدة المباشرة..."
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={sending || !adminReply.trim()}
                    className="bg-[#1a4d2e] hover:bg-[#133b22] text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-xl text-center">
                  تم إغلاق تذكرة الدعم بنجاح وحل استفسار العميل
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 border border-dashed border-stone-200 rounded-2xl">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">يرجى تحديد تذكرة دعم فني من القائمة للبدء بالمعالجة والرد الفني المباشر</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
