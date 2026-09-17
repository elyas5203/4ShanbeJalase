import React, { useState } from 'react';
import { Layers, Plus, DollarSign, Calendar, Trash2, Link, ExternalLink, Edit3, Check } from 'lucide-react';
import { Plan, Product } from '../types';

interface PlansViewProps {
  plans: Plan[];
  products: Product[];
  selectedProductId?: number;
  onCreatePlan: (plan: Omit<Plan, 'id'>) => void;
  onUpdatePlan: (id: number, patch: Partial<Omit<Plan, 'id'>>) => void;
  onDeletePlan: (id: number) => void;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  products,
  selectedProductId,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
}) => {
  const [activeProductId, setActiveProductId] = useState<number>(
    selectedProductId || (products.length > 0 ? products[0].id : 1)
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDuration, setPlanDuration] = useState(30);
  const [planPrice, setPlanPrice] = useState(390000);
  const [planPaypingUrl, setPlanPaypingUrl] = useState('');
  const [planPaypingCode, setPlanPaypingCode] = useState('');

  const filteredPlans = plans.filter((p) => p.product_id === activeProductId);
  const currentProduct = products.find((p) => p.id === activeProductId);

  const openAddModal = () => {
    setEditingPlanId(null);
    setPlanName('');
    setPlanDuration(30);
    setPlanPrice(390000);
    setPlanPaypingUrl('');
    setPlanPaypingCode('');
    setShowAddModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanDuration(plan.duration_days);
    setPlanPrice(plan.price);
    setPlanPaypingUrl(plan.payping_product_url || '');
    setPlanPaypingCode(plan.payping_product_code || '');
    setShowAddModal(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName) return;

    let cleanUrl = planPaypingUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    if (editingPlanId) {
      onUpdatePlan(editingPlanId, {
        name: planName,
        duration_days: planDuration,
        price: planPrice,
        payping_product_url: cleanUrl || undefined,
        payping_product_code: planPaypingCode.trim() || undefined,
      });
    } else {
      onCreatePlan({
        product_id: activeProductId,
        name: planName,
        duration_days: planDuration,
        price: planPrice,
        payping_product_url: cleanUrl || undefined,
        payping_product_code: planPaypingCode.trim() || undefined,
        is_active: true,
        display_order: filteredPlans.length + 1,
      });
    }

    setShowAddModal(false);
  };

  const togglePlanActive = (plan: Plan) => {
    onUpdatePlan(plan.id, { is_active: !plan.is_active });
  };

  const deletePlan = (planId: number) => {
    if (confirm('آیا از حذف این پلن مطمئن هستید؟')) {
      onDeletePlan(planId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            مدیریت پلن‌ها و لینک اختصاصی آیتم مالی PayPing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تعیین لینک‌های مستقیم ساخته‌شده از myShop پی‌پینگ، مدت زمان و قیمت هر پلن
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://app.payping.ir/myShop/product/create"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            ساخت محصول در PayPing
          </a>
          <button
            id="btn-add-plan"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            افزودن پلن جدید به {currentProduct?.name}
          </button>
        </div>
      </div>

      {/* Info Banner for PayPing direct product link */}
      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-2.5">
        <Link className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-indigo-300">پشتیبانی از لینک مستقیم آیتم مالی (PayPing myShop): </span>
          هنگامی که شما برای هر پلن در پنل پی‌پینگ (<code className="text-sky-300 font-mono">myShop/product/create</code>) یک آیتم مالی می‌سازید، لینک پرداخت مستقیم آن را در کادر زیر وارد کنید. کاربر در ربات با کلیک روی پلن مستقیماً به همین لینک اختصاصی هدایت می‌شود!
        </div>
      </div>

      {/* Product Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {products.map((prod) => (
          <button
            key={prod.id}
            id={`tab-prod-plan-${prod.id}`}
            onClick={() => setActiveProductId(prod.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeProductId === prod.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {prod.name}
          </button>
        ))}
      </div>

      {/* Plans List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <div key={plan.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">{plan.name}</span>
                <button
                  onClick={() => togglePlanActive(plan)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                    plan.is_active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {plan.is_active ? 'فعال در منو' : 'غیرفعال'}
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    مبلغ پلن:
                  </span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {plan.price.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">تومان</span>
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    مدت اشتراک:
                  </span>
                  <span className="font-bold text-white text-xs">{plan.duration_days} روز</span>
                </div>

                {/* Direct PayPing URL */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Link className="w-3 h-3 text-sky-400" />
                    لینک محصول PayPing:
                  </span>
                  {plan.payping_product_url ? (
                    <a
                      href={plan.payping_product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:text-sky-300 font-mono text-[11px] block truncate underline"
                    >
                      {plan.payping_product_url}
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px] italic">تولید داینامیک فاکتور (پیش‌فرض)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={() => openEditModal(plan)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Edit3 className="w-3.5 h-3.5" />
                ویرایش پلن و لینک
              </button>
              <button
                onClick={() => deletePlan(plan.id)}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add/Edit Plan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              {editingPlanId ? 'ویرایش پلن و لینک PayPing' : `افزودن پلن جدید برای ${currentProduct?.name}`}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نام پلن:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: پلن سه‌ماهه تخفیف ویژه"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">مدت اعتبار (روز):</label>
                  <input
                    type="number"
                    required
                    value={planDuration}
                    onChange={(e) => setPlanDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">قیمت (تومان):</label>
                  <input
                    type="number"
                    required
                    value={planPrice}
                    onChange={(e) => setPlanPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <Link className="w-3.5 h-3.5 text-sky-400" />
                    لینک اختصاصی محصول در PayPing:
                  </label>
                  <span className="text-[10px] text-sky-400">از myShop/product</span>
                </div>
                <input
                  type="text"
                  placeholder="مثال: ppng.ir/d/gEQe یا https://payp.in/prod/xxxxx"
                  value={planPaypingUrl}
                  onChange={(e) => setPlanPaypingUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono text-left focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  پشتیبانی کامل از لینک‌های کوتاه <code className="text-sky-300 font-mono">ppng.ir/d/...</code> و لینک‌های استاندارد PayPing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">کد محصول یا شناسه پی‌پینگ (اختیاری):</label>
                <input
                  type="text"
                  placeholder="کد یا شناسه مرجع آیتم مالی"
                  value={planPaypingCode}
                  onChange={(e) => setPlanPaypingCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono text-left focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  {editingPlanId ? 'ذخیره تغییرات' : 'افزودن پلن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
