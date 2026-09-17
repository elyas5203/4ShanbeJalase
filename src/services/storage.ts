import { Product, Plan, User, Subscription, Payment, SystemSettings, DashboardStats, ActivityLog } from '../types';

const STORAGE_KEYS = {
  USERS: 'saas_users',
  SUBSCRIPTIONS: 'saas_subscriptions',
  PAYMENTS: 'saas_payments',
  SETTINGS: 'saas_settings',
  LOGS: 'saas_logs',
};

const INITIAL_USERS: User[] = [];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [];

const INITIAL_PAYMENTS: Payment[] = [];

const INITIAL_SETTINGS: SystemSettings = {
  telegram_token: '',
  bale_token: '',
  admin_telegram_chat_id: '',
  payping_token: '',
  payping_return_url: '',
  test_mode: false,
  welcome_msg: 'سلام {name} عزیز! 👋\nبه سیستم خرید اشتراک هوش مصنوعی خوش آمدید.\nجهت مشاهده و خرید اشتراک روی دکمه زیر کلیک فرمایید:',
  reminder_5d_msg: 'اشتراک شما ۵ روز دیگر به پایان می‌رسد. لطفاً جهت تمدید اقدام فرمایید.',
  reminder_3d_msg: 'یادآوری دوم: ۳ روز تا پایان اشتراک شما باقی مانده است.',
  reminder_exp_msg: 'اشتراک شما امروز به پایان می‌رسد.',
  admin_expired_msg: 'اشتراک کاربر X منقضی شده است. لطفاً دسترسی را بررسی و قطع کنید.',
};

const INITIAL_LOGS: ActivityLog[] = [
  { id: '1', type: 'activation', title: 'راه‌اندازی اولیه سیستم', description: 'سیستم آماده اتصال و دریافت سفارش‌های جدید است.', timestamp: new Date().toISOString() }
];

