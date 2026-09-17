import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Check, 
  RefreshCw, 
  Calendar, 
  Edit3, 
  ExternalLink,
  Filter,
  X
} from 'lucide-react';
import { Subscription, SubscriptionStatus } from '../types';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  onActivate: (subId: number, adminNotes: string) => void;
  onExtend: (subId: number, days: number, adminNotes?: string) => void;
  onUpdateStatus: (subId: number, status: SubscriptionStatus, notes?: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  onActivate,
  onExtend,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [activatingSub, setActivatingSub] = useState<Subscription | null>(null);
  const [extendingSub, setExtendingSub] = useState<Subscription | null>(null);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const [modalNotes, setModalNotes] = useState('');
  const [extendDays, setExtendDays] = useState(30);
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>('ACTIVE');

  // Filtering
  const filteredSubs = subscriptions.filter((s) => {
    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'EXPIRING_SOON') {
        if (s.status !== 'ACTIVE' || !s.end_date) return false;
        const diffDays = (new Date(s.end_date).getTime() - Date.now()) / (86400000);
        if (diffDays < 0 || diffDays > 5) return false;
      } else if (s.status !== statusFilter) {
        return false;
      }
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = s.user?.name?.toLowerCase() || '';
      const phone = s.user?.phone?.toLowerCase() || '';
      const email = s.user?.email?.toLowerCase() || '';
      const prod = s.product?.name?.toLowerCase() || '';
      const notes = s.admin_notes?.toLowerCase() || '';
      return name.includes(q) || phone.includes(q) || email.includes(q) || prod.includes(q) || notes.includes(q);
    }

    return true;
  });

  const handleOpenActivate = (sub: Subscription) => {
    setActivatingSub(sub);
    setModalNotes(sub.admin_notes || `اینوایت به ایمیل ${sub.customer_info.email || sub.user?.email || 'کاربر'} ارسال شد`);
  };

  const handleConfirmActivate = () => {
    if (activatingSub) {
      onActivate(activatingSub.id, modalNotes);
      setActivatingSub(null);
      setModalNotes('');
    }
  };

  const handleOpenExtend = (sub: Subscription) => {
    setExtendingSub(sub);
    setExtendDays(sub.plan?.duration_days || 30);
    setModalNotes(sub.admin_notes || '');
  };

  const handleConfirmExtend = () => {
    if (extendingSub) {
      onExtend(extendingSub.id, extendDays, modalNotes);
      setExtendingSub(null);
      setModalNotes('');
    }
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setNewStatus(sub.status);
    setModalNotes(sub.admin_notes || '');
  };

  const handleConfirmEdit = () => {
    if (editingSub) {
      onUpdateStatus(editingSub.id, newStatus, modalNotes);
      setEditingSub(null);
    }
  };

  const getStatusBadge = (sub: Subscription) => {
    if (sub.status === 'PENDING_ACTIVATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          در انتظار فعال‌سازی
        </span>
      );
    }
    if (sub.status === 'ACTIVE') {
      const daysLeft = sub.end_date ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000) : 0;
      if (daysLeft <= 5 && daysLeft > 0) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            فعال ({daysLeft} روز تا پایان)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          فعال
        </span>
      );
    }
    if (sub.status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          منقضی شده
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-800/40">
        لغو شده
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            مدیریت اشتراک‌های کاربران
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده، فعال‌سازی دستی، تمدید و ثبت مشخصات اشتراک‌های فروخته‌شده در ربات‌های تلگرام و بله
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            id="search-subscriptions"
            type="text"
            placeholder="جستجو نام، شماره، ایمیل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
        {[
          { id: 'ALL', label: 'همه اشتراک‌ها' },
          { id: 'PENDING_ACTIVATION', label: 'در انتظار فعال‌سازی' },
          { id: 'ACTIVE', label: 'فعال' },
          { id: 'EXPIRING_SOON', label: 'نزدیک به پایان (≤۵ روز)' },
          { id: 'EXPIRED', label: 'منقضی شده' },
          { id: 'CANCELLED', label: 'لغو شده' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`filter-sub-${tab.id}`}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {filteredSubs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            اشتراکی با این مشخصات یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">شناسه</th>
                  <th className="p-3.5">مشتری / کاربر</th>
                  <th className="p-3.5">محصول و پلن</th>
                  <th className="p-3.5">اطلاعات خریدار</th>
                  <th className="p-3.5">کانال</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">تاریخ شروع و پایان</th>
                  <th className="p-3.5">یادداشت ادمین</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">#{sub.id}</td>
                    <td className="p-3.5 font-medium text-white">
                      <div>{sub.user?.name || 'مشتری'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{sub.user?.phone || sub.user?.email || '-'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-indigo-300">{sub.product?.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {sub.plan?.name} ({sub.plan?.duration_days} روز)
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5 font-mono text-[11px]">
                        {Object.entries(sub.customer_info).map(([k, v]) => (
                          <div key={k} className="flex gap-1 text-slate-300">
                            <span className="text-slate-500 font-sans">{k}:</span>
                            <span className="text-slate-100 bg-slate-950 px-1 py-0.2 rounded">{v}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        sub.source_platform === 'telegram'
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {sub.source_platform === 'telegram' ? 'تلگرام' : 'بله'}
                      </span>
                    </td>
                    <td className="p-3.5">{getStatusBadge(sub)}</td>
                    <td className="p-3.5 text-[11px] text-slate-300">
                      {sub.start_date && sub.end_date ? (
                        <div>
                          <div>از: <span className="text-slate-400">{new Date(sub.start_date).toLocaleDateString('fa-IR')}</span></div>
                          <div>تا: <span className="text-emerald-400 font-semibold">{new Date(sub.end_date).toLocaleDateString('fa-IR')}</span></div>
                        </div>
                      ) : (
                        <span className="text-amber-400/80 font-medium">فعال نشده</span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs text-[11px] text-slate-400">
                      {sub.admin_notes ? (
                        <span className="line-clamp-2" title={sub.admin_notes}>{sub.admin_notes}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {sub.status === 'PENDING_ACTIVATION' && (
                          <button
                            id={`btn-act-sub-${sub.id}`}
                            onClick={() => handleOpenActivate(sub)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                            title="فعال‌سازی اشتراک"
                          >
                            <Check className="w-3.5 h-3.5" />
                            فعال‌سازی
                          </button>
                        )}
                        <button
                          id={`btn-extend-sub-${sub.id}`}
                          onClick={() => handleOpenExtend(sub)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                          title="تمدید اشتراک"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تمدید
                        </button>
                        <button
                          id={`btn-edit-sub-${sub.id}`}
                          onClick={() => handleOpenEdit(sub)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                          title="تغییر وضعیت یا یادداشت"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Activate Subscription */}
      {activatingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                فعال‌سازی اشتراک {activatingSub.product?.name}
              </h3>
              <button onClick={() => setActivatingSub(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div>کاربر: <b className="text-white">{activatingSub.user?.name}</b> ({activatingSub.user?.phone || activatingSub.user?.email})</div>
              <div>پلن: <b className="text-indigo-400">{activatingSub.plan?.name}</b> ({activatingSub.plan?.duration_days} روز اعتبار)</div>
              <div>کانال: {activatingSub.source_platform === 'telegram' ? 'ربات تلگرام' : 'ربات بله'}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                یادداشت ادمین (مثلاً ایمیل ثبت‌شده در Workspace سازمانی):
              </label>
              <textarea
                id="input-activate-notes"
                rows={3}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="توضیحات فعال‌سازی و مشخصات دسترسی..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActivatingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                id="btn-confirm-activate"
                onClick={handleConfirmActivate}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                تایید و فعال‌سازی ({activatingSub.plan?.duration_days} روز)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Extend Subscription */}
      {extendingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                تمدید هوشمند اشتراک
              </h3>
              <button onClick={() => setExtendingSub(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              با انتخاب روزهای تمدید، تاریخ پایان اشتراک <b className="text-white">{extendingSub.user?.name}</b> به طور هوشمند محاسبه و افزوده می‌شود.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">مدت تمدید:</label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      extendDays === d
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    +{d} روز
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">یادداشت تمدید:</label>
              <input
                type="text"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="علت یا شماره فاکتور تمدید..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setExtendingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                id="btn-confirm-extend"
                onClick={handleConfirmExtend}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                افزودن +{extendDays} روز اعتبار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Status & Notes */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">تغییر وضعیت اشتراک</h3>
              <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">وضعیت اشتراک:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="PENDING_ACTIVATION">در انتظار فعال‌سازی</option>
                <option value="ACTIVE">فعال (دسترسی باز)</option>
                <option value="EXPIRED">منقضی شده (قطع دسترسی)</option>
                <option value="CANCELLED">لغو شده</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">یادداشت ادمین:</label>
              <textarea
                rows={3}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                id="btn-confirm-edit-status"
                onClick={handleConfirmEdit}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
