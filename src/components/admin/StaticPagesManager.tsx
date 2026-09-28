import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { FileText, Save, PhoneCall, Plus, Trash2 } from 'lucide-react';
import { EmergencyNumber } from '../../types';

interface StaticPagesManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function StaticPagesManager({ showToast }: StaticPagesManagerProps) {
  const { staticPages, updateStaticPages } = useSystemSettings();
  const [formData, setFormData] = useState(staticPages);

  const [newTitle, setNewTitle] = useState('');
  const [newNumber, setNewNumber] = useState('');

  const handleSave = async () => {
    await updateStaticPages(formData);
    showToast('تم حفظ صفحات المحتوى والسياسات وأرقام الطوارئ بنجاح');
  };

  const handleAddEmergency = () => {
    if (!newTitle.trim() || !newNumber.trim()) {
      showToast('يرجى كتابة اسم الجهة ورقم الهاتف', 'error');
      return;
    }
    const newEntry: EmergencyNumber = {
      id: `em_${Date.now()}`,
      title: newTitle.trim(),
      number: newNumber.trim()
    };
    setFormData(prev => ({
      ...prev,
      emergencyNumbers: [...prev.emergencyNumbers, newEntry]
    }));
    setNewTitle('');
    setNewNumber('');
  };

  const handleRemoveEmergency = (id: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyNumbers: prev.emergencyNumbers.filter(e => e.id !== id)
    }));
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 rounded-2xl text-purple-700">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة صفحات المحتوى الثابت وسياسة الخصوصية والطوارئ</h2>
            <p className="text-stone-500 text-xs">تعديل نصوص من نحن، شروط الاستخدام، سياسة الخصوصية وأرقام الطوارئ للخدمات</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
        >
          <Save className="h-4 w-4 text-[#ff9f1c]" />
          <span>حفظ المحتوى</span>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">نص صفحة "من نحن"</label>
          <textarea
            rows={4}
            value={formData.aboutUsText}
            onChange={e => setFormData({ ...formData, aboutUsText: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs font-medium text-stone-800"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">نص "شروط الاستخدام والخدمة"</label>
          <textarea
            rows={4}
            value={formData.termsText}
            onChange={e => setFormData({ ...formData, termsText: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs font-medium text-stone-800"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">نص "سياسة الخصوصية وحماية البيانات"</label>
          <textarea
            rows={4}
            value={formData.privacyText}
            onChange={e => setFormData({ ...formData, privacyText: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs font-medium text-stone-800"
          />
        </div>

        {/* Emergency Numbers Section */}
        <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 space-y-4">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-red-600" />
            <span>إدارة أرقام هواتف الطوارئ والخدمات العامة في إربد</span>
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="اسم الجهة (مثال: طوارئ الكهرباء إربد)"
              className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            />
            <input
              type="text"
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              placeholder="رقم الهاتف (مثال: 027201000)"
              className="w-full sm:w-48 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 dir-ltr text-right"
            />
            <button
              onClick={handleAddEmergency}
              className="bg-stone-800 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {formData.emergencyNumbers.map((em) => (
              <div key={em.id} className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-stone-900">{em.title}</h4>
                  <p className="text-xs font-mono font-black text-red-600 dir-ltr text-right">{em.number}</p>
                </div>
                <button
                  onClick={() => handleRemoveEmergency(em.id)}
                  className="text-stone-400 hover:text-red-600 p-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
