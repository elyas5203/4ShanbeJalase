import React, { useState } from 'react';
import { Bot, Send, CheckCircle2, ArrowRight, ShieldCheck, DollarSign, Bell } from 'lucide-react';
import { Product, Plan } from '../types';

interface BotSimulatorViewProps {
  products: Product[];
  plans: Plan[];
  onSimulatePurchase: (params: {
    productId: number;
    planId: number;
    platform: 'telegram' | 'bale';
    customerInfo: Record<string, string>;
  }) => void;
  onNavigateToSubscriptions: () => void;
}

export const BotSimulatorView: React.FC<BotSimulatorViewProps> = ({
  products,
  plans,
  onSimulatePurchase,
  onNavigateToSubscriptions,
}) => {
  const [platform, setPlatform] = useState<'telegram' | 'bale'>('telegram');
  const [step, setStep] = useState<'welcome' | 'products' | 'plans' | 'fields' | 'payment_ready' | 'success'>('welcome');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  const [formData, setFormData] = useState<Record<string, string>>({
    name: 'محمدرضا علوی',
    phone: '09123334455',
    email: 'm.alavi.work@gmail.com',
  });

  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  const availablePlans = selectedProduct ? plans.filter(p => p.product_id === selectedProduct.id && p.is_active) : [];

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setStep('plans');
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('fields');
  };

  const handleFieldChange = (key: string, val: string) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment_ready');
  };

  const handlePayNow = () => {
    if (!selectedProduct || !selectedPlan) return;

    onSimulatePurchase({
      productId: selectedProduct.id,
      planId: selectedPlan.id,
      platform,
      customerInfo: formData
    });

    const notif = `کاربر ${formData.name || 'مشتری'} (${formData.phone || formData.email}) پلن ${selectedPlan.name} برای ${selectedProduct.name} را با مبلغ ${selectedPlan.price.toLocaleString('fa-IR')} تومان خریداری کرد. اشتراک در وضعیت «در انتظار فعال‌سازی» ثبت شد.`;
    setAdminNotification(notif);
    setStep('success');
  };

  const resetFlow = () => {
    setStep('welcome');
    setSelectedProduct(null);
    setSelectedPlan(null);
    setAdminNotification(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
          <Bot className="w-3.5 h-3.5" />
          محیط شبیه‌ساز تست زنده ربات‌ها
        </div>
        <h2 className="text-2xl font-bold text-white">تست خرید و اتصال PayPing در ربات تلگرام و بله</h2>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          در این بخش می‌توانید دقیقاً جریان خرید کاربر را مرحله به مرحله تست کنید. با ثبت خرید، اعلان به ادمین ارسال شده و اشتراک جهت فعال‌سازی در پنل ثبت می‌شود.
        </p>
      </div>

      {/* Platform Toggle */}
      <div className="flex justify-center gap-3">
        <button
          id="btn-switch-tg"
          onClick={() => { setPlatform('telegram'); resetFlow(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            platform === 'telegram'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white"></span>
          شبیه‌ساز ربات تلگرام (Telegram Bot)
        </button>

        <button
          id="btn-switch-bale"
          onClick={() => { setPlatform('bale'); resetFlow(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            platform === 'bale'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white"></span>
          شبیه‌ساز ربات بله (Bale Bot)
        </button>
      </div>

      {/* Chat Mockup Window */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-lg mx-auto flex flex-col min-h-[520px]">
        {/* Chat Header */}
        <div className={`p-4 border-b border-slate-800/80 flex items-center justify-between ${
          platform === 'telegram' ? 'bg-sky-950/40' : 'bg-emerald-950/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-md ${
              platform === 'telegram' ? 'bg-sky-500' : 'bg-emerald-600'
            }`}>
              AI
            </div>
            <div>
              <div className="font-bold text-xs text-white">
                {platform === 'telegram' ? 'شبیه‌ساز ربات (تلگرام)' : 'شبیه‌ساز ربات (بله)'}
              </div>
              <div className="text-[10px] text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                محیط تست — دادهٔ ثبت‌شده اینجا وارد ربات واقعی نمی‌شود
              </div>
            </div>
          </div>
          <button
            onClick={resetFlow}
            className="text-[11px] text-slate-400 hover:text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer"
          >
            شروع مجدد (/start)
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Step 1: Start Welcome */}
          <div className="flex flex-col items-start space-y-2">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tr-xs max-w-sm text-xs text-slate-200 leading-relaxed space-y-2">
              <p>سلام کاربر عزیز! 👋</p>
              <p>به ربات رسمی ارائه اشتراک‌های هوش مصنوعی سازمانی خوش آمدید.</p>
              <p className="text-slate-400 text-[11px]">جهت خرید یا مشاهده پلن‌ها از گزینه‌های زیر استفاده کنید:</p>
            </div>

            {step === 'welcome' && (
              <div className="w-full space-y-1.5 pt-1">
                <button
                  id="bot-btn-show-products"
                  onClick={() => setStep('products')}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer text-center"
                >
                  🛍 مشاهده و خرید اشتراک
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Show Products */}
          {(step === 'products' || step === 'plans' || step === 'fields' || step === 'payment_ready' || step === 'success') && (
            <div className="flex flex-col items-start space-y-2">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tr-xs max-w-sm text-xs text-slate-200">
                لطفاً محصول مورد نظر خود را انتخاب نمایید:
              </div>

              {step === 'products' && (
                <div className="w-full space-y-1.5 pt-1">
                  {products.filter(p => p.is_active).map((prod) => (
                    <button
                      key={prod.id}
                      id={`bot-prod-${prod.id}`}
                      onClick={() => handleSelectProduct(prod)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span>✨ {prod.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Selected Product & Select Plan */}
          {(step === 'plans' || step === 'fields' || step === 'payment_ready' || step === 'success') && selectedProduct && (
            <div className="flex flex-col items-start space-y-2">
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tr-xs max-w-sm text-xs text-slate-200 space-y-1.5">
                <div className="font-bold text-indigo-300">📦 {selectedProduct.name}</div>
                <div className="text-[11px] text-slate-300">{selectedProduct.description}</div>
                <div className="text-[11px] text-slate-400 pt-1">لطفاً پلن مورد نظر را انتخاب کنید:</div>
              </div>

              {step === 'plans' && (
                <div className="w-full space-y-1.5 pt-1">
                  {availablePlans.map((pl) => (
                    <button
                      key={pl.id}
                      id={`bot-plan-${pl.id}`}
                      onClick={() => handleSelectPlan(pl)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold">{pl.name} ({pl.duration_days} روز)</div>
                        <div className="text-[11px] text-emerald-400 mt-0.5">{pl.price.toLocaleString('fa-IR')} تومان</div>
                      </div>
                      <span className="text-[11px] text-indigo-400">انتخاب پلن ›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Enter Customer Dynamic Info */}
          {(step === 'fields' || step === 'payment_ready' || step === 'success') && selectedPlan && selectedProduct && (
            <div className="flex flex-col items-start space-y-2 w-full">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tr-xs max-w-sm text-xs text-slate-200">
                📝 برای صدور فاکتور <b>{selectedProduct.name} ({selectedPlan.name})</b> لطفاً اطلاعات زیر را وارد نمایید:
              </div>

              {step === 'fields' && (
                <form onSubmit={handleProceedToPayment} className="w-full bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-3">
                  {selectedProduct.required_fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        {f.label} {f.required && <span className="text-red-400">*</span>}:
                      </label>
                      <input
                        type={f.type === 'email' ? 'email' : 'text'}
                        required={f.required}
                        value={formData[f.key] || ''}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder={`ورود ${f.label}`}
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md cursor-pointer"
                  >
                    صدور فاکتور و دریافت لینک PayPing
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 5: Invoice Ready to Pay */}
          {(step === 'payment_ready') && selectedPlan && selectedProduct && (
            <div className="flex flex-col items-start space-y-2 w-full">
              <div className="w-full bg-slate-900 border border-indigo-500/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-white">🧾 فاکتور پرداخت آنلاین (PayPing)</span>
                  <span className="text-[10px] text-indigo-400 font-mono">شناسه یکتا: SUB-TEST</span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">محصول:</span>
                    <span className="font-semibold text-white">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">پلن انتخابی:</span>
                    <span className="text-white">{selectedPlan.name} ({selectedPlan.duration_days} روز)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">نام خریدار:</span>
                    <span className="text-white">{formData.name}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-slate-300 font-bold">مبلغ قابل پرداخت:</span>
                    <span className="font-bold text-emerald-400 text-sm">{selectedPlan.price.toLocaleString('fa-IR')} تومان</span>
                  </div>

                  {selectedPlan.payping_product_url && (
                    <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-300">
                      🔗 <b>لینک اختصاصی آیتم مالی PayPing:</b>
                      <div className="font-mono text-[10px] text-sky-400 truncate mt-0.5">
                        {selectedPlan.payping_product_url}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    id="btn-simulate-payping-click"
                    onClick={handlePayNow}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <DollarSign className="w-4 h-4" />
                    {selectedPlan.payping_product_url
                      ? '💳 باز کردن لینک مستقیم محصول در PayPing (شبیه‌سازی پرداخت)'
                      : '💳 پرداخت آنلاین فاکتور در درگاه شاپرک PayPing'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Success Completed */}
          {step === 'success' && (
            <div className="space-y-3 w-full">
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl text-xs space-y-2 text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  پرداخت با موفقیت در شاپرک تأیید شد!
                </div>
                <p>
                  سفارش شما برای <b>{selectedProduct?.name}</b> ثبت گردید و برای ادمین ارسال شد. دسترسی شما به زودی فعال خواهد شد.
                </p>
              </div>

              {/* Admin Notification Toast */}
              {adminNotification && (
                <div className="bg-indigo-950/60 border border-indigo-500/50 p-3.5 rounded-2xl text-xs space-y-2 text-slate-200 shadow-xl">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-xs">
                    <Bell className="w-4 h-4 text-indigo-400 animate-bounce" />
                    پیام ارسالی به تلگرام شخصی ادمین:
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed">
                    🔔 <b>خرید جدید!</b><br />
                    {adminNotification}<br />
                    ⚡️ <i>لطفاً وارد پنل ادمین شده و اشتراک را فعال کنید.</i>
                  </div>
                  <button
                    onClick={onNavigateToSubscriptions}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    رفتن به جدول اشتراک‌ها و فعال‌سازی این سفارش ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
