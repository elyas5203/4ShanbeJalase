import React from 'react';
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { DashboardStats, Subscription, Payment, ActivityLog } from '../types';

interface DashboardViewProps {
  stats: DashboardStats;
  pendingSubs: Subscription[];
  expiringSubs: Subscription[];
  recentPayments: Payment[];
  logs: ActivityLog[];
  onQuickActivate: (subId: number) => void;
  onNavigateToSubscriptions: () => void;
  onNavigateToSimulator: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  pendingSubs,
  expiringSubs,
  recentPayments,
  logs,
  onQuickActivate,
  onNavigateToSubscriptions,
  onNavigateToSimulator,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white">داشبورد فروش و مدیریت اشتراک‌ها</h2>
          <p className="text-xs text-slate-400 mt-1">
            وضعیت لحظه‌ای فروش محصولات اشتراکی در ربات‌های تلگرام و بله
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-quick-simulator"
            onClick={onNavigateToSimulator}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            تست خرید کاربر در بات
          </button>
          <button
            id="btn-view-all-subs"
            onClick={onNavigateToSubscriptions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            مشاهده همه اشتراک‌ها
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs">فروش امروز</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {stats.today_sales.toLocaleString('fa-IR')}
            <span className="text-[10px] text-slate-400 font-normal mr-1">تومان</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs">فروش این ماه</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-indigo-300">
            {stats.month_sales.toLocaleString('fa-IR')}
            <span className="text-[10px] text-slate-400 font-normal mr-1">تومان</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs">درآمد کل سیستم</span>
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-violet-300">
            {stats.total_sales.toLocaleString('fa-IR')}
            <span className="text-[10px] text-slate-400 font-normal mr-1">تومان</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs">مشترکین فعال</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-blue-300">
            {stats.active_users} <span className="text-[10px] text-slate-400 font-normal">نفر</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-800/40 bg-amber-950/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-300 mb-2">
            <span className="text-xs font-semibold">نیازمند فعال‌سازی</span>
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-amber-400">
            {stats.pending_activation} <span className="text-[10px] text-amber-300/80 font-normal">سفارش</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-800/40 bg-rose-950/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-300 mb-2">
            <span className="text-xs font-semibold">نزدیک به پایان (≤۵ روز)</span>
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-rose-400">
            {stats.expiring_soon} <span className="text-[10px] text-rose-300/80 font-normal">اشتراک</span>
          </div>
        </div>
      </div>

      {/* Urgent Section: Pending Activation Orders */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
            <h3 className="font-bold text-sm text-slate-100">سفارش‌های جدید پرداخت‌شده (در انتظار فعال‌سازی ادمین)</h3>
          </div>
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {pendingSubs.length} مورد منتظر اقدام
          </span>
        </div>

        {pendingSubs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            هیچ سفارشی در انتظار فعال‌سازی نیست. همه اشتراک‌ها فعال شده‌اند.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">کاربر / خریدار</th>
                  <th className="p-3">محصول و پلن</th>
                  <th className="p-3">اطلاعات دریافتی خریدار</th>
                  <th className="p-3">کانال خرید</th>
                  <th className="p-3">تاریخ پرداخت</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-medium text-white">
                      <div>{sub.user?.name || 'مشتری'}</div>
                      <div className="text-[11px] text-slate-400">{sub.user?.phone || sub.user?.email || '-'}</div>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold text-[11px] border border-indigo-500/30">
                        {sub.product?.name}
                      </span>
                      <div className="text-[11px] text-slate-300 mt-1">{sub.plan?.name} ({sub.plan?.duration_days} روز)</div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5 text-[11px] text-slate-300 font-mono">
                        {Object.entries(sub.customer_info).map(([k, v]) => (
                          <div key={k} className="flex gap-1 items-center">
                            <span className="text-slate-400 font-sans">{k}:</span>
                            <span className="text-white bg-slate-950 px-1.5 py-0.5 rounded">{v}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        sub.source_platform === 'telegram'
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {sub.source_platform === 'telegram' ? 'ربات تلگرام' : 'ربات بله'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(sub.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} - {new Date(sub.created_at).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        id={`btn-activate-${sub.id}`}
                        onClick={() => onQuickActivate(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        ✓ فعال‌سازی آنی
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Columns: Expiring Subscriptions & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon Subscriptions */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              اشتراک‌های نزدیک به پایان (یادآوری‌های ۵ و ۳ روز)
            </h3>
            <span className="text-xs text-slate-400">{expiringSubs.length} مشترک</span>
          </div>

          {expiringSubs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">هیچ اشتراکی در ۵ روز آینده به پایان نمی‌رسد.</p>
          ) : (
            <div className="space-y-2.5">
              {expiringSubs.map((sub) => {
                const daysRemaining = sub.end_date 
                  ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (86400000))
                  : 0;
                return (
                  <div key={sub.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{sub.user?.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {sub.product?.name} - {sub.user?.phone || sub.user?.email}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        daysRemaining <= 1 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : daysRemaining <= 3 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}>
                        {daysRemaining > 0 ? `${daysRemaining} روز مانده` : 'امروز پایان اعتبار'}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        پایان: {sub.end_date ? new Date(sub.end_date).toLocaleDateString('fa-IR') : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent PayPing Transactions */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              آخرین تراکنش‌های موفق PayPing
            </h3>
            <span className="text-xs text-slate-400 font-mono">شاپرک</span>
          </div>

          <div className="space-y-2">
            {recentPayments.slice(0, 5).map((pay) => (
              <div key={pay.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-slate-200">{pay.user_name || 'کاربر'}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">کد شاپرک: {pay.ref_id || pay.client_ref_id}</div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-emerald-400">{pay.amount.toLocaleString('fa-IR')} تومان</div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(pay.created_at).toLocaleDateString('fa-IR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-sm">
        <h3 className="font-bold text-sm text-slate-100 mb-3">لاگ رویدادها و نوتیفیکیشن‌های سیستم</h3>
        <div className="space-y-2">
          {logs.slice(0, 4).map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                log.type === 'sale' ? 'bg-emerald-400' :
                log.type === 'activation' ? 'bg-indigo-400' :
                log.type === 'renewal' ? 'bg-blue-400' : 'bg-amber-400'
              }`}></span>
              <div className="flex-1">
                <div className="font-semibold text-slate-200">{log.title}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{log.description}</div>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