async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export class StorageService {
  private static getItem<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setItem<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  // --- Products (backed by the real backend database — shared with the bots) ---

  static async getProducts(): Promise<Product[]> {
    const data = await apiFetch('/api/admin/products');
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      is_active: p.is_active,
      required_fields: p.required_fields || [],
    }));
  }

  static async createProduct(product: Omit<Product, 'id'>): Promise<void> {
    await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(product) });
  }

  static async updateProduct(id: number, patch: Partial<Omit<Product, 'id'>>): Promise<void> {
    await apiFetch(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }

  static async deleteProduct(id: number): Promise<void> {
    await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  }

  // --- Plans (backed by the real backend database — shared with the bots) ---

  static async getPlans(): Promise<Plan[]> {
    return apiFetch('/api/admin/plans');
  }

  static async createPlan(plan: Omit<Plan, 'id'>): Promise<void> {
    await apiFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(plan) });
  }

  static async updatePlan(id: number, patch: Partial<Omit<Plan, 'id'>>): Promise<void> {
    await apiFetch(`/api/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }

  static async deletePlan(id: number): Promise<void> {
    await apiFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
  }

  // --- Users (local demo data; not yet wired to the real backend) ---

  static getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  static saveUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  static getSubscriptions(products: Product[] = [], plans: Plan[] = []): Subscription[] {
    const subs = this.getItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
    const users = this.getUsers();

    return subs.map(sub => ({
      ...sub,
      user: users.find(u => u.id === sub.user_id),
      product: products.find(p => p.id === sub.product_id),
      plan: plans.find(pl => pl.id === sub.plan_id),
    }));
  }

  static saveSubscriptions(subs: Subscription[]): void {
    const plain = subs.map(({ user, product, plan, ...rest }) => rest);
    this.setItem(STORAGE_KEYS.SUBSCRIPTIONS, plain);
  }

  static getPayments(): Payment[] {
    return this.getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  }

  static savePayments(payments: Payment[]): void {
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);
  }

  static getSettings(): SystemSettings {
    const local = this.getItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    // Fetch latest from backend asynchronously in background
    fetch('/api/admin/settings')
      .then(res => res.ok ? res.json() : null)
      .then(backendSettings => {
        if (backendSettings && Object.keys(backendSettings).length > 0) {
          const merged = { ...local, ...backendSettings };
          this.setItem(STORAGE_KEYS.SETTINGS, merged);
        }
      })
      .catch(() => {});
    return local;
  }

  static saveSettings(settings: SystemSettings): void {
    this.setItem(STORAGE_KEYS.SETTINGS, settings);
    // Persist each setting to backend SQLite database
    const entries = [
      { key: 'welcome_msg', value: settings.welcome_msg || '' },
      { key: 'telegram_token', value: settings.telegram_token || '' },
      { key: 'bale_token', value: settings.bale_token || '' },
      { key: 'admin_telegram_chat_id', value: settings.admin_telegram_chat_id || '' },
      { key: 'payping_token', value: settings.payping_token || '' },
      { key: 'payping_return_url', value: settings.payping_return_url || '' },
      { key: 'reminder_5d_msg', value: settings.reminder_5d_msg || '' },
      { key: 'reminder_3d_msg', value: settings.reminder_3d_msg || '' },
      { key: 'reminder_exp_msg', value: settings.reminder_exp_msg || '' },
      { key: 'admin_expired_msg', value: settings.admin_expired_msg || '' },
    ];

    entries.forEach(entry => {
      fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(err => console.error('Failed to sync setting to backend:', entry.key, err));
    });
  }

  static getLogs(): ActivityLog[] {
    return this.getItem<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  }

  static addLog(type: ActivityLog['type'], title: string, description: string): void {
    const logs = this.getLogs();
    logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      description,
      timestamp: new Date().toISOString()
    });
    this.setItem(STORAGE_KEYS.LOGS, logs.slice(0, 50));
  }

  // --- Actions on the local demo subscriptions/payments ---

  static activateSubscription(subId: number, plans: Plan[], adminNotes: string = ''): Subscription {
    const subs = this.getSubscriptions();
    const sub = subs.find(s => s.id === subId);
    if (!sub) throw new Error('اشتراک یافت نشد');

    const plan = plans.find(p => p.id === sub.plan_id);
    const duration = plan ? plan.duration_days : 30;

    const now = new Date();
    sub.status = 'ACTIVE';
    sub.start_date = now.toISOString();

    const end = new Date(now.getTime() + duration * 86400000);
    sub.end_date = end.toISOString();
    if (adminNotes) {
      sub.admin_notes = adminNotes;
    }

    this.saveSubscriptions(subs);
    this.addLog(
      'activation',
      'فعال‌سازی دستی اشتراک',
      `اشتراک ${sub.product?.name || ''} برای کاربر ${sub.user?.name || ''} تا تاریخ ${end.toLocaleDateString('fa-IR')} فعال شد.`
    );
    return sub;
  }

  static extendSubscription(subId: number, days: number, adminNotes?: string): Subscription {
    const subs = this.getSubscriptions();
    const sub = subs.find(s => s.id === subId);
    if (!sub) throw new Error('اشتراک یافت نشد');

    const currentEnd = sub.end_date ? new Date(sub.end_date) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 86400000);

    sub.end_date = newEnd.toISOString();
    sub.status = 'ACTIVE';
    sub.auto_renew_count = (sub.auto_renew_count || 0) + 1;
    if (adminNotes) {
      sub.admin_notes = adminNotes;
    }

    this.saveSubscriptions(subs);
    this.addLog(
      'renewal',
      'تمدید هوشمند اشتراک',
      `اشتراک ${sub.user?.name || ''} به مدت ${days} روز تمدید شد (تا ${newEnd.toLocaleDateString('fa-IR')}).`
    );
    return sub;
  }

  static updateSubscriptionStatus(subId: number, status: Subscription['status'], notes?: string): void {
    const subs = this.getSubscriptions();
    const sub = subs.find(s => s.id === subId);
    if (sub) {
      sub.status = status;
      if (notes !== undefined) sub.admin_notes = notes;
      this.saveSubscriptions(subs);
      this.addLog('activation', 'تغییر وضعیت اشتراک', `وضعیت اشتراک ${sub.user?.name || ''} به ${status} تغییر یافت.`);
    }
  }

  static simulatePurchase(params: {
    productId: number;
    planId: number;
    platform: 'telegram' | 'bale';
    customerInfo: Record<string, string>;
  }, products: Product[], plans: Plan[]): { sub: Subscription; payment: Payment } {
    const users = this.getUsers();

    const plan = plans.find(p => p.id === params.planId);
    const product = products.find(p => p.id === params.productId);
    if (!plan || !product) throw new Error('پلن یا محصول معتبر نیست.');

    const name = params.customerInfo.name || 'کاربر جدید';
    const phone = params.customerInfo.phone || '';
    const email = params.customerInfo.email || '';

    // Smart user lookup
    let user = users.find(u => (phone && u.phone === phone) || (email && u.email === email));
    if (!user) {
      user = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        name,
        phone,
        email,
        telegram_id: params.platform === 'telegram' ? `sim_${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
        bale_id: params.platform === 'bale' ? `bale_${Math.floor(10000 + Math.random() * 90000)}` : undefined,
        created_at: new Date().toISOString()
      };
      users.push(user);
      this.saveUsers(users);
    }

    const subs = this.getSubscriptions();

    // Check for SMART RENEWAL on active/expiring subscription
    let existingSub = subs.find(s => s.user_id === user!.id && s.product_id === product.id && (s.status === 'ACTIVE' || s.status === 'PENDING_ACTIVATION'));
    let sub: Subscription;

    if (existingSub && existingSub.status === 'ACTIVE' && existingSub.end_date) {
      // Extend end_date directly
      const currentEnd = new Date(existingSub.end_date);
      const newEnd = new Date(currentEnd.getTime() + plan.duration_days * 86400000);
      existingSub.end_date = newEnd.toISOString();
      existingSub.auto_renew_count = (existingSub.auto_renew_count || 0) + 1;
      existingSub.customer_info = params.customerInfo;
      sub = existingSub;
    } else {
      // Create new pending activation
      sub = {
        id: subs.length > 0 ? Math.max(...subs.map(s => s.id)) + 1 : 1,
        user_id: user.id,
        product_id: product.id,
        plan_id: plan.id,
        status: 'PENDING_ACTIVATION',
        source_platform: params.platform,
        customer_info: params.customerInfo,
        auto_renew_count: 0,
        created_at: new Date().toISOString()
      };
      subs.unshift(sub);
    }
    this.saveSubscriptions(subs);

    // Record Payment
    const payments = this.getPayments();
    const clientRefId = `SUB-${sub.id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const refId = `SHAPARAK_${Math.floor(10000000 + Math.random() * 90000000)}`;

    const payment: Payment = {
      id: payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1,
      subscription_id: sub.id,
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      amount: plan.price,
      client_ref_id: clientRefId,
      ref_id: refId,
      status: 'SUCCESS',
      created_at: new Date().toISOString(),
      paid_at: new Date().toISOString()
    };
    payments.unshift(payment);
    this.savePayments(payments);

    this.addLog(
      'sale',
      `پرداخت موفق از ${params.platform === 'telegram' ? 'تلگرام' : 'بله'}`,
      `کاربر ${user.name} پلن ${plan.name} را با مبلغ ${plan.price.toLocaleString('fa-IR')} تومان خریداری کرد.`
    );

    return { sub, payment };
  }

  static getStats(): DashboardStats {
    const subs = this.getSubscriptions();
    const payments = this.getPayments().filter(p => p.status === 'SUCCESS');
    const users = this.getUsers();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = now.toISOString().substring(0, 7);

    const todaySales = payments
      .filter(p => p.paid_at && p.paid_at.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);

    const monthSales = payments
      .filter(p => p.paid_at && p.paid_at.startsWith(monthStr))
      .reduce((sum, p) => sum + p.amount, 0);

    const totalSales = payments.reduce((sum, p) => sum + p.amount, 0);

    const activeUsers = subs.filter(s => s.status === 'ACTIVE').length;
    const pendingActivation = subs.filter(s => s.status === 'PENDING_ACTIVATION').length;
    const expiredUsers = subs.filter(s => s.status === 'EXPIRED').length;

    // Expiring within 5 days
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 86400000);
    const expiringSoon = subs.filter(s => {
      if (s.status !== 'ACTIVE' || !s.end_date) return false;
      const end = new Date(s.end_date);
      return end >= now && end <= fiveDaysFromNow;
    }).length;

    return {
      today_sales: todaySales,
      month_sales: monthSales,
      total_sales: totalSales,
      active_users: activeUsers,
      pending_activation: pendingActivation,
      expired_users: expiredUsers,
      expiring_soon: expiringSoon,
      total_users: users.length
    };
  }

  static resetToFreshState(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTIONS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }
}
