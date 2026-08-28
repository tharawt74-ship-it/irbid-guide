const fs = require('fs');
let code = `import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { MapPin, Plus, Trash2, Edit2, Check, X, Layers } from 'lucide-react';
import { IrbidAreaGroup } from '../../lib/categories';

interface NeighborhoodsManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function NeighborhoodsManager({ showToast }: NeighborhoodsManagerProps) {
  const { neighborhoods, updateNeighborhoods } = useSystemSettings();
  const [editingGroupIdx, setEditingGroupIdx] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newAreaNames, setNewAreaNames] = useState<{[key: number]: string}>({});

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      showToast('يرجى كتابة اسم المجموعة (اللواء/المنطقة)', 'error');
      return;
    }
    const updated = [...neighborhoods, { groupName: newGroupName.trim(), areas: [] }];
    await updateNeighborhoods(updated);
    showToast(\`تمت إضافة المجموعة (\${newGroupName.trim()}) بنجاح\`);
    setNewGroupName('');
  };

  const handleDeleteGroup = async (idx: number) => {
    if (confirm('هل أنت متأكد من حذف هذه المجموعة بالكامل؟')) {
      const updated = neighborhoods.filter((_, i) => i !== idx);
      await updateNeighborhoods(updated);
      showToast('تم حذف المجموعة', 'info');
    }
  };

  const handleUpdateGroupName = async (idx: number) => {
    if (!editingGroupName.trim()) return;
    const updated = [...neighborhoods];
    updated[idx].groupName = editingGroupName.trim();
    await updateNeighborhoods(updated);
    showToast('تم تحديث اسم المجموعة بنجاح', 'success');
    setEditingGroupIdx(null);
  };

  const handleAddArea = async (groupIdx: number) => {
    const areaName = newAreaNames[groupIdx];
    if (!areaName || !areaName.trim()) {
      showToast('يرجى كتابة اسم المنطقة/الحي', 'error');
      return;
    }
    const updated = [...neighborhoods];
    if (!updated[groupIdx].areas.includes(areaName.trim())) {
      updated[groupIdx].areas.push(areaName.trim());
      await updateNeighborhoods(updated);
      showToast(\`تم إضافة (\${areaName.trim()}) بنجاح\`);
    }
    setNewAreaNames({ ...newAreaNames, [groupIdx]: '' });
  };

  const handleDeleteArea = async (groupIdx: number, areaIdx: number) => {
    if (confirm('هل أنت متأكد من حذف هذه المنطقة؟')) {
      const updated = [...neighborhoods];
      updated[groupIdx].areas = updated[groupIdx].areas.filter((_, i) => i !== areaIdx);
      await updateNeighborhoods(updated);
      showToast('تم الحذف بنجاح', 'info');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
        <div className="p-3 bg-red-50 rounded-2xl text-red-600">
          <MapPin className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-stone-900">إدارة مناطق وأحياء مدينة إربد</h2>
          <p className="text-stone-500 text-xs">إضافة وتعديل الألوية والأحياء لتظهر في فلتر البحث الرئيسي</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
        <input
          type="text"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          placeholder="مثال: ألوية وقرى إربد، أحياء إربد الرئيسية..."
          className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-800"
        />
        <button
          onClick={handleAddGroup}
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-colors shrink-0"
        >
          <Plus className="h-4 w-4 text-[#ff9f1c]" />
          <span>إضافة مجموعة جديدة</span>
        </button>
      </div>

      <div className="space-y-6">
        {neighborhoods.map((group, groupIdx) => (
          <div key={groupIdx} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {editingGroupIdx === groupIdx ? (
                <div className="flex items-center gap-2 flex-1">
                  <input 
                    type="text"
                    value={editingGroupName}
                    onChange={e => setEditingGroupName(e.target.value)}
                    className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-sm font-bold"
                  />
                  <button onClick={() => handleUpdateGroupName(groupIdx)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingGroupIdx(null)} className="p-1.5 bg-red-100 text-red-700 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#1a4d2e]" />
                  <h3 className="font-black text-stone-800 text-base">{group.groupName}</h3>
                  <button 
                    onClick={() => {
                      setEditingGroupIdx(groupIdx);
                      setEditingGroupName(group.groupName);
                    }} 
                    className="p-1 text-stone-400 hover:text-[#1a4d2e] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                 <input
                    type="text"
                    value={newAreaNames[groupIdx] || ''}
                    onChange={e => setNewAreaNames({...newAreaNames, [groupIdx]: e.target.value})}
                    placeholder="إضافة حي/منطقة..."
                    className="w-48 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs"
                    onKeyDown={e => e.key === 'Enter' && handleAddArea(groupIdx)}
                  />
                  <button
                    onClick={() => handleAddArea(groupIdx)}
                    className="p-1.5 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#133b22]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(groupIdx)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 mr-2"
                    title="حذف المجموعة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {group.areas.map((area, areaIdx) => (
                <div key={areaIdx} className="bg-stone-50 border border-stone-100 rounded-lg p-2 flex items-center justify-between group">
                  <span className="text-xs font-bold text-stone-700 truncate">{area}</span>
                  <button
                    onClick={() => handleDeleteArea(groupIdx, areaIdx)}
                    className="text-stone-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {group.areas.length === 0 && (
                <div className="col-span-full text-center py-4 text-xs text-stone-400">
                  لا يوجد مناطق مضافة في هذه المجموعة
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/admin/NeighborhoodsManager.tsx', code);
