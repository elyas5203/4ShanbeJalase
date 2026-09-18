import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { UsersView } from './components/UsersView';
import { ProductsView } from './components/ProductsView';
import { PlansView } from './components/PlansView';
import { PaymentsView } from './components/PaymentsView';
import { BotSimulatorView } from './components/BotSimulatorView';
import { SettingsView } from './components/SettingsView';
import { DeploymentGuideView } from './components/DeploymentGuideView';

import { StorageService } from './services/storage';
import { Product, Plan, User, Subscription, Payment, SystemSettings, DashboardStats, ActivityLog, SubscriptionStatus } from './types';
import { Bell, RefreshCw, Bot } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedProductIdForPlans, setSelectedProductIdForPlans] = useState<number | undefined>(undefined);

  // Application Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getCachedSettings());
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    today_sales: 0,
    month_sales: 0,
    total_sales: 0,
    active_users: 0,
    pending_activation: 0,
    expired_users: 0,
    expiring_soon: 0,
    total_users: 0,
  });

  const refreshAllData = async () => {
    const [freshProducts, freshPlans, freshUsers, freshSubscriptions, freshPayments, freshSettings, freshStats] = await Promise.all([
      StorageService.getProducts(),
      StorageService.getPlans(),
      StorageService.getUsers(),
      StorageService.getSubscriptions(),
      StorageService.getPayments(),
      StorageService.getSettings(),
      StorageService.getStats(),
    ]);
    setProducts(freshProducts);
    setPlans(freshPlans);
    setUsers(freshUsers);
    setSubscriptions(freshSubscriptions);
    setPayments(freshPayments);
    setSettings(freshSettings);
    setLogs(StorageService.getLogs());
    setStats(freshStats);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Handlers
  const handleQuickActivate = async (subId: number) => {
    await StorageService.activateSubscription(subId, plans);
    await refreshAllData();
  };

  const handleActivateWithNotes = async (subId: number, adminNotes: string) => {
    await StorageService.activateSubscription(subId, plans, adminNotes);
    await refreshAllData();
  };

  const handleExtend = async (subId: number, days: number, adminNotes?: string) => {
    await StorageService.extendSubscription(subId, days, adminNotes);
    await refreshAllData();
  };

  const handleUpdateStatus = async (subId: number, status: SubscriptionStatus, notes?: string) => {
    await StorageService.updateSubscriptionStatus(subId, status, notes);
    await refreshAllData();
  };

  const handleCreateProduct = async (product: Omit<Product, 'id'>) => {
    await StorageService.createProduct(product);
    await refreshAllData();
  };

  const handleUpdateProduct = async (id: number, patch: Partial<Omit<Product, 'id'>>) => {
    await StorageService.updateProduct(id, patch);
    await refreshAllData();
  };

  const handleDeleteProduct = async (id: number) => {
    await StorageService.deleteProduct(id);
    await refreshAllData();
  };

  const handleCreatePlan = async (plan: Omit<Plan, 'id'>) => {
    await StorageService.createPlan(plan);
    await refreshAllData();
  };

  const handleUpdatePlan = async (id: number, patch: Partial<Omit<Plan, 'id'>>) => {
    await StorageService.updatePlan(id, patch);
    await refreshAllData();
  };

  const handleDeletePlan = async (id: number) => {
    await StorageService.deletePlan(id);
    await refreshAllData();
  };

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    await StorageService.saveSettings(newSettings);
    await refreshAllData();
  };

  const handleSimulatePurchase = (params: {
    productId: number;
    planId: number;
    platform: 'telegram' | 'bale';
    customerInfo: Record<string, string>;
  }) => {
    StorageService.simulatePurchase(params, products, plans);
    refreshAllData();
  };

  const handleNavigateToPlans = (productId: number) => {
    setSelectedProductIdForPlans(productId);
    setCurrentTab('plans');
  };

  const pendingSubs = subscriptions.filter((s) => s.status === 'PENDING_ACTIVATION');
  const expiringSubs = subscriptions.filter((s) => {
    if (s.status !== 'ACTIVE' || !s.end_date) return false;
    const diff = (new Date(s.end_date).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 5;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingCount={pendingSubs.length}
        expiringCount={expiringSubs.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        {/* Top Navbar */}
        <header className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">
              {currentTab === 'dashboard' && 'نمای کلی و آمار سیستم'}
              {currentTab === 'subscriptions' && 'مدیریت و تمدید اشتراک‌ها'}
              {currentTab === 'users' && 'بانک اطلاعاتی مشتریان'}
              {currentTab === 'products' && 'محصولات اشتراکی قابل فروش در ربات'}
              {currentTab === 'plans' && 'پلن‌ها و تعرفه‌ها'}
              {currentTab === 'payments' && 'سوابق پرداخت PayPing'}
              {currentTab === 'simulator' && 'تست و شبیه‌ساز خرید در ربات تلگرام و بله'}
              {currentTab === 'settings' && 'پیکربندی توکن‌ها و پیام‌ها'}
              {currentTab === 'deployment' && 'دستورات داکر و استقرار روی سرور VPS'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="top-btn-simulator"
              onClick={() => setCurrentTab('simulator')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium cursor-pointer transition-all"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              تست ربات خریدار
            </button>

            <button
              id="top-btn-clean-fresh"
              onClick={() => {
                if (window.confirm('آیا از پاک‌سازی تمامی اطلاعات تستی و بازنشانی به حالت خام (Fresh) اطمینان دارید؟')) {
                  StorageService.resetToFreshState();
                  refreshAllData();
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer transition-all"
              title="پاک‌سازی کامل اطلاعات تستی و بازنشانی"
            >
              پاک‌سازی داده‌های فیک (Fresh)
            </button>

            <button
              id="top-btn-refresh"
              onClick={refreshAllData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {pendingSubs.length > 0 && (
              <button
                onClick={() => setCurrentTab('subscriptions')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer animate-pulse"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{pendingSubs.length} فعال‌سازی فوری</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              pendingSubs={pendingSubs}
              expiringSubs={expiringSubs}
              recentPayments={payments}
              logs={logs}
              onQuickActivate={handleQuickActivate}
              onNavigateToSubscriptions={() => setCurrentTab('subscriptions')}
              onNavigateToSimulator={() => setCurrentTab('simulator')}
            />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              onActivate={handleActivateWithNotes}
              onExtend={handleExtend}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {currentTab === 'users' && (
            <UsersView users={users} subscriptions={subscriptions} />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onNavigateToPlans={handleNavigateToPlans}
            />
          )}

          {currentTab === 'plans' && (
            <PlansView
              plans={plans}
              products={products}
              selectedProductId={selectedProductIdForPlans}
              onCreatePlan={handleCreatePlan}
              onUpdatePlan={handleUpdatePlan}
              onDeletePlan={handleDeletePlan}
            />
          )}

          {currentTab === 'payments' && <PaymentsView payments={payments} />}

          {currentTab === 'simulator' && (
            <BotSimulatorView
              products={products}
              plans={plans}
              onSimulatePurchase={handleSimulatePurchase}
              onNavigateToSubscriptions={() => setCurrentTab('subscriptions')}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView settings={settings} onSaveSettings={handleSaveSettings} />
          )}

          {currentTab === 'deployment' && <DeploymentGuideView />}
        </main>
      </div>
    </div>
  );
}
