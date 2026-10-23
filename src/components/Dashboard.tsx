import React from 'react';
import { AppCoreState, AppAuthSession } from '../lib/types';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Package as PackageIcon } from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/format';

interface Props {
  state: AppCoreState;
  hideNumbers: boolean;
  user: AppAuthSession;
}

export default function AppDashboard({ state, hideNumbers, user }: Props) {
  // Compute basic metrics and wallets
  let totalRevenue = 0;
  let totalCOGSAndExpenses = 0;
  let totalCalculatedCOGS = 0;
  let wasteOwnerA = 0;
  let wasteOwnerB = 0;
  let totalDebt = 0;

  let projectFund = 0;
  let ownerAWallet = 0;
  let ownerBWallet = 0;

  state.transactions.forEach(t => {
    // 1. Profit calculation
    if (t.type === 'sale') {
      totalRevenue += t.amountJOD;
      if (t.cogsJOD) totalCalculatedCOGS += t.cogsJOD;
    }
    if (t.type === 'purchase' || t.type === 'expense') totalCOGSAndExpenses += t.amountJOD;
    if (t.type === 'waste') {
      if (t.responsibleId === 'محمد') wasteOwnerA += t.amountJOD;
      if (t.responsibleId === 'عبيدة') wasteOwnerB += t.amountJOD;
    }
    
    // 2. Wallet calculation
    const wallet = t.fundSource || 'project';
    let cashImpact = 0;
    if (t.type === 'deposit') cashImpact = t.amountJOD;
    else if (t.type === 'sale' && !t.isCredit) cashImpact = t.amountJOD;
    else if ((t.type === 'purchase' || t.type === 'expense') && !t.isCredit) cashImpact = -t.amountJOD;
    else if (t.type === 'return' && !t.isCredit) cashImpact = -t.amountJOD;

    if (cashImpact !== 0) {
      if (wallet === 'project') projectFund += cashImpact;
      else if (wallet === 'mohammed') ownerAWallet += cashImpact;
      else if (wallet === 'obaida') ownerBWallet += cashImpact;
    }
  });

  state.profiles.forEach(p => {
    totalDebt += p.debt;
  });

  const generalNetProfit = totalRevenue - totalCOGSAndExpenses;
  
  // 58% / 42% split
  // Waste is deducted DIRECTLY from the personal share
  const profitA = (generalNetProfit * state.settings.ownerAShare) - wasteOwnerA;
  const profitB = (generalNetProfit * state.settings.ownerBShare) - wasteOwnerB;

  // Alerts
  const lowStockItems = state.inventory.filter(i => i.quantity <= i.safetyStock);
  const highDebtProfiles = state.profiles.filter(p => p.debt > 100);

  // Mock chart data for last 7 days
  const chartData = [
    { name: 'الإثنين', revenue: hideNumbers ? 0 : 120, expenses: hideNumbers ? 0 : 50 },
    { name: 'الثلاثاء', revenue: hideNumbers ? 0 : 200, expenses: hideNumbers ? 0 : 80 },
    { name: 'الأربعاء', revenue: hideNumbers ? 0 : 150, expenses: hideNumbers ? 0 : 40 },
    { name: 'الخميس', revenue: hideNumbers ? 0 : 300, expenses: hideNumbers ? 0 : 100 },
    { name: 'الجمعة', revenue: hideNumbers ? 0 : 250, expenses: hideNumbers ? 0 : 120 },
    { name: 'السبت', revenue: hideNumbers ? 0 : 400, expenses: hideNumbers ? 0 : 150 },
    { name: 'الأحد', revenue: hideNumbers ? 0 : 350, expenses: hideNumbers ? 0 : 90 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-2">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 text-sans ${user.role === 'ownerA' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-violet-600 shadow-violet-200'}`}>
            {user.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">أهلاً بك، {user.name}</h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Wallet Cards */}
        <div className="bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-1">صندوق المشروع</p>
            <h3 className="text-3xl font-black">{formatCurrency(projectFund, hideNumbers)}</h3>
          </div>
          <DollarSign size={40} className="text-slate-700 relative z-10" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="bg-indigo-900 p-6 rounded-3xl shadow-xl shadow-indigo-100 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-300 text-sm font-medium mb-1">صندوق محمد (الشخصي)</p>
            <h3 className="text-3xl font-black">{formatCurrency(ownerAWallet, hideNumbers)}</h3>
          </div>
          <DollarSign size={40} className="text-indigo-800 relative z-10" />
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        </div>

        <div className="bg-violet-900 p-6 rounded-3xl shadow-xl shadow-violet-100 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-violet-300 text-sm font-medium mb-1">صندوق عبيدة (الشخصي)</p>
            <h3 className="text-3xl font-black">{formatCurrency(ownerBWallet, hideNumbers)}</h3>
          </div>
          <DollarSign size={40} className="text-violet-800 relative z-10" />
          <div className="absolute -bottom-2 -right-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] shadow-xl shadow-emerald-100 text-white flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center text-emerald-100 mb-2">
            <span className="font-medium text-sm tracking-wider">إجمالي المبيعات</span>
            <TrendingUp size={18} className="text-emerald-100" />
          </div>
          <div>
            <div className="text-3xl font-black">{formatCurrency(totalRevenue, hideNumbers)}</div>
            {totalCalculatedCOGS > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-[10px] bg-black/10 w-fit px-2 py-0.5 rounded-md font-medium flex gap-2">
                  <span>تكلفة البضاعة (COGS):</span>
                  <span>{formatCurrency(totalCalculatedCOGS, hideNumbers)}</span>
                </div>
                <div className="text-[10px] bg-white/20 w-fit px-2 py-0.5 rounded-md font-bold flex gap-2">
                  <span>إجمالي الربح التشغيلي:</span>
                  <span>{formatCurrency(totalRevenue - totalCalculatedCOGS, hideNumbers)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-rose-500 p-6 rounded-[2.5rem] shadow-xl shadow-rose-100 text-white flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center text-rose-100 mb-2">
            <span className="font-medium text-sm tracking-wider">صافي الأرباح (العام)</span>
            <DollarSign size={18} className="text-rose-100" />
          </div>
          <div className="text-3xl font-black">{formatCurrency(generalNetProfit, hideNumbers)}</div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100 text-white flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center text-indigo-100 mb-2">
            <span className="font-medium text-sm tracking-wider">أرباح محمد المستحقة (58%)</span>
          </div>
          <div className="text-3xl font-black">{formatCurrency(profitA, hideNumbers)}</div>
          {wasteOwnerA > 0 ? (
            <div className="mt-4 text-xs bg-white/20 w-fit px-2 py-1 rounded-lg font-medium">تم خصم {formatCurrency(wasteOwnerA, hideNumbers)} هالك</div>
          ) : (
            <div className="mt-8"></div>
          )}
        </div>

        <div className="bg-amber-400 p-6 rounded-[2.5rem] shadow-xl shadow-amber-100 text-slate-900 flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center text-amber-900/60 mb-2">
            <span className="font-medium text-sm tracking-wider">أرباح عبيدة المستحقة (42%)</span>
          </div>
          <div className="text-3xl font-black">{formatCurrency(profitB, hideNumbers)}</div>
          {wasteOwnerB > 0 ? (
            <div className="mt-4 text-xs bg-black/10 w-fit px-2 py-1 rounded-lg text-amber-900 font-bold">تم خصم {formatCurrency(wasteOwnerB, hideNumbers)} هالك</div>
          ) : (
            <div className="mt-8"></div>
          )}
        </div>
      </div>

      {/* Alerts Row */}
      {(lowStockItems.length > 0 || highDebtProfiles.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-4">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-red-900">تنبيه نقص المخزون</h4>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {lowStockItems.map(item => (
                    <li key={item.id} className="flex justify-between gap-4 w-full">
                      <span>{item.name}</span> <span>متبقي {formatQuantity(item.quantity, hideNumbers)} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {highDebtProfiles.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start space-x-4">
              <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-amber-900">تنبيه المديونيات العالية (مستحقات)</h4>
                <ul className="mt-1 text-sm text-amber-800 space-y-1">
                  {highDebtProfiles.map(p => (
                    <li key={p.id} className="flex justify-between gap-4 w-full">
                      <span className="font-medium">{p.name}</span> <span>{formatCurrency(p.debt, hideNumbers)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">الإيرادات مقابل المصروفات (آخر 7 أيام)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">أحدث العمليات</h3>
            <button className="text-indigo-600 font-bold text-sm hover:underline">عرض الكل</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-400 text-sm border-b border-slate-50">
                  <th className="pb-4 px-4 font-medium text-right">التاريخ</th>
                  <th className="pb-4 px-4 font-medium text-right">النوع</th>
                  <th className="pb-4 px-4 font-medium text-right">الوصف</th>
                  <th className="pb-4 px-4 font-medium text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.transactions.slice(0, 5).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-4 text-slate-500 text-sm">{format(new Date(t.date), 'yyyy/MM/dd')}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        t.type === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                        (t.type === 'purchase' || t.type === 'expense') ? 'bg-rose-100 text-rose-700' :
                        t.type === 'waste' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.type === 'sale' ? 'بيع' : t.type === 'purchase' ? 'شراء' : t.type === 'expense' ? 'مصروف' : t.type === 'waste' ? 'هالك' : 'إيداع'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-700">{t.description}</td>
                    <td className={`py-4 px-4 text-left font-bold ${
                      (t.type === 'sale' || t.type === 'deposit') ? 'text-slate-900' : 'text-slate-900'
                    }`}>
                      {(t.type === 'sale' || t.type === 'deposit') ? '+' : '\u200E-'}{formatCurrency(t.amountJOD, hideNumbers)}
                    </td>
                  </tr>
                ))}
                {state.transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-slate-500">لا توجد عمليات أخيرة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}