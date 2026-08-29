import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { SupervisorAccount, SupervisorPermissions } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Shield, ShieldCheck, ShieldAlert, Plus, Trash2, 
  Edit3, Check, X, UserCheck, Lock, Activity, Clock
} from 'lucide-react';

export function SupervisorsManager() {
  const { currentUser, isAdmin } = useAuth();
  const [supervisors, setSupervisors] = useState<SupervisorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSupervisor, setNewSupervisor] = useState({
    uid: '',
    email: '',
    displayName: '',
    notes: '',
    permissions: {
      canApproveShops: true,
      canModerateJobs: true,
      canModerateReviews: true,
      canManageBanners: false
    } as SupervisorPermissions
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Fetch supervisors from Firestore
  const fetchSupervisors = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'supervisors'));
      const list: SupervisorAccount[] = [];
      snap.forEach(d => {
        list.push({ uid: d.id, ...d.data() } as SupervisorAccount);
      });
      setSupervisors(list);
    } catch (e) {
      console.error("Error fetching supervisors:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newSupervisor.email || !newSupervisor.displayName) return;
    setSaving(true);
    try {
      const supId = newSupervisor.uid.trim() || `sup_${Date.now()}`;
      const payload: SupervisorAccount = {
        uid: supId,
        email: newSupervisor.email.trim().toLowerCase(),
        displayName: newSupervisor.displayName.trim(),
        role: 'supervisor',
        permissions: newSupervisor.permissions,
        createdAt: Date.now(),
        addedBy: currentUser?.email || 'admin',
        notes: newSupervisor.notes.trim()
      };

      await setDoc(doc(db, 'supervisors', supId), payload);

      // Also create or update in /users collection so AuthContext will recognize the role
      await setDoc(doc(db, 'users', supId), {
        email: payload.email,
        displayName: payload.displayName,
        role: 'supervisor',
        supervisorPermissions: payload.permissions
      }, { merge: true });

      setSupervisors(prev => [...prev.filter(s => s.uid !== supId), payload]);
      setIsAddModalOpen(false);
      setNewSupervisor({
        uid: '',
        email: '',
        displayName: '',
        notes: '',
        permissions: {
          canApproveShops: true,
          canModerateJobs: true,
          canModerateReviews: true,
          canManageBanners: false
        }
      });
      setStatusMsg('تم إضافة وتوثيق حساب المشرف بنجاح وتعيين الصلاحيات المخصصة.');
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err) {
      console.error("Error adding supervisor:", err);
      alert("حدث خطأ أثناء إضافة المشرف.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = async (sup: SupervisorAccount, permKey: keyof SupervisorPermissions) => {
    if (!db || !isAdmin) return;
    const updatedPerms = {
      ...sup.permissions,
      [permKey]: !sup.permissions[permKey]
    };

    try {
      await updateDoc(doc(db, 'supervisors', sup.uid), {
        permissions: updatedPerms
      });
      await updateDoc(doc(db, 'users', sup.uid), {
        supervisorPermissions: updatedPerms
      });

      setSupervisors(prev => prev.map(s => s.uid === sup.uid ? { ...s, permissions: updatedPerms } : s));
      setStatusMsg(`تم تحديث صلاحيات المشرف (${sup.displayName}) فورياً.`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Error updating permission:", err);
    }
  };

  const handleDeleteSupervisor = async (sup: SupervisorAccount) => {
    if (!db || !isAdmin || !confirm(`هل أنت متأكد من إلغاء رتبة المشرف عن: ${sup.displayName}؟`)) return;
    try {
      await deleteDoc(doc(db, 'supervisors', sup.uid));
      await setDoc(doc(db, 'users', sup.uid), { role: 'user' }, { merge: true });
      setSupervisors(prev => prev.filter(s => s.uid !== sup.uid));
      setStatusMsg(`تم إلغاء صلاحيات الإشراف عن ${sup.displayName}.`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Error deleting supervisor:", err);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Top Banner Card */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#1a4d2e]" />
            <h3 className="text-xl font-black text-stone-900">هيئة الإشراف وإدارة الصلاحيات</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            الفصل التام بين مهام كل مشرف، وتوزيع الصلاحيات الدقيقة لاعتماد المحلات والوظائف ومراقبة التقييمات.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[#ff9f1c]" />
            <span>تعيين مشرف جديد</span>
          </button>
        )}
      </div>

      {/* Super Admin Info Card */}
      <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200 rounded-3xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-black text-amber-950">مدير الموقع العام (Super Admin)</div>
              <div className="font-mono text-xs text-amber-800 font-bold">{currentUser?.email}</div>
            </div>
          </div>
          <span className="text-[10px] bg-amber-500 text-white font-black px-2.5 py-1 rounded-full">
            صلاحيات كاملة مطلقة
          </span>
        </div>
        <p className="text-[11px] text-amber-800/80 leading-relaxed">
          المدير العام يمتلك حق إدارة إعدادات المنصة، إضافة وعزل المشرفين، التحكم بقواعد البيانات، وبث الإشعارات لجميع المستخدمين.
        </p>
      </div>

      {/* Supervisors List Table / Cards */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h4 className="font-black text-sm text-stone-800">قائمة المشرفين المعتمدين ({supervisors.length})</h4>
          <span className="text-xs text-stone-400">تخضع إجراءات كل مشرف للتوثيق والتسجيل الفردي</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 font-bold">جاري تحميل حسابات المشرفين...</div>
        ) : supervisors.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Shield className="h-10 w-10 text-stone-300 mx-auto" />
            <div className="text-sm font-bold text-stone-700">لم يتم تعيين أي مشرفين إضافيين بعد</div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              يمكنك تفويض مهام مراجعة المحلات والوظائف الشاغرة لمشرفين محددين مع التحكم الدقيق بصلاحيات كل منهم.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {supervisors.map((sup) => (
              <div key={sup.uid} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-stone-900">{sup.displayName}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                      مشرف معتمد
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 font-mono" dir="ltr">{sup.email}</div>
                  {sup.notes && <p className="text-xs text-stone-600 bg-stone-100/70 px-2.5 py-1 rounded-lg inline-block">{sup.notes}</p>}
                </div>

                {/* Permissions Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePermission(sup, 'canApproveShops')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      sup.permissions?.canApproveShops 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                    }`}
                    title="صلاحية قبول واعتماد المحلات"
                  >
                    <span>اعتماد المحلات</span>
                    {sup.permissions?.canApproveShops ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePermission(sup, 'canModerateJobs')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      sup.permissions?.canModerateJobs 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                    }`}
                    title="صلاحية مراجعة الوظائف"
                  >
                    <span>إدارة الوظائف</span>
                    {sup.permissions?.canModerateJobs ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePermission(sup, 'canModerateReviews')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      sup.permissions?.canModerateReviews 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                    }`}
                    title="صلاحية مراجعة البلاغات والتقييمات"
                  >
                    <span>مراقبة التقييمات</span>
                    {sup.permissions?.canModerateReviews ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSupervisor(sup)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="إلغاء صفة المشرف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Supervisor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#1a4d2e]" />
                <h4 className="font-black text-stone-900 text-base">تعيين مشرف جديد</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSupervisor} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">اسم المشرف الثلاثي:</label>
                <input
                  type="text"
                  required
                  value={newSupervisor.displayName}
                  onChange={e => setNewSupervisor(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="مثال: أحمد عبد الله (مشرف مأكولات)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-[#1a4d2e] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">البريد الإلكتروني للمشرف:</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={newSupervisor.email}
                  onChange={e => setNewSupervisor(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="supervisor@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-[#1a4d2e] focus:outline-none text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">معرف الحساب (UID - اختياري):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={newSupervisor.uid}
                  onChange={e => setNewSupervisor(prev => ({ ...prev, uid: e.target.value }))}
                  placeholder="إذا كان مسجلاً مسبقاً في Firebase"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-[#1a4d2e] focus:outline-none text-left"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-black text-stone-800">تحديد الصلاحيات الممنوحة:</label>
                
                <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={newSupervisor.permissions.canApproveShops}
                    onChange={e => setNewSupervisor(prev => ({
                      ...prev,
                      permissions: { ...prev.permissions, canApproveShops: e.target.checked }
                    }))}
                    className="rounded text-[#1a4d2e] focus:ring-[#1a4d2e]"
                  />
                  <span>مراجعة وقبول طلبات تسجيل المحلات الجديدة</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={newSupervisor.permissions.canModerateJobs}
                    onChange={e => setNewSupervisor(prev => ({
                      ...prev,
                      permissions: { ...prev.permissions, canModerateJobs: e.target.checked }
                    }))}
                    className="rounded text-[#1a4d2e] focus:ring-[#1a4d2e]"
                  />
                  <span>إدارة ونشر الشواغر والفرص الوظيفية في إربد</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={newSupervisor.permissions.canModerateReviews}
                    onChange={e => setNewSupervisor(prev => ({
                      ...prev,
                      permissions: { ...prev.permissions, canModerateReviews: e.target.checked }
                    }))}
                    className="rounded text-[#1a4d2e] focus:ring-[#1a4d2e]"
                  />
                  <span>مراجعة التقييمات والبلاغات وإزالة المحتوى المخالف</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] rounded-xl shadow-xs disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'اعتماد المشرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
