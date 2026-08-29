import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, Crown, UtensilsCrossed, BarChart3, Lock } from 'lucide-react';
import { Business } from '../../types';
import { VipAnalyticsDashboard } from './VipAnalyticsDashboard';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { VipUpgradeRequestModal } from './VipUpgradeRequestModal';

interface VipAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onOpenMenuManager?: () => void;
}

export function VipAnalyticsModal({
  isOpen,
  onClose,
  business,
  onOpenMenuManager
}: VipAnalyticsModalProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const vipInfo = getBusinessVipStatus(business);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  if (!vipInfo.isVip) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-amber-200 text-center space-y-5 my-auto animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <BarChart3 className="h-8 w-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-amber-950">تقارير وإحصائيات الزوار المتقدمة</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              تقارير الزيارات، معدلات النقر على الاتصال والواتساب، ومؤشرات التفاعل متاحة حصرياً للمشتركين في <span className="font-bold text-stone-900">الباقة الذهبية (VIP)</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={() => {
                setShowUpgradeModal(true);
              }}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              ترقية المحل لـ VIP 👑
            </button>
          </div>
        </div>
        {showUpgradeModal && (
          <VipUpgradeRequestModal
            isOpen={showUpgradeModal}
            onClose={() => {
              setShowUpgradeModal(false);
              onClose();
            }}
            business={business}
          />
        )}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-200 relative my-auto animate-in fade-in zoom-in-95 space-y-6">
        
        {/* Top Header Controls */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-800">
              <Crown className="h-6 w-6 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
                لوحة تحليلات واحصائيات VIP • {business.name}
              </h2>
              <p className="text-xs text-stone-500">
                مؤشرات أداء تفاعلية لحظية خاصة بصاحب المنشأة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMenuManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMenuManager();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <UtensilsCrossed className="h-4 w-4 text-amber-700" />
                <span>إدارة المنيو والكتالوج الرقمي</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-full transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Dashboard Component */}
        <VipAnalyticsDashboard business={business} isOwner={true} />

      </div>
    </div>,
    document.body
  );
}
