import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Trash2, Edit3, MapPin, 
  Phone, Store, CheckCircle2, RefreshCw, X, Link2,
  ExternalLink, Layers, ShieldCheck, ChevronRight
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Business, BusinessChain } from '../../types';
import { useConfirm } from '../../contexts/ConfirmContext';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../lib/contactHelper';

interface MultiBranchesManagerProps {
  businesses?: Business[];
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function MultiBranchesManager({ businesses = [], showToast }: MultiBranchesManagerProps) {
  const { confirm } = useConfirm();
  const [chains, setChains] = useState<BusinessChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<BusinessChain | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('مطاعم وكافيهات');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [branches, setBranches] = useState<BusinessChain['branches']>([
    { businessId: '', branchName: 'الفرع الرئيسي', district: 'شارع الجامعة', isMainBranch: true }
  ]);

  useEffect(() => {
    loadChains();
  }, []);

  const loadChains = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'business_chains'));
      if (!snap.empty) {
        const list: BusinessChain[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as BusinessChain);
        });
        setChains(list);
        try { localStorage.setItem('shoof_business_chains_admin', JSON.stringify(list)); } catch {}
      } else {
        setChains([]);
        try { localStorage.removeItem('shoof_business_chains_admin'); } catch {}
      }
    } catch (err) {
      console.warn('Business chains fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingChain(null);
    setBrandName('');
    setCategory('مطاعم وكافيهات');
    setPrimaryPhone('');
    setLogoUrl('');
    setBranches([
      { businessId: '', branchName: 'الفرع الرئيسي', district: 'شارع الجامعة', isMainBranch: true }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (chain: BusinessChain) => {
    setEditingChain(chain);
    setBrandName(chain.brandName);
    setCategory(chain.category || 'مطاعم وكافيهات');
    setPrimaryPhone(chain.primaryPhone || '');
    setLogoUrl(chain.logoUrl || '');
    setBranches(chain.branches && chain.branches.length > 0 ? chain.branches : [
      { businessId: '', branchName: 'الفرع الرئيسي', district: 'شارع الجامعة', isMainBranch: true }
    ]);
    setIsModalOpen(true);
  };

  const handleAddBranchRow = () => {
    setBranches([
      ...branches,
      { businessId: '', branchName: `فرع ${branches.length + 1}`, district: 'الحي الشرقي', isMainBranch: false }
    ]);
  };

  const handleRemoveBranchRow = (idx: number) => {
    if (branches.length <= 1) {
      showToast('يجب أن تحتوي السلسلة على فرع واحد على الأقل', 'error');
      return;
    }
    setBranches(branches.filter((_, i) => i !== idx));
  };

  const handleUpdateBranch = (idx: number, field: string, val: any) => {
    const updated = [...branches];
    updated[idx] = { ...updated[idx], [field]: val };
    if (field === 'isMainBranch' && val === true) {
      updated.forEach((b, i) => {
        if (i !== idx) b.isMainBranch = false;
      });
    }
    setBranches(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      showToast('يرجى كتابة اسم العلامة التجارية أو السلسلة', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<BusinessChain> = {
        brandName: brandName.trim(),
        category,
        primaryPhone: primaryPhone.trim(),
        logoUrl: logoUrl.trim(),
        branches: branches.filter(b => b.branchName.trim()),
        createdAt: editingChain?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (db) {
        if (editingChain) {
          await setDoc(doc(db, 'business_chains', editingChain.id), payload, { merge: true });
        } else {
          const newDoc = await addDoc(collection(db, 'business_chains'), payload);
          payload.id = newDoc.id;
        }
      }

      const chainId = editingChain ? editingChain.id : (payload.id || `chain-${Date.now()}`);
      const updatedList = editingChain
        ? chains.map(c => c.id === editingChain.id ? { ...c, ...payload, id: chainId } as BusinessChain : c)
        : [{ id: chainId, ...payload } as BusinessChain, ...chains];

      setChains(updatedList);
      try { localStorage.setItem('shoof_business_chains_admin', JSON.stringify(updatedList)); } catch {}

      showToast(editingChain ? 'تم تحديث السلسلة والفروع بنجاح' : 'تم إنشاء السلسلة وربط الفروع بنجاح', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving chain:', err);
      showToast('حدث خطأ أثناء حفظ السلسلة', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChain = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'حذف سلسلة الفروع',
      message: `هل أنت متأكد من حذف مجموعة "${name}"؟ ستبقى المحلات الفردية كما هي ولن تُحذف.`
    });
    if (!isOk) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'business_chains', id));
      }
      const updated = chains.filter(c => c.id !== id);
      setChains(updated);
      try { localStorage.setItem('shoof_business_chains_admin', JSON.stringify(updated)); } catch {}
      showToast('تم حذف السلسلة بنجاح', 'success');
    } catch (err) {
      console.error('Error deleting chain:', err);
      showToast('فشل حذف السلسلة', 'error');
    }
  };

  const filteredChains = chains.filter(c => 
    c.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.branches.some(b => b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) || b.district.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalBranchesCount = chains.reduce((acc, c) => acc + (c.branches?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة سلاسل وفروع المحلات المركزية</h2>
            <p className="text-stone-500 text-xs">تجميع وربط المحلات متعددة الفروع في إربد تحت علامة تجارية وإدارة واحدة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadChains}
            className="h-10 px-3.5 rounded-xl border border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء سلسلة فروع جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] text-stone-500 font-bold">إجمالي السلاسل والعلامات</p>
            <p className="text-xl font-black text-stone-900">{chains.length} سلسلة تجارية</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] text-stone-500 font-bold">إجمالي الفروع المربوطة</p>
            <p className="text-xl font-black text-emerald-700">{totalBranchesCount} فرع في إربد</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم السلسلة، الفرع أو المنطقة..."
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-indigo-600 bg-stone-50/50"
          />
        </div>
      </div>

      {/* Chains Cards List */}
      <div className="space-y-4">
        {filteredChains.map(chain => (
          <div key={chain.id} className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs hover:border-indigo-200 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3.5">
                {chain.logoUrl ? (
                  <img
                    src={chain.logoUrl}
                    alt={chain.brandName}
                    className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-base shrink-0">
                    {chain.brandName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-stone-900">{chain.brandName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                      {chain.category}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 flex items-center gap-2 mt-1">
                    <span>{chain.branches.length} فروع مفعلة</span>
                    {chain.primaryPhone && (
                      <span className="font-mono text-stone-700">· {chain.primaryPhone}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {chain.primaryPhone && (
                  <a
                    href={getWhatsAppUrl(chain.primaryPhone, `مرحباً إدارة ${chain.brandName}، من إدارة منصة شو في بإربد`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span>مراسلة الإدارة</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(chain)}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>تعديل السلسلة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChain(chain.id, chain.brandName)}
                  className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="حذف السلسلة"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Branches Grid */}
            <div className="pt-4">
              <p className="text-[11px] font-black text-stone-400 mb-2.5">قائمة الفروع التابعة:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {chain.branches.map((b, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        b.isMainBranch ? 'bg-indigo-700 text-white' : 'bg-stone-200 text-stone-700'
                      }`}>
                        <Store className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-stone-900 truncate">{b.branchName}</p>
                          {b.isMainBranch && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                              الرئيسي
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                          <span className="truncate">{b.district}</span>
                          {b.phone && <span className="font-mono text-stone-600">· {b.phone}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredChains.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/90 text-stone-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-stone-300" />
            <p className="text-sm font-bold">
              {chains.length === 0 ? 'لا توجد سلاسل فروع مضافة حالياً' : 'لا توجد سلاسل فروع مطابقة للبحث'}
            </p>
            {chains.length === 0 && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-3 px-4 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة أول سلسلة فروع</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="font-black text-stone-900 text-base">
                  {editingChain ? 'تعديل السلسلة والفروع' : 'إضافة سلسلة فروع جديدة'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم العلامة التجارية / السلسلة</label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="مثال: اسم السلسلة أو المنشأة"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="مطاعم ومقاهي، سوبرماركت، صيدليات..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">هاتف الإدارة المركزي</label>
                  <input
                    type="tel"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    placeholder="079xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رابط الشعار (Logo URL)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-left focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Branches Rows */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-800">قائمة الفروع في إربد ({branches.length}):</label>
                  <button
                    type="button"
                    onClick={handleAddBranchRow}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>إضافة فرع آخر</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {branches.map((branch, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="اسم الفرع (مثال: فرع شارع الجامعة)"
                          value={branch.branchName}
                          onChange={(e) => handleUpdateBranch(idx, 'branchName', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                        />
                        <input
                          type="text"
                          placeholder="المنطقة أو الحي"
                          value={branch.district}
                          onChange={(e) => handleUpdateBranch(idx, 'district', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                        />
                        <input
                          type="tel"
                          placeholder="هاتف الفرع (اختياري)"
                          value={branch.phone || ''}
                          onChange={(e) => handleUpdateBranch(idx, 'phone', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 font-bold">
                          <input
                            type="radio"
                            name="mainBranchSelection"
                            checked={!!branch.isMainBranch}
                            onChange={() => handleUpdateBranch(idx, 'isMainBranch', true)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>تعيين كفرع رئيسي</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveBranchRow(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>إزالة</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : editingChain ? 'حفظ التعديلات' : 'إنشاء السلسلة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
