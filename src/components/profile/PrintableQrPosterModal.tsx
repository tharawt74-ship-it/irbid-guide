import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Business } from '../../types';
import { Printer, X, Download, Sparkles, QrCode, Store, Check, Copy } from 'lucide-react';

interface PrintableQrPosterModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
}

export function PrintableQrPosterModal({ business, isOpen, onClose }: PrintableQrPosterModalProps) {
  const [posterStyle, setPosterStyle] = useState<'golden' | 'emerald' | 'minimal'>('golden');
  const [customSubtitle, setCustomSubtitle] = useState('امسح الكود لمعاينة المنيو والتقييم والعروض الحصرية ⭐');
  const [tableNumber, setTableNumber] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const storeUrl = `${window.location.origin}/business/${business.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(storeUrl)}&color=1a4d2e`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl">
      
      {/* Printable CSS style rule injected when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-poster-area, #printable-poster-area * {
            visibility: visible;
          }
          #printable-poster-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            display: flex !important;
            align-items: center;
            justify-center: center;
            padding: 2cm;
            background: white !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#2d2a26]">مولد بوسترات وطاولات الـ QR Mapped الملصقة</h3>
              <p className="text-xs text-stone-500">صمّم ملصق طاولتك أو واجهة محلك التجاري وجاهز للطباعة الفورية مباشرةً</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customization Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">نمط التصميم المفضل</label>
            <select
              value={posterStyle}
              onChange={e => setPosterStyle(e.target.value as any)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            >
              <option value="golden">✨ تصميم الباقة الذهبية الإربدية</option>
              <option value="emerald">🌿 نمط الأخبار والأيقونات الإربدية</option>
              <option value="minimal">⚪ نمط المنيو النظيف المعاصر</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">النص الترحيبي للزبون</label>
            <input
              type="text"
              value={customSubtitle}
              onChange={e => setCustomSubtitle(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">رقم الطاولة / القسم (اختياري)</label>
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="مثال: طاولة رقم 04"
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            />
          </div>
        </div>

        {/* Poster Live Canvas Preview */}
        <div className="flex justify-center py-2 bg-stone-100 rounded-2xl p-4 overflow-x-auto">
          <div
            id="printable-poster-area"
            className={`w-[340px] sm:w-[380px] p-8 rounded-[32px] shadow-xl text-center space-y-6 border transition-all ${
              posterStyle === 'golden'
                ? 'bg-gradient-to-b from-[#1a4d2e] via-[#143e25] to-[#0d2a19] text-white border-amber-400/60'
                : posterStyle === 'emerald'
                ? 'bg-white text-stone-900 border-[#1a4d2e] ring-4 ring-[#1a4d2e]/10'
                : 'bg-stone-50 text-stone-900 border-stone-300'
            }`}
          >
            {/* Header / Logo */}
            <div className="space-y-3 flex flex-col items-center">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-amber-400"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center font-bold">
                  <Store className="h-10 w-10" />
                </div>
              )}

              <div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider block mb-1 ${
                  posterStyle === 'golden' ? 'bg-amber-400 text-stone-950' : 'bg-[#1a4d2e] text-white'
                }`}>
                  منصة شو في بإربد • الصفحة الرسمية
                </span>
                <h2 className="text-xl font-black leading-tight mt-1">{business.name}</h2>
                <p className={`text-xs mt-1 font-medium ${posterStyle === 'golden' ? 'text-amber-200/90' : 'text-stone-500'}`}>
                  {business.category} • {business.address}
                </p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-5 rounded-2xl shadow-lg inline-block mx-auto border border-stone-200/80">
              <img
                src={qrCodeUrl}
                alt="Store QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
              <span className="text-[10px] font-bold text-stone-400 block mt-2 font-mono">
                Scan with Phone Camera 📱
              </span>
            </div>

            {/* Subtitle & Table Tag */}
            <div className="space-y-2">
              {tableNumber && (
                <div className={`inline-block px-4 py-1.5 rounded-xl font-black text-xs ${
                  posterStyle === 'golden' ? 'bg-white/15 text-amber-300' : 'bg-stone-100 text-stone-800 border border-stone-200'
                }`}>
                  📌 {tableNumber}
                </div>
              )}

              <p className={`text-xs font-bold leading-relaxed px-2 ${
                posterStyle === 'golden' ? 'text-stone-200' : 'text-stone-700'
              }`}>
                {customSubtitle}
              </p>
            </div>

            {/* Footer Brand Credit */}
            <div className={`pt-3 border-t text-[10px] font-bold flex items-center justify-center gap-1 ${
              posterStyle === 'golden' ? 'border-white/10 text-stone-400' : 'border-stone-200 text-stone-400'
            }`}>
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>دليل إربد التجاري والسياحي الشامل (irbid.shop)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'تم نسخ الرابط' : 'نسخ رابط الصفحة'}</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#ff9f1c]" />
              <span>🖨️ طباعة البوستر الآن</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
