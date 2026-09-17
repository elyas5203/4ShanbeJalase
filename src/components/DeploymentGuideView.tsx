import React, { useState } from 'react';
import { Terminal, Copy, Check, Server, ShieldCheck, GitBranch, AlertTriangle } from 'lucide-react';

export const DeploymentGuideView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const oneLiner = `systemctl stop gptbot.service 2>/dev/null || true
systemctl disable gptbot.service 2>/dev/null || true
rm -rf /root/gptBOT
cd /root && rm -rf /root/aiBOT
git clone https://github.com/elyasproject10-arch/aiBOT.git /root/aiBOT
cd /root/aiBOT && bash deploy.sh`;

  const steps = [
    {
      title: '۱. توقف و حذف امن ربات قبلی (بدون دستکاری سایر بات‌های سرور)',
      cmd: `systemctl stop gptbot.service 2>/dev/null || true\nsystemctl disable gptbot.service 2>/dev/null || true\nrm -rf /root/gptBOT`,
      desc: 'فقط سرویس gptbot متوقف شده و پوشه قبلی حذف می‌شود. تمام بات‌ها و سرویس‌های دیگر سرور کاملاً دست‌نخورده باقی می‌مانند.'
    },
    {
      title: '۲. ایجاد پوشه اختصاصی /root/aiBOT و دریافت سورس مخزن جدید',
      cmd: `cd /root && rm -rf /root/aiBOT\ngit clone https://github.com/elyasproject10-arch/aiBOT.git /root/aiBOT`,
      desc: 'کلون کردن پروژه جدید aiBOT دقیقا در فولدر مستقل /root/aiBOT.'
    },
    {
      title: '۳. اجرای اسکریپت استقرار خودکار و ساخت سرویس اختصاصی aibot',
      cmd: `cd /root/aiBOT\nbash deploy.sh`,
      desc: 'راه‌اندازی خودکار محیط مجازی پایتون (venv) و سرویس‌دهی پس‌زمینه بدون تداخل با پورت‌های دیگر.'
    },
    {
      title: '۴. بررسی وضعیت سرویس اختصاصی جدید',
      cmd: `systemctl status aibot.service --no-pager || systemctl status gptbot.service --no-pager`,
      desc: 'مشاهده سلامت اجرای پروسس ربات در پس‌زمینه لینوکس.'
    }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          راهنمای استقرار و تعویض ربات در سرور مجازی (VPS)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          مخزن جدید: <code className="text-sky-400 font-mono">https://github.com/elyasproject10-arch/aiBOT</code> در مسیر اختصاصی <code className="text-emerald-400 font-mono">/root/aiBOT</code>
        </p>
      </div>

      {/* Safety Alert */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300 font-semibold block mb-1">حفاظت کامل از سایر ربات‌های فعال روی سرور:</strong>
          این دستورات صرفاً و منحصراً پوشه و پروسس ربات مشخص‌شده را تغییر می‌دهند و به هیچ‌کدام از پوشه‌ها، سرویس‌ها، دیتابیس‌ها و ربات‌های دیگر شما در سرور دست نمی‌زنند.
        </div>
      </div>

      {/* Quick 1-Click Run Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-xs text-indigo-200">دستور یک‌خطی مستقیم (کپی و Paste در ترمینال)</h3>
          </div>
          <button
            onClick={() => copyToClipboard(oneLiner, 999)}
            className="flex items-center gap-1 text-[11px] text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm"
          >
            {copiedIndex === 999 ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>کپی کل دستورات</span>
              </>
            )}
          </button>
        </div>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
          {oneLiner}
        </div>
      </div>

      {/* PayPing myShop Product Configuration Note */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-2">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
          <GitBranch className="w-4 h-4" />
          <span>پیکربندی لینک‌های مستقیم PayPing (آیتم مالی myShop/product)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          برای هر پلنی که در صفحه <code className="text-sky-300 font-mono">https://app.payping.ir/myShop/product/create</code> می‌سازید، در منوی <b>«پلن‌ها و قیمت‌گذاری»</b> دکمه <b>«ویرایش پلن و لینک»</b> را بزنید و آدرس لینک مستقیم محصول را وارد کنید. ربات در هنگام خرید به‌جای ایجاد فاکتور موقت، مستقیماً دکمه پرداخت اختصاصی همان محصول پی‌پینگ را برای خریدار ارسال خواهد کرد!
        </p>
      </div>

      {/* Step by step terminal commands */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-200">{step.title}</h3>
              <button
                onClick={() => copyToClipboard(step.cmd, idx)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer transition-colors"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>کپی</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">{step.desc}</p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/90 font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre">
              {step.cmd}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
