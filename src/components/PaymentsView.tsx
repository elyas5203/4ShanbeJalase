import React, { useState } from 'react';
import { CreditCard, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Payment } from '../types';

interface PaymentsViewProps {
  payments: Payment[];
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ payments }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = payments.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      (p.user_name && p.user_name.toLowerCase().includes(q)) ||
      (p.user_phone && p.user_phone.includes(q)) ||
      (p.client_ref_id && p.client_ref_id.toLowerCase().includes(q)) ||
      (p.ref_id && p.ref_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            تراکنش‌ها و لاگ درگاه PayPing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده سوابق پرداخت کاربران، کدهای ارجاع سفارش و شماره پیگیری‌های بانکی شاپرک
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی کد شاپرک، سفارش، نام..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">شناسه</th>
                <th className="p-3.5">خریدار / کاربر</th>
                <th className="p-3.5">مبلغ پرداخت</th>
                <th className="p-3.5">کد سفارش سیستم (ClientRef)</th>
                <th className="p-3.5">کد پیگیری شاپرک (RefId)</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5">تاریخ پرداخت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono text-slate-500 text-[11px]">#{pay.id}</td>
                  <td className="p-3.5 font-medium text-white">
                    <div>{pay.user_name || 'کاربر'}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{pay.user_phone || '-'}</div>
                  </td>
                  <td className="p-3.5 font-bold text-emerald-400">
                    {pay.amount.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">تومان</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-300">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {pay.client_ref_id}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">
                    {pay.ref_id ? (
                      <span className="text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                        {pay.ref_id}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {pay.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        تأیید شده
                      </span>
                    ) : pay.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        در انتظار پرداخت
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-semibold border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        ناموفق
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-400 text-[11px]">
                    {new Date(pay.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} - {new Date(pay.created_at).toLocaleDateString('fa-IR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
