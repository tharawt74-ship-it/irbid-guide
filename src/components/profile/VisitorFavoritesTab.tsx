import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Business } from '../../types';
import { Heart, Star, MapPin, Phone, Trash2, Store, ArrowLeft, ExternalLink } from 'lucide-react';
import { getWhatsAppUrl } from '../../lib/contactHelper';

export function VisitorFavoritesTab() {
  const { userFavorites, toggleFavorite, currentUser } = useAuth();
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      if (userFavorites.length === 0) {
        setFavoriteBusinesses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const loaded: Business[] = [];
        if (db) {
          // Fetch each favorite business doc
          for (const bizId of userFavorites) {
            try {
              const docRef = doc(db, 'businesses', bizId);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                loaded.push({ id: docSnap.id, ...docSnap.data() } as Business);
              }
            } catch (err) {
              console.warn(`Could not load favorite business ${bizId}:`, err);
            }
          }
        }
        setFavoriteBusinesses(loaded);
      } catch (e) {
        console.error("Error loading favorites:", e);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [userFavorites]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e] border-t-transparent animate-spin"></div>
        <p className="text-xs text-stone-500 font-bold">جاري تحميل قائمة محلاتك المفضلة...</p>
      </div>
    );
  }

  if (userFavorites.length === 0 || favoriteBusinesses.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
          <Heart className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-base font-black text-stone-800">قائمة المفضلة فارغة حالياً</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            يمكنك حفظ أي محل أو مطعم أو كافيه يعجبك في إربد بالضغط على زر القلب في صفحته للرجوع إليه في أي وقت بسهولة وسرعة.
          </p>
        </div>
        <Link 
          to="/"
          className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#133b22] transition-colors shadow-2xs"
        >
          <span>تصفح دليل إربد الآن</span>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          <h3 className="text-base font-black text-stone-800">المحلات والأنشطة المفضلة ({favoriteBusinesses.length})</h3>
        </div>
        <span className="text-xs text-stone-500">محفوظة في حسابك الشخصي</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {favoriteBusinesses.map((biz) => (
          <div 
            key={biz.id} 
            className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
                <img 
                  src={biz.imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400"} 
                  alt={biz.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-black text-stone-900 text-sm truncate">{biz.name}</h4>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(biz.id)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 truncate mt-0.5">{biz.category}</p>

                <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-600">
                  <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                    {biz.rating || 5.0}
                  </span>
                  {biz.district && (
                    <span className="flex items-center gap-1 text-[10px] text-stone-500 truncate">
                      <MapPin className="h-2.5 w-2.5 text-stone-400" />
                      {biz.district}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
              {biz.phone ? (
                <a
                  href={`tel:${biz.phone}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 hover:text-[#1a4d2e] bg-stone-50 hover:bg-stone-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Phone className="h-3 w-3 text-[#1a4d2e]" />
                  <span>اتصال</span>
                </a>
              ) : <div />}

              <Link
                to={`/business/${biz.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
              >
                <span>زيارة المحل</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
