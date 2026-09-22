import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  Plus, 
  Edit3, 
  Trash2, 
  MapPin, 
  Clock, 
  ArrowLeftRight, 
  Car, 
  Building2, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  X,
  Phone,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { 
  fetchTransportation, 
  saveTransportationItem, 
  deleteTransportationItem, 
  seedTransportationDefaults 
} from '../../lib/transportationService';
import { TerminalItem, RouteItem, TaxiItem, TerminalDestination } from '../../types';
import { useConfirm } from '../../contexts/ConfirmContext';

interface AdminTransportationManagementProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function AdminTransportationManagement({ showToast }: AdminTransportationManagementProps) {
  const { confirm } = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState<'terminals' | 'routes' | 'taxis'>('terminals');
  const [loading, setLoading] = useState(true);

  // Data lists
  const [terminals, setTerminals] = useState<TerminalItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [taxis, setTaxis] = useState<TaxiItem[]>([]);

  // Modals & Form states
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<TerminalItem | null>(null);
  const [terminalForm, setTerminalForm] = useState({
    name: '',
    location: '',
    description: '',
    destinationTypesString: '',
    destinations: [] as TerminalDestination[]
  });

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [routeForm, setRouteForm] = useState({
    name: '',
    code: '',
    stopsString: '',
    fare: '0.35 د.أ',
    time: 'من 06:30 ص حتى 10:00 م'
  });

  const [isTaxiModalOpen, setIsTaxiModalOpen] = useState(false);
  const [editingTaxi, setEditingTaxi] = useState<TaxiItem | null>(null);
  const [taxiForm, setTaxiForm] = useState({
    name: '',
    categoryType: 'تطبيق هاتف ذكي',
    phone: '',
    description: '',
    badge: 'خدمة معتمدة'
  });

