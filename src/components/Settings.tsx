import React, { useState } from 'react';
import { AppCoreState, INITIAL_STATE } from '../lib/types';
import { FileDown, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  addLog: (action: string, details?: string) => void;
}

export default function AppSettings({ state, setState, hideNumbers, addLog }: Props) {
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const dumpState = () => {
    const json = JSON.stringify(state, null, 2);
    const block = `--- SYSTEM_STATE_BLOCK_START ---\n${json}\n--- SYSTEM_STATE_BLOCK_END ---`;
    navigator.clipboard.writeText(block);
    addLog('تصدير بيانات', 'تم تصدير حالة النظام الحالية');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    addLog('تصفير النظام', 'تم إعادة النظام للوضع الافتراضي');
    localStorage.removeItem('cookieFactoryState');
    setState(INITIAL_STATE);
    setShowResetConfirm(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-rose-100 p-3 rounded-full text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">العودة للوضع الافتراضي؟</h3>
                <p className="text-slate-500 text-sm">
                  سيتم مسح جميع الحركات والمخزون والإعدادات الخاصة بك، وسيتم إرجاع النظام إلى بيانات التجربة الأصلية. لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                إلغاء الأمر
              </button>
              <button 
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
              >
                نعم، احذف كل شيء
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">الإعدادات</h2>
          <p className="text-slate-500 text-sm">تكوين النسب المالية وإدارة بيانات النظام.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">الهيكل المالي</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">محمد (المالك أ)</span>
              <span className="font-bold text-slate-900">{(state.settings.ownerAShare * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">عبيدة (المالك ب)</span>
              <span className="font-bold text-slate-900">{(state.settings.ownerBShare * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100 font-medium">
              <strong>قاعدة الهدر:</strong> يتم خصم تكاليف الهدر المباشر من الحصة الشخصية للشخص المسؤول، لحماية أرباح المشروع.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
             <h3 className="text-lg font-bold text-slate-800 mb-4">بيانات النظام</h3>
             <p className="text-sm text-slate-500 mb-6">
               لضمان عدم ضياع البيانات بين الجلسات، يمكنك نسخ بيانات النظام كنص ولصقها للذكاء الاصطناعي في الجلسة القادمة.
             </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button 
              onClick={dumpState}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-colors w-full sm:w-auto"
            >
              <FileDown size={18} />
              <span>{copied ? 'تم النسخ!' : 'تصدير البيانات'}</span>
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center justify-center gap-2 bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-3 rounded-xl font-bold transition-colors w-full sm:w-auto"
            >
              <RefreshCw size={18} />
              <span>العودة للافتراضي</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
