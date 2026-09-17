import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  Package,
  Sliders,
  Terminal,
  Bot,
  ShieldCheck,
  Bell
} from 'lucide-react';

export type TabType = 
  | 'dashboard'
  | 'subscriptions'
  | 'users'
  | 'products'
  | 'plans'
  | 'payments'
  | 'simulator'
  | 'settings'
  | 'deployment';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  pendingCount: number;
  expiringCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingCount,
  expiringCount,
}) => {
  const menuItems = [
    { id: 'dashboard' as TabType, label: 'داشبورد و آمار', icon: LayoutDashboard },
    { 
      id: 'subscriptions' as TabType, 
      label: 'مدیریت اشتراک‌ها', 
      icon: ShieldCheck, 
      badge: pendingCount > 0 ? `${pendingCount} فعال‌سازی` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    { id: 'users' as TabType, label: 'لیست کاربران', icon: Users },
    { id: 'products' as TabType, label: 'محصولات سازمانی', icon: Package },
    { id: 'plans' as TabType, label: 'پلن‌ها و قیمت‌ها', icon: Layers },
    { id: 'payments' as TabType, label: 'تراکنش‌های PayPing', icon: CreditCard },
    { id: 'simulator' as TabType, label: 'شبیه‌ساز بات (تست)', icon: Bot, isNew: true },
    { id: 'settings' as TabType, label: 'توکن‌ها و تنظیمات', icon: Sliders },
    { id: 'deployment' as TabType, label: 'استقرار روی VPS (داکر)', icon: Terminal },
  ];

  return (
    <aside className="w-64 bg-slate-950/70 backdrop-blur-md border-l border-slate-800/80 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
            SaaS
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight">مدیریت اشتراک سازمانی</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">ChatGPT & Gemini Hub</p>
          </div>
        </div>

        {/* Quick Expiry Notice Banner */}
        {expiringCount > 0 && (
          <div className="mx-3 mt-3 p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-400 shrink-0" />
            <span><b>{expiringCount}</b> اشتراک در آستانه انقضا</span>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`menu-item-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {item.isNew && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    تست زنده
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            هسته سیستم فعال
          </span>
          <span className="text-[11px] font-mono text-slate-500">v1.0.0</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">پایگاه داده مشترک تلگرام و بله</p>
      </div>
    </aside>
  );
};
