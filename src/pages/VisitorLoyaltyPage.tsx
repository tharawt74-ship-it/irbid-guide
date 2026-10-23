import React from 'react';
import { ArrowRight, Award } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SEO } from '../components/common/SEO';
import { VisitorLoyaltyPage as VisitorLoyaltyContent } from '../components/profile/VisitorLoyaltyPage';

export function VisitorLoyaltyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 pb-16 pt-4 sm:pt-6" dir="rtl">
      <SEO 
        title="بطاقات الولاء والأختام الرقمية | إربد" 
        description="بطاقات الولاء والأختام الرقمية" 
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Top Header & Back Navigation */}
        <div className="flex items-center justify-between gap-3 bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all cursor-pointer active:scale-95"
              title="العودة للملف الشخصي"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-xl font-black text-stone-900 leading-tight flex items-center gap-2">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              <span>بطاقات الولاء والأختام الرقمية</span>
            </h1>
          </div>
        </div>

        <VisitorLoyaltyContent />
      </div>
    </div>
  );
}

export default VisitorLoyaltyPage;
