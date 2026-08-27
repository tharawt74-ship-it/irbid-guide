import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  TrendingUp, DollarSign, Users, Sparkles, Trash2, Plus, 
  Percent, ArrowRight, HelpCircle, AlertCircle, BarChart3
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface Campaign {
  id: string;
  name: string;
  type: string;
  cost: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'pending_payment';
  viewsGenerated: number;
  clicksGenerated: number;
  whatsappClicks: number;
}

interface RoiCampaignTrackerProps {
  businessId: string;
  isVip: boolean;
}

export function RoiCampaignTracker({ businessId, isVip }: RoiCampaignTrackerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic user inputs for ROI modeling
  const [averageTicket, setAverageTicket] = useState<number>(8); // Default average spend JOD
  const [conversionRate, setConversionRate] = useState<number>(12); // Default conversion rate %

  // Add campaign state
  const [isAdding, setIsAdding] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'sponsored',
    cost: 15,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'active',
    viewsGenerated: 850,
    clicksGenerated: 120,
    whatsappClicks: 45
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'businesses', businessId, 'campaigns'));
      const snap = await getDocs(q);
      const fetched: Campaign[] = [];
      snap.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as Campaign);
      });
      
      // If empty, seed some realistic demo campaigns for VIP merchants to make the tool instantly useful
      if (fetched.length === 0) {
        const demoCampaigns: Omit<Campaign, 'id'>[] = [
          {
            name: 'حملة صدارة البحث - أسبوع الافتتاح',
            type: 'sponsored',
            cost: 15,
            startDate: '2026-08-10',
            endDate: '2026-08-17',
            status: 'completed',
            viewsGenerated: 1840,
            clicksGenerated: 245,
            whatsappClicks: 82
          },
          {
            name: 'إرسال إشعارات جماعية - عرض نهاية الأسبوع',
            type: 'push_notifications',
            cost: 10,
            startDate: '2026-08-20',
            endDate: '2026-08-21',
            status: 'completed',
            viewsGenerated: 3200,
            clicksGenerated: 410,
            whatsappClicks: 145
          }
        ];

        for (const demo of demoCampaigns) {
          const docRef = await addDoc(collection(db, 'businesses', businessId, 'campaigns'), demo);
          fetched.push({ id: docRef.id, ...demo });
        }
      }
      
      setCampaigns(fetched);
    } catch (err) {
      console.warn("Could not fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchCampaigns();
    }
  }, [businessId]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'businesses', businessId, 'campaigns'), {
        ...newCampaign,
        cost: Number(newCampaign.cost),
        viewsGenerated: Number(newCampaign.viewsGenerated),
        clicksGenerated: Number(newCampaign.clicksGenerated),
        whatsappClicks: Number(newCampaign.whatsappClicks)
      });
      setCampaigns(prev => [...prev, { id: docRef.id, ...newCampaign } as Campaign]);
      setIsAdding(false);
      setNewCampaign({
        name: '',
        type: 'sponsored',
        cost: 15,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'active',
        viewsGenerated: 850,
        clicksGenerated: 120,
        whatsappClicks: 45
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل هذه الحملة؟')) return;
    try {
      await deleteDoc(doc(db, 'businesses', businessId, 'campaigns', id));
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Helper calculations
  const calculateCampaignMetrics = (campaign: Campaign) => {
    const totalClicks = campaign.clicksGenerated + campaign.whatsappClicks;
    const estCustomers = Math.round(totalClicks * (conversionRate / 100));
    const estRevenue = estCustomers * averageTicket;
    const netProfit = estRevenue - campaign.cost;
    const roi = campaign.cost > 0 ? (netProfit / campaign.cost) * 100 : 0;
    
    return {
      totalClicks,
      estCustomers,
      estRevenue,
      netProfit,
      roi
    };
  };

  // Aggregated totals
  const totalCost = campaigns.reduce((acc, c) => acc + c.cost, 0);
  const totalEstRevenue = campaigns.reduce((acc, c) => acc + calculateCampaignMetrics(c).estRevenue, 0);
  const totalNetProfit = totalEstRevenue - totalCost;
  const overallRoi = totalCost > 0 ? (totalNetProfit / totalCost) * 100 : 0;
  const totalNewCustomers = campaigns.reduce((acc, c) => acc + calculateCampaignMetrics(c).estCustomers, 0);

  // Recharts Chart Data
  const chartData = campaigns.map(c => {
    const metrics = calculateCampaignMetrics(c);
    return {
      name: c.name.length > 20 ? c.name.substring(0, 18) + '...' : c.name,
      'تكلفة الحملة (دينار)': c.cost,
      'العائد المالي المتوقع (دينار)': metrics.estRevenue,
      'صافي الأرباح (دينار)': metrics.netProfit
    };
  });

  return (
    <div id="roi-campaign-tracker" className="bg-[#fcfbf9] border border-[#e5e1da] rounded-2xl p-6 text-right space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-lg font-black text-[#2d2a26] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            أداة تتبع العائد الاستثماري الفعلي للإعلانات (ROI Campaign Tracker)
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            حلّل تكلفة الإعلانات والترويج مقارنة بحجم النقرات والزبائن الفعليين، وقم بنمذجة العائد المالي بدقة لمشروعك.
          </p>
        </div>
        
        {isVip && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-3xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل حملة إعلانية جديدة</span>
          </button>
        )}
      </div>

      {/* Model Parameters - Controls ROI Calculations in real-time */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-3xs">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-700 font-mono font-black">{averageTicket} دينار أردني</span>
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-stone-400" />
              متوسط قيمة الفاتورة المتوقعة للزبون الواحد (Average Ticket Size):
            </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={averageTicket}
            onChange={(e) => setAverageTicket(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-stone-100 rounded-lg appearance-none"
          />
          <p className="text-[10px] text-stone-400">كم ينفق الزبون الواحد بالمتوسط عند زيارة مطعمك أو محلك التجاري؟</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-indigo-700 font-mono font-black">{conversionRate}%</span>
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <Percent className="h-3.5 w-3.5 text-stone-400" />
              نسبة تحويل النقرات والاتصالات لزبائن حقيقيين (Conversion Rate):
            </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={conversionRate}
            onChange={(e) => setConversionRate(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-stone-100 rounded-lg appearance-none"
          />
          <p className="text-[10px] text-stone-400">ما هي النسبة المتوقعة من زوار صفحتك على المنصة الذين سيشترون من محلك فعلاً؟</p>
        </div>
      </div>

      {/* ROI Analytics Grid Card Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-xl">
          <span className="text-[10px] text-stone-400 font-bold block mb-1">صافي الأرباح المحققة (Est. Profit)</span>
          <span className={`text-xl font-black block ${totalNetProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {totalNetProfit.toLocaleString('ar-JO')} د.أ
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">العائد بعد طرح تكاليف الإعلانات</span>
        </div>

        <div className="bg-indigo-50/40 border border-indigo-100 p-4.5 rounded-xl">
          <span className="text-[10px] text-stone-400 font-bold block mb-1">معدل العائد الاستثماري (Overall ROI)</span>
          <span className="text-xl font-black text-indigo-700 block">
            {overallRoi.toFixed(0)}%
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">كل دينار تنفقه يدرّ عائداً بهذه النسبة</span>
        </div>

        <div className="bg-amber-50/40 border border-amber-100 p-4.5 rounded-xl">
          <span className="text-[10px] text-stone-400 font-bold block mb-1">الزبائن الجدد المتوقعون (Customers)</span>
          <span className="text-xl font-black text-amber-700 block">
            {totalNewCustomers} زبون
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">بناءً على نسبة تحويل {conversionRate}%</span>
        </div>

        <div className="bg-stone-100/60 border border-stone-200/50 p-4.5 rounded-xl">
          <span className="text-[10px] text-stone-400 font-bold block mb-1">إجمالي تكاليف الحملات (Spend)</span>
          <span className="text-xl font-black text-stone-800 block">
            {totalCost} د.أ
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">مجموع المبالغ المصروفة على الدعاية</span>
        </div>
      </div>

      {/* ROI Visualizations Chart */}
      {campaigns.length > 0 && (
        <div className="bg-white p-4.5 rounded-xl border border-stone-200">
          <h4 className="text-xs font-black text-stone-800 mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            مقارنة تكلفة الحملات الدعائية مقابل العوائد المادية وصافي الأرباح المتوقعة:
          </h4>
          <div className="h-64 text-xs font-bold font-sans" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip formatter={(value) => [`${value} د.أ`]} />
                <Legend />
                <Bar dataKey="تكلفة الحملة (دينار)" fill="#a8a29e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="العائد المالي المتوقع (دينار)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="صافي الأرباح (دينار)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Campaigns list and ROI calculator details table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <th className="p-3 font-bold">اسم الحملة الإعلانية</th>
              <th className="p-3 font-bold">التكلفة</th>
              <th className="p-3 font-bold">المشاهدات والنقرات</th>
              <th className="p-3 font-bold">الزبائن المتوقعون</th>
              <th className="p-3 font-bold">العائد المتوقع</th>
              <th className="p-3 font-bold">نسبة العائد (ROI)</th>
              <th className="p-3 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  <div className="inline-block w-6 h-6 rounded-full border-2 border-stone-200 border-t-emerald-600 animate-spin"></div>
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-stone-400 font-bold">
                  لا توجد حملات مسجلة حالياً لمحلك.
                </td>
              </tr>
            ) : (
              campaigns.map(c => {
                const metrics = calculateCampaignMetrics(c);
                return (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50/40 transition-colors">
                    <td className="p-3 font-bold text-stone-900">{c.name}</td>
                    <td className="p-3 font-mono font-bold text-stone-700">{c.cost} د.أ</td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="block text-[11px] font-medium text-stone-500">👁️ {c.viewsGenerated} مشاهدة</span>
                        <span className="block text-[11px] font-medium text-emerald-700">🎯 {metrics.totalClicks} نقرة واتصال</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-indigo-700">{metrics.estCustomers} زبون جديد</td>
                    <td className="p-3 font-bold text-emerald-700">{metrics.estRevenue} د.أ</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] ${
                        metrics.roi >= 150 ? 'bg-emerald-100 text-emerald-800' :
                        metrics.roi >= 50 ? 'bg-indigo-100 text-indigo-800' :
                        metrics.roi >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {metrics.roi.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        type="button"
                        onClick={() => handleDeleteCampaign(c.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف سجل الحملة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Non-VIP Banner */}
      {!isVip && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/15 border border-amber-300 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
            <AlertCircle className="h-4 w-4 text-amber-600 fill-amber-100" />
            <span>خاصية تتبع العوائد ومحاكاة الاستثمار حصرية لشركائنا بـ VIP الذهبي!</span>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            محلك الحالي مشترك في <span className="font-bold text-stone-900">الباقة الأساسية</span>. يظهر لك حالياً البيانات الافتراضية التوضيحية لتجربة الأداة. عند الترقية للباقة الذهبية، سيتم ربط هذه الأداة تلقائياً بالبيانات الحية لصفحة محلك (مثل نقرات الاتصال والواتساب، وزيارات صفحة المحل، والنقرات على الإعلانات) لتتبع عائد استثماري حقيقي 100%.
          </p>
        </div>
      )}

      {/* Modal: Add custom campaign */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] border border-stone-200 shadow-xl max-w-md w-full p-6 text-right space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h4 className="text-base font-black text-[#2d2a26]">إضافة سجل حملة إعلانية مخصصة</h4>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">اسم الحملة أو الإعلان</label>
                <input 
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="مثال: إعلان ممول فيسبوك - سبتمبر"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نوع الخدمة الدعائية</label>
                  <select
                    value={newCampaign.type}
                    onChange={e => setNewCampaign({...newCampaign, type: e.target.value})}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="sponsored">صدارة البحث (Sponsored)</option>
                    <option value="push_notifications">إشعارات جماعية</option>
                    <option value="homepage_banner">بانر إعلاني مميز</option>
                    <option value="facebook_instagram">إعلان خارجي (سوشيال ميديا)</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">التكلفة (دينار أردني)</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={newCampaign.cost}
                    onChange={e => setNewCampaign({...newCampaign, cost: Number(e.target.value)})}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">عدد المشاهدات</label>
                  <input 
                    type="number"
                    min="0"
                    value={newCampaign.viewsGenerated}
                    onChange={e => setNewCampaign({...newCampaign, viewsGenerated: Number(e.target.value)})}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">عدد النقرات</label>
                  <input 
                    type="number"
                    min="0"
                    value={newCampaign.clicksGenerated}
                    onChange={e => setNewCampaign({...newCampaign, clicksGenerated: Number(e.target.value)})}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نقرات واتساب</label>
                  <input 
                    type="number"
                    min="0"
                    value={newCampaign.whatsappClicks}
                    onChange={e => setNewCampaign({...newCampaign, whatsappClicks: Number(e.target.value)})}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ وتسجيل الحملة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
