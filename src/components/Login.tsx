import React from 'react';
import { AppAuthSession, AppUserRole } from '../lib/types';
import { Cookie as CookieIcon, User as UserIcon, Lock } from 'lucide-react';

interface Props {
  onLogin: (user: AppAuthSession) => void;
}

export default function AppLogin({ onLogin }: Props) {
  const handleLogin = (role: AppUserRole, name: string) => {
    onLogin({ role, name });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 text-slate-900 rounded-[2rem] shadow-xl shadow-amber-500/20 mb-6 group transition-all hover:scale-110">
            <CookieIcon size={40} className="group-hover:rotate-12 transition-transform" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">كوكيز لاند</h1>
          <p className="text-slate-400 font-medium">نظام الإدارة المالية والتشغيلية</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-8 text-center flex items-center justify-center gap-2">
              <Lock size={20} className="text-amber-500" />
              تسجيل الدخول
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleLogin('ownerA', 'محمد')}
                className="group relative flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  م
                </div>
                <div className="text-right">
                  <div className="block font-black text-xl mb-0.5">محمد</div>
                  <div className="text-indigo-200 text-sm font-bold opacity-80 uppercase tracking-widest text-[10px]">المالك (58%)</div>
                </div>
                <UserIcon className="absolute left-6 text-white/20 group-hover:text-white/40 transition-colors" size={32} />
              </button>

              <button
                onClick={() => handleLogin('ownerB', 'عبيدة')}
                className="group relative flex items-center gap-4 bg-violet-600 hover:bg-violet-700 text-white p-6 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-600/20"
              >
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                  ع
                </div>
                <div className="text-right">
                  <div className="block font-black text-xl mb-0.5">عبيدة</div>
                  <div className="text-violet-200 text-sm font-bold opacity-80 uppercase tracking-widest text-[10px]">شريك (42%)</div>
                </div>
                <UserIcon className="absolute left-6 text-white/20 group-hover:text-white/40 transition-colors" size={32} />
              </button>
            </div>

            
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                الإصدار 2.0 • تم التطوير بواسطة<br/>
                <span className="text-amber-500/50">محرك كوكيز لاند المحاسبي (ERP)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}