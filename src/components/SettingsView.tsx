import React, { useState } from 'react';
import { Sliders, Save, CheckCircle2, Shield, Bell, Key } from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [form, setForm] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          تنظیمات توکن‌ها و سیستم یادآوری
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          تنظیم اطلاعات اتصال تلگرام، بله، درگاه پرداخت PayPing و متن پیام‌های دوره‌ای تمدید اشتراک
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          تنظیمات با موفقیت ذخیره شد.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* API Tokens Section */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">توکن‌های اتصال ربات‌ها و درگاه</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">توکن ربات تلگرام (Telegram Bot Token):</label>
              <input
                type="text"
                value={form.telegram_token}
                onChange={(e) => setForm({ ...form, telegram_token: e.target.value })}
                placeholder="123456789:ABCdef..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-300 mb-1">
                متن بخش پشتیبانی ربات:
              </label>
              <textarea
                rows={3}
                value={form.support_msg || ''}
                onChange={(e) => setForm({ ...form, support_msg: e.target.value })}
                placeholder="متن، آیدی پشتیبانی و ساعات پاسخ‌گویی را اینجا وارد کنید."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">توکن ربات بله (Bale Bot Token):</label>
              <input
                type="text"
                value={form.bale_token}
                onChange={(e) => setForm({ ...form, bale_token: e.target.value })}
                placeholder="987654321:XYZabc..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">شناسه تلگرام ادمین (Admin Chat ID):</label>
              <input
                type="text"
                value={form.admin_telegram_chat_id}
                onChange={(e) => setForm({ ...form, admin_telegram_chat_id: e.target.value })}
                placeholder="مثلاً: 123456789"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">جهت دریافت اعلانات فروش جدید و انقضای اشتراک‌ها</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">توکن درگاه PayPing:</label>
              <input
                type="text"
                value={form.payping_token}
                onChange={(e) => setForm({ ...form, payping_token: e.target.value })}
                placeholder="توکن دریافت شده از پنل پی‌پینگ"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Reminders & Messages Templates Section */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">قالب پیام‌ها و متن خوش‌آمدگویی ربات</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-300 mb-1">
                متن پیام خوش‌آمدگویی استارت ربات (/start):
              </label>
              <textarea
                rows={3}
                value={form.welcome_msg || ''}
                onChange={(e) => setForm({ ...form, welcome_msg: e.target.value })}
                placeholder="سلام {name} عزیز! به سیستم خرید اشتراک هوش مصنوعی خوش آمدید..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 font-sans"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                می‌توانید از متغیر <code className="text-indigo-400 font-mono">{'{name}'}</code> برای درج خودکار نام کاربر تلگرام استفاده کنید.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">پیام یادآوری ۵ روز مانده به انقضا (ارسال به کاربر + ادمین):</label>
              <textarea
                rows={2}
                value={form.reminder_5d_msg}
                onChange={(e) => setForm({ ...form, reminder_5d_msg: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">پیام یادآوری ۳ روز مانده به انقضا (ارسال به کاربر):</label>
              <textarea
                rows={2}
                value={form.reminder_3d_msg}
                onChange={(e) => setForm({ ...form, reminder_3d_msg: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">پیام روز پایان اشتراک (ارسال به کاربر):</label>
              <textarea
                rows={2}
                value={form.reminder_exp_msg}
                onChange={(e) => setForm({ ...form, reminder_exp_msg: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">پیام اقدام فوری ۲ روز پس از انقضا به ادمین (جهت قطع دسترسی Workspace):</label>
              <textarea
                rows={2}
                value={form.admin_expired_msg}
                onChange={(e) => setForm({ ...form, admin_expired_msg: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            id="btn-save-settings"
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            ذخیره کلیه تنظیمات
          </button>
        </div>
      </form>
    </div>
  );
};