  // Temporary destination row in terminal form
  const [newDestRow, setNewDestRow] = useState<TerminalDestination>({
    name: '',
    vehicleType: 'باصات كوستر',
    approxFare: '1.00 د.أ',
    duration: '30 دقيقة',
    frequency: 'كل 15 دقيقة'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTransportation();
      setTerminals(data.terminals);
      setRoutes(data.routes);
      setTaxis(data.taxis);
    } catch (err) {
      console.error(err);
      showToast('تعذر تحميل بيانات المواصلات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- TERMINAL CRUD ---
  const handleOpenAddTerminal = () => {
    setEditingTerminal(null);
    setTerminalForm({
      name: '',
      location: '',
      description: '',
      destinationTypesString: '',
      destinations: []
    });
    setIsTerminalModalOpen(true);
  };

  const handleOpenEditTerminal = (term: TerminalItem) => {
    setEditingTerminal(term);
    setTerminalForm({
      name: term.name || '',
      location: term.location || '',
      description: term.description || '',
      destinationTypesString: (term.destinationTypes || []).join('، '),
      destinations: term.destinations ? [...term.destinations] : []
    });
    setIsTerminalModalOpen(true);
  };

  const handleAddDestToTerminal = () => {
    if (!newDestRow.name.trim()) return;
    setTerminalForm(prev => ({
      ...prev,
      destinations: [...prev.destinations, { ...newDestRow }]
    }));
    setNewDestRow({
      name: '',
      vehicleType: 'باصات كوستر',
      approxFare: '1.00 د.أ',
      duration: '30 دقيقة',
      frequency: 'كل 15 دقيقة'
    });
  };

  const handleRemoveDestFromTerminal = (idx: number) => {
    setTerminalForm(prev => ({
      ...prev,
      destinations: prev.destinations.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalForm.name.trim() || !terminalForm.location.trim()) {
      showToast('يرجى إدخال اسم المجمع وموقعه', 'error');
      return;
    }

    const destinationTypes = terminalForm.destinationTypesString
      .split('،')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const payload: any = {
        type: 'terminal',
        name: terminalForm.name.trim(),
        location: terminalForm.location.trim(),
        description: terminalForm.description.trim(),
        destinationTypes: destinationTypes.length > 0 ? destinationTypes : ['عمان', 'الزرقاء', 'جامعة العلوم والتكنولوجيا'],
        destinations: terminalForm.destinations,
        order: editingTerminal?.order || terminals.length + 1
      };

      await saveTransportationItem(payload, editingTerminal?.id);
      showToast(editingTerminal ? 'تم تعديل بيانات المجمع بنجاح' : 'تم إضافة المجمع الجديد بنجاح');
      setIsTerminalModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ المجمع', 'error');
    }
  };

  const handleDeleteTerminal = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'حذف مجمع الحافلات نهائياً',
      message: `هل أنت متأكد من رغبتك في حذف "${name}" نهائياً من قاعدة البيانات؟ لن يظهر مرة أخرى على الموقع إلا إذا قمت بإضافته مجدداً.`
    });
    if (!isConfirmed) return;

    try {
      await deleteTransportationItem(id);
      showToast('تم حذف المجمع بنجاح');
      setTerminals(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      showToast('تعذر حذف المجمع', 'error');
    }
  };

  // --- ROUTE CRUD ---
  const handleOpenAddRoute = () => {
    setEditingRoute(null);
    setRouteForm({
      name: '',
      code: 'خط جديد - سرفيس',
      stopsString: '',
      fare: '0.35 د.أ',
      time: 'من 06:30 ص حتى 10:00 م'
    });
    setIsRouteModalOpen(true);
  };

  const handleOpenEditRoute = (rt: RouteItem) => {
    setEditingRoute(rt);
    setRouteForm({
      name: rt.name || '',
      code: rt.code || '',
      stopsString: (rt.stops || []).join('، '),
      fare: rt.fare || '0.35 د.أ',
      time: rt.time || 'من 06:30 ص حتى 10:00 م'
    });
    setIsRouteModalOpen(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.name.trim() || !routeForm.code.trim()) {
      showToast('يرجى إدخال اسم الخط والرمز التعريفي', 'error');
      return;
    }

    const stops = routeForm.stopsString
      .split('،')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const payload: any = {
        type: 'route',
        name: routeForm.name.trim(),
        code: routeForm.code.trim(),
        stops: stops.length > 0 ? stops : ['مجمع عمان', 'شارع الجامعة', 'وسط البلد'],
        fare: routeForm.fare.trim(),
        time: routeForm.time.trim(),
        order: editingRoute?.order || routes.length + 1
      };

      await saveTransportationItem(payload, editingRoute?.id);
      showToast(editingRoute ? 'تم تحديث مسار الخط بنجاح' : 'تم إضافة الخط الجديد بنجاح');
      setIsRouteModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ الخط', 'error');
    }
  };

  const handleDeleteRoute = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'حذف خط السرفيس نهائياً',
      message: `هل أنت متأكد من حذف "${name}" نهائياً من قاعدة البيانات؟ لن يعود للظهور مجدداً.`
    });
    if (!isConfirmed) return;

    try {
      await deleteTransportationItem(id);
      showToast('تم حذف الخط بنجاح');
      setRoutes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      showToast('تعذر حذف الخط', 'error');
    }
  };

  // --- TAXI CRUD ---
  const handleOpenAddTaxi = () => {
    setEditingTaxi(null);
    setTaxiForm({
      name: '',
      categoryType: 'تطبيق هاتف ذكي',
      phone: '',
      description: '',
      badge: 'طلب عبر التطبيق'
    });
    setIsTaxiModalOpen(true);
  };

  const handleOpenEditTaxi = (taxi: TaxiItem) => {
    setEditingTaxi(taxi);
    setTaxiForm({
      name: taxi.name || '',
      categoryType: taxi.categoryType || 'تطبيق هاتف ذكي',
      phone: taxi.phone || '',
      description: taxi.description || '',
      badge: taxi.badge || ''
    });
    setIsTaxiModalOpen(true);
  };

  const handleSaveTaxi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxiForm.name.trim()) {
      showToast('يرجى إدخال اسم الخدمة أو التطبيق', 'error');
      return;
    }

    try {
      const payload: any = {
        type: 'taxi',
        name: taxiForm.name.trim(),
        categoryType: taxiForm.categoryType.trim(),
        phone: taxiForm.phone.trim(),
        description: taxiForm.description.trim(),
        badge: taxiForm.badge.trim() || 'خدمة معتمدة',
        order: editingTaxi?.order || taxis.length + 1
      };

      await saveTransportationItem(payload, editingTaxi?.id);
      showToast(editingTaxi ? 'تم تحديث وسيلة النقل بنجاح' : 'تم إضافة وسيلة النقل الجديدة بنجاح');
      setIsTaxiModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ وسيلة النقل', 'error');
    }
  };

  const handleDeleteTaxi = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'حذف خدمة التاكسي نهائياً',
      message: `هل أنت متأكد من حذف "${name}" نهائياً من قاعدة البيانات؟`
    });
    if (!isConfirmed) return;

    try {
      await deleteTransportationItem(id);
      showToast('تم حذف الخدمة بنجاح');
      setTaxis(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      showToast('تعذر حذف الخدمة', 'error');
    }
  };

  // --- RESET DEFAULTS ---
  const handleResetDefaults = async () => {
    const isConfirmed = await confirm({
      title: 'استعادة البيانات النموذجية للمواصلات',
      message: 'هل تريد حقاً استعادة مجمعات وخطوط المواصلات الافتراضية وحفظها في قاعدة البيانات؟ سيتم إضافة المجمعات والخطوط الرسمية الرئيسية لإربد.'
    });
    if (!isConfirmed) return;

    try {
      await seedTransportationDefaults();
      showToast('تم استعادة وحفظ بيانات المواصلات النموذجية بنجاح');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('تعذر استعادة البيانات', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Control */}
      <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-100 text-[#1a4d2e] rounded-lg">
              <Bus className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-black text-stone-900">إدارة دليل المواصلات والنقل</h3>
          </div>
          <p className="text-xs text-stone-500 font-medium">
            التحكم الكامل (إضافة، تعديل، حذف نهائي) بمجمعات السفريات، خطوط السرفيس، وتطبيقات التكاسي في إربد المخزنة في قاعدة البيانات.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="استيراد البيانات الافتراضية للمجمعات والخطوط"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
            <span>استعادة البيانات الافتراضية</span>
          </button>

          {activeSubTab === 'terminals' && (
            <button
              onClick={handleOpenAddTerminal}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة مجمع جديد</span>
            </button>
          )}

          {activeSubTab === 'routes' && (
            <button
              onClick={handleOpenAddRoute}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة خط سير جديد</span>
            </button>
          )}

          {activeSubTab === 'taxis' && (
            <button
              onClick={handleOpenAddTaxi}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة خدمة تكسي</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveSubTab('terminals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeSubTab === 'terminals'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Building2 className="h-4 w-4 text-[#ff9f1c]" />
          <span>مجمعات الحافلات الرئيسية ({terminals.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('routes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeSubTab === 'routes'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4 text-[#ff9f1c]" />
          <span>خطوط السرفيس والباص الداخلي ({routes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('taxis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeSubTab === 'taxis'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Car className="h-4 w-4 text-[#ff9f1c]" />
          <span>التاكسي والتطبيقات ({taxis.length})</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#e5e1da] text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#1a4d2e] animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-bold">جاري تحميل بيانات المواصلات من قاعدة البيانات...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TERMINALS */}
          {activeSubTab === 'terminals' && (
            <div className="space-y-4">
              {terminals.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-[#e5e1da] border-dashed text-center space-y-3">
                  <Building2 className="h-10 w-10 text-stone-300 mx-auto" />
                  <h4 className="font-black text-stone-700 text-sm">لا توجد مجمعات حافلات حالياً</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    تم مسح جميع المجمعات من قاعدة البيانات أو لم يتم إضافتها بعد. يمكنك إضافة مجمع جديد أو استعادة البيانات الافتراضية.
                  </p>
                  <button
                    onClick={handleOpenAddTerminal}
                    className="inline-flex items-center gap-1.5 bg-[#1a4d2e] text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة أول مجمع الآن</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {terminals.map((terminal) => (
                    <div
                      key={terminal.id}
                      className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="p-2 bg-emerald-50 text-[#1a4d2e] rounded-xl font-bold">
                            <Bus className="h-5 w-5" />
                          </span>
                          <div>
                            <h4 className="font-black text-base text-stone-900">{terminal.name}</h4>
                            <p className="text-xs text-stone-500 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                              <span>{terminal.location}</span>
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed font-medium">
                          {terminal.description}
                        </p>

                        {/* Destinations count */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-[11px] font-bold text-stone-400">الوجهات المتاحة ({terminal.destinations?.length || 0}):</span>
                          {(terminal.destinations || []).slice(0, 5).map((d, i) => (
                            <span key={i} className="text-[11px] font-bold bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-lg">
                              {d.name} ({d.approxFare})
                            </span>
                          ))}
                          {(terminal.destinations?.length || 0) > 5 && (
                            <span className="text-[11px] font-bold text-stone-400">
                              +{(terminal.destinations?.length || 0) - 5} أخرى
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                        <button
                          onClick={() => handleOpenEditTerminal(terminal)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTerminal(terminal.id, terminal.name)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROUTES */}
          {activeSubTab === 'routes' && (
            <div className="space-y-4">
              {routes.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-[#e5e1da] border-dashed text-center space-y-3">
                  <ArrowLeftRight className="h-10 w-10 text-stone-300 mx-auto" />
                  <h4 className="font-black text-stone-700 text-sm">لا توجد خطوط سرفيس أو باصات داخلية</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    تم مسح جميع خطوط النقل الداخلي من قاعدة البيانات. يمكنك إضافة خط جديد أو استعادة البيانات النموذجية.
                  </p>
                  <button
                    onClick={handleOpenAddRoute}
                    className="inline-flex items-center gap-1.5 bg-[#1a4d2e] text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة أول خط الآن</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col justify-between gap-3 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black bg-[#1a4d2e]/10 text-[#1a4d2e] px-2.5 py-0.5 rounded-full">
                            {route.code}
                          </span>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-xl">
                            {route.fare}
                          </span>
                        </div>

                        <h4 className="font-black text-sm text-stone-900">{route.name}</h4>

                        {/* Stops flow */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-stone-400">محطات التوقف:</span>
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            {(route.stops || []).map((stop, sIdx) => (
                              <React.Fragment key={sIdx}>
                                <span className="bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                  {stop}
                                </span>
                                {sIdx < (route.stops?.length || 0) - 1 && (
                                  <span className="text-stone-300 font-bold">←</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-stone-500 flex items-center gap-1 pt-1">
                          <Clock className="h-3 w-3 text-[#ff9f1c]" />
                          <span>ساعات العمل: {route.time}</span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                        <button
                          onClick={() => handleOpenEditRoute(route)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id, route.name)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TAXIS */}
          {activeSubTab === 'taxis' && (
            <div className="space-y-4">
              {taxis.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-[#e5e1da] border-dashed text-center space-y-3">
                  <Car className="h-10 w-10 text-stone-300 mx-auto" />
                  <h4 className="font-black text-stone-700 text-sm">لا توجد خدمات تاكسي مسجلة</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    تم مسح جميع مكاتب وتطبيقات التاكسي من قاعدة البيانات. يمكنك إضافة خدمة جديدة أو استعادة البيانات النموذجية.
                  </p>
                  <button
                    onClick={handleOpenAddTaxi}
                    className="inline-flex items-center gap-1.5 bg-[#1a4d2e] text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة أول خدمة الآن</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {taxis.map((taxi) => (
                    <div
                      key={taxi.id}
                      className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col justify-between gap-3 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg">
                            {taxi.categoryType}
                          </span>
                          {taxi.badge && (
                            <span className="text-[11px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">
                              {taxi.badge}
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-stone-900">{taxi.name}</h4>

                        <p className="text-xs text-stone-600 leading-relaxed font-medium">
                          {taxi.description}
                        </p>

                        {taxi.phone && (
                          <div className="pt-2 border-t border-stone-100 text-xs font-bold text-[#1a4d2e] flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-[#ff9f1c]" />
                            <span dir="ltr">{taxi.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                        <button
                          onClick={() => handleOpenEditTaxi(taxi)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTaxi(taxi.id, taxi.name)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* --- MODAL: TERMINAL (ADD / EDIT) --- */}
      {isTerminalModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100000] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden p-5 sm:p-6 space-y-4 border border-[#e5e1da] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#1a4d2e]" />
                <h3 className="font-black text-base text-stone-900">
                  {editingTerminal ? 'تعديل مجمع الحافلات' : 'إضافة مجمع حافلات جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsTerminalModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerminal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">اسم المجمع</label>
                <input
                  type="text"
                  required
                  value={terminalForm.name}
                  onChange={e => setTerminalForm({ ...terminalForm, name: e.target.value })}
                  placeholder="مثال: مجمع عمان الجديد (مجمع إربد الرئيسي)..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">الموقع الجغرافي بالتفصيل</label>
                <input
                  type="text"
                  required
                  value={terminalForm.location}
                  onChange={e => setTerminalForm({ ...terminalForm, location: e.target.value })}
                  placeholder="مثال: جنوب مدينة إربد - بالقرب من دوار الثقافة..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">الوصف التعريفي للخدمات</label>
                <textarea
                  rows={2}
                  value={terminalForm.description}
                  onChange={e => setTerminalForm({ ...terminalForm, description: e.target.value })}
                  placeholder="نبذة عن المجمع والخطوط الرئيسية المنطلقة منه..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">الوجهات الرئيسية (افصل بينها بـ علامة "،")</label>
                <input
                  type="text"
                  value={terminalForm.destinationTypesString}
                  onChange={e => setTerminalForm({ ...terminalForm, destinationTypesString: e.target.value })}
                  placeholder="عمان، الزرقاء، المفرق، جرش، السلط، جامعة التكنولوجيا..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              {/* Destinations Builder */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800">
                    قائمة الخطوط والوجهات التابعة للمجمع ({terminalForm.destinations.length}):
                  </span>
                </div>

                {/* Existing list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {terminalForm.destinations.map((dest, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
                      <div>
                        <span className="font-black text-stone-900">{dest.name}</span>
                        <span className="text-emerald-700 font-bold mx-2">({dest.approxFare})</span>
                        <span className="text-stone-400 text-[11px]">{dest.vehicleType} • {dest.duration} • {dest.frequency}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDestFromTerminal(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new destination row */}
                <div className="bg-stone-50/80 p-3 rounded-2xl border border-stone-200 space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 block">إضافة وجهة أو خط جديد للمجمع:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="اسم الوجهة (مثال: عمان)"
                      value={newDestRow.name}
                      onChange={e => setNewDestRow({ ...newDestRow, name: e.target.value })}
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="وسيلة النقل (باص كوستر / سرفيس)"
                      value={newDestRow.vehicleType}
                      onChange={e => setNewDestRow({ ...newDestRow, vehicleType: e.target.value })}
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="الأجرة (مثال: 1.50 د.أ)"
                      value={newDestRow.approxFare}
                      onChange={e => setNewDestRow({ ...newDestRow, approxFare: e.target.value })}
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="المدة (مثال: 50 دقيقة)"
                      value={newDestRow.duration}
                      onChange={e => setNewDestRow({ ...newDestRow, duration: e.target.value })}
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="التردد (مثال: كل 10 دقائق)"
                      value={newDestRow.frequency}
                      onChange={e => setNewDestRow({ ...newDestRow, frequency: e.target.value })}
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddDestToTerminal}
                      className="bg-[#1a4d2e] hover:bg-[#143e25] text-white rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إدراج الوجهة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsTerminalModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[#1a4d2e] hover:bg-[#143e25] text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs"
                >
                  {editingTerminal ? 'حفظ التعديلات في قاعدة البيانات' : 'إضافة المجمع لقاعدة البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ROUTE (ADD / EDIT) --- */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100000] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden p-5 sm:p-6 space-y-4 border border-[#e5e1da] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-[#1a4d2e]" />
                <h3 className="font-black text-base text-stone-900">
                  {editingRoute ? 'تعديل خط السرفيس / الباص' : 'إضافة خط سير جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsRouteModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">اسم الخط والوجهة</label>
                <input
                  type="text"
                  required
                  value={routeForm.name}
                  onChange={e => setRouteForm({ ...routeForm, name: e.target.value })}
                  placeholder="مثال: خط جامعة اليرموك - وسط البلد - دوار القبة..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">كود / لون الخط</label>
                  <input
                    type="text"
                    required
                    value={routeForm.code}
                    onChange={e => setRouteForm({ ...routeForm, code: e.target.value })}
                    placeholder="مثال: خط 1 - سرفيس أبيض..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">الأجرة المقررة</label>
                  <input
                    type="text"
                    required
                    value={routeForm.fare}
                    onChange={e => setRouteForm({ ...routeForm, fare: e.target.value })}
                    placeholder="مثال: 0.35 د.أ..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">المحطات ومسار الخط (افصل بينها بـ علامة "،")</label>
                <input
                  type="text"
                  value={routeForm.stopsString}
                  onChange={e => setRouteForm({ ...routeForm, stopsString: e.target.value })}
                  placeholder="مجمع عمان، شارع الجامعة، البوابة الجنوبية، دوار القبة، وسط البلد..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">ساعات ومواعيد العمل</label>
                <input
                  type="text"
                  value={routeForm.time}
                  onChange={e => setRouteForm({ ...routeForm, time: e.target.value })}
                  placeholder="مثال: من 06:30 ص حتى 10:00 م..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[#1a4d2e] hover:bg-[#143e25] text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs"
                >
                  {editingRoute ? 'تحديث الخط' : 'حفظ الخط الجديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: TAXI (ADD / EDIT) --- */}
      {isTaxiModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100000] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden p-5 sm:p-6 space-y-4 border border-[#e5e1da] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-[#1a4d2e]" />
                <h3 className="font-black text-base text-stone-900">
                  {editingTaxi ? 'تعديل خدمة التاكسي' : 'إضافة خدمة أو تطبيق تاكسي'}
                </h3>
              </div>
              <button
                onClick={() => setIsTaxiModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaxi} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">اسم الخدمة أو المكتب</label>
                <input
                  type="text"
                  required
                  value={taxiForm.name}
                  onChange={e => setTaxiForm({ ...taxiForm, name: e.target.value })}
                  placeholder="مثال: مكاتب تاكسي إربد المركزية، تطبيق Uber..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">نوع الخدمة</label>
                  <input
                    type="text"
                    value={taxiForm.categoryType}
                    onChange={e => setTaxiForm({ ...taxiForm, categoryType: e.target.value })}
                    placeholder="تطبيق هاتف ذكي / مكتب طلب هاتفي..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">شارة مميزة</label>
                  <input
                    type="text"
                    value={taxiForm.badge}
                    onChange={e => setTaxiForm({ ...taxiForm, badge: e.target.value })}
                    placeholder="مثال: الأكثر انتشاراً، حجز هاتفي..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={taxiForm.phone}
                  onChange={e => setTaxiForm({ ...taxiForm, phone: e.target.value })}
                  placeholder="مثال: 02-724-4444..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">الوصف التعريفي للخدمة</label>
                <textarea
                  rows={2}
                  value={taxiForm.description}
                  onChange={e => setTaxiForm({ ...taxiForm, description: e.target.value })}
                  placeholder="نبذة عن توفر الخدمة، التسعير، أو طريقة الطلب..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsTaxiModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[#1a4d2e] hover:bg-[#143e25] text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs"
                >
                  {editingTaxi ? 'تحديث الخدمة' : 'حفظ الخدمة الجديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
