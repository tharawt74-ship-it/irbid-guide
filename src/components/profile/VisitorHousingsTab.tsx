import React, { useState } from 'react';
import { 
  Building2, Plus, Home, MapPin, DollarSign, Clock, 
  CheckCircle2, AlertCircle, Trash2, Edit3, Eye, Phone, Sparkles, ExternalLink 
} from 'lucide-react';
import { HousingItem } from '../../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router';
import { HousingFormModal } from '../housing/HousingFormModal';

interface VisitorHousingsTabProps {
  housings: HousingItem[];
  onRefresh: () => void;
}

export function VisitorHousingsTab({ housings, onRefresh }: VisitorHousingsTabProps) {
  const { currentUser, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHousing, setEditingHousing] = useState<HousingItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الإعلان العقاري؟')) return;
    setDeletingId(id);
    try {
      if (db) {
        await deleteDoc(doc(db, 'housings', id));
      }
      setSuccessMsg('تم حذف الإعلان بنجاح');
      setTimeout(() => setSuccessMsg(null), 4000);
      onRefresh();
    } catch (err) {
      console.error("Error deleting housing:", err);
      alert('حدث خطأ أثناء حذف الإعلان.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    onRefresh();
    setSuccessMsg('تم إرسال/تحديث إعلان العقار بنجاح! سيتم مراجعته من الإدارة.');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / CTA */}
      <div className="bg-gradient-to-l from-[#1a4d2e] to-[#256c42] rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-black text-amber-300">
            <Building2 className="h-3.5 w-3.5" />
            <span>سكنات وشقق إربد والجامعات</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">إدارة عقاراتي وسكناتي المعروضة</h3>
          <p className="text-xs text-white/80 max-w-xl leading-relaxed">
            أضف شقتك، السكن الطلابي، أو العقار للإيجار في إربد، وتابع حالة موافقة الإدارة وتفاصيل الإعلان بكل سهولة.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingHousing(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-[#ff9f1c] hover:bg-[#f39209] text-stone-900 px-5 py-3 rounded-2xl font-black text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة عقار / سكن جديد</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* List of housings */}
      {housings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-stone-200 space-y-4">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <Home className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-stone-800 text-base">لا توجد إعلانات عقارية مضافة حتى الآن</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              يمكنك نشر شقق وسكنات طلاب جامعة اليرموك والتكنو للوصول إلى آلاف الطلاب والعائلات في إربد.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingHousing(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#153e25] text-white px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>نشر أول إعلان سكن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {housings.map(item => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved' || !item.status;
            const isRejected = item.status === 'rejected';

            return (
              <div 
                key={item.id}
                className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between gap-4 shadow-xs ${
                  isPending 
                    ? 'border-amber-200/80 hover:border-amber-300' 
                    : isRejected 
                    ? 'border-rose-200/80 hover:border-rose-300' 
                    : 'border-stone-200 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top line with title and status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {item.type}
                      </span>
                      <h4 className="text-sm font-black text-stone-900 mt-1 line-clamp-1">{item.title}</h4>
                    </div>

                    {isPending && (
                      <span className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0 animate-pulse">
                        <Clock className="h-3 w-3" />
                        <span>قيد المراجعة</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>معتمد ونشط</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="bg-rose-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0">
                        <AlertCircle className="h-3 w-3" />
                        <span>غير معتمد</span>
                      </span>
                    )}
                  </div>

                  {/* Pricing and Location */}
                  <div className="p-3 bg-stone-50 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#1a4d2e] font-black">
                      <DollarSign className="h-4 w-4 text-[#ff9f1c]" />
                      <span>{item.price} د.أ / {item.pricePeriod}</span>
                    </div>
                    <div className="flex items-center gap-1 text-stone-500 text-[11px] font-medium">
                      <MapPin className="h-3.5 w-3.5 text-stone-400" />
                      <span>جامعة {item.university}</span>
                    </div>
                  </div>

                  {/* Status explanation */}
                  {isPending && (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-[11px] text-amber-900 space-y-1">
                      <div className="font-black flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>الطلب بانتظار موافقة الإدارة</span>
                      </div>
                      <p className="text-amber-800/90 leading-relaxed font-medium">
                        تم استلام طلبك، وسيقوم فريق المنصة بالتواصل معك هاتفياً أو عبر الواتساب على ({item.contactPhone || item.phone || 'رقم هاتفك'}) لتأكيد الرسوم وتفعيل الإعلان.
                      </p>
                    </div>
                  )}

                  {isRejected && (
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/70 text-[11px] text-rose-900 space-y-1">
                      <div className="font-black flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>سبب عدم الموافقة:</span>
                      </div>
                      <p className="text-rose-800 leading-relaxed font-medium">
                        {item.rejectionReason || 'يرجى التواصل مع إدارة منصة شو في بإربد لمزيد من التفاصيل.'}
                      </p>
                    </div>
                  )}

                  {isApproved && item.expiryDate && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1 px-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>ينتهي الإعلان في: {new Date(item.expiryDate).toLocaleDateString('ar-JO')}</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                  <Link
                    to="/housing"
                    className="text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>صفحة العقارات</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingHousing(item);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-[#1a4d2e] hover:text-white rounded-xl text-stone-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl text-rose-600 font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <HousingFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingHousing(null);
        }}
        onSaveSuccess={handleSaved}
        initialListing={editingHousing}
        currentUser={currentUser}
        isAdmin={isAdmin}
      />
    </div>
  );
}
