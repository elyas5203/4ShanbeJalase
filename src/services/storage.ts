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
  support_msg: '📞 <b>پشتیبانی و سوالات:</b>\n\nبرای فعال‌سازی، تمدید یا دریافت راهنمایی با پشتیبانی در ارتباط باشید.',
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

  // --- Operational data (real backend database — shared with the bots) ---

  static async getUsers(): Promise<User[]> {
    return apiFetch('/api/admin/users');
  }

  static saveUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  static async getSubscriptions(): Promise<Subscription[]> {
    return apiFetch('/api/admin/subscriptions');
  }

  static saveSubscriptions(subs: Subscription[]): void {
    const plain = subs.map(({ user, product, plan, ...rest }) => rest);
    this.setItem(STORAGE_KEYS.SUBSCRIPTIONS, plain);
  }

  static async getPayments(): Promise<Payment[]> {
    return apiFetch('/api/admin/payments');
  }

  static savePayments(payments: Payment[]): void {
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);
  }

  static getCachedSettings(): SystemSettings {
    return this.getItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  static async getSettings(): Promise<SystemSettings> {
    const local = this.getItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const backendSettings = await apiFetch('/api/admin/settings');
    const merged = { ...local, ...backendSettings };
    this.setItem(STORAGE_KEYS.SETTINGS, merged);
    return merged;
  }

  static async saveSettings(settings: SystemSettings): Promise<void> {
    this.setItem(STORAGE_KEYS.SETTINGS, settings);
    // Persist each setting to backend SQLite database
    const entries = [
      { key: 'welcome_msg', value: settings.welcome_msg || '' },
      { key: 'support_msg', value: settings.support_msg || '' },
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

    await Promise.all(entries.map(entry => apiFetch('/api/admin/settings', {
      method: 'POST', body: JSON.stringify(entry),
    })));
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

  static async activateSubscription(subId: number, _plans: Plan[], adminNotes: string = ''): Promise<void> {
    await apiFetch(`/api/admin/subscriptions/${subId}/activate`, {
      method: 'POST', body: JSON.stringify({ admin_notes: adminNotes }),
    });
  }

  static async extendSubscription(subId: number, days: number, adminNotes?: string): Promise<void> {
    await apiFetch(`/api/admin/subscriptions/${subId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE', admin_notes: adminNotes || '', extend_days: days }),
    });
  }

  static async updateSubscriptionStatus(subId: number, status: Subscription['status'], notes?: string): Promise<void> {
    await apiFetch(`/api/admin/subscriptions/${subId}`, {
      method: 'PATCH', body: JSON.stringify({ status, admin_notes: notes || '', extend_days: 0 }),
    });
  }

  static simulatePurchase(params: {
    productId: number;
    planId: number;
    platform: 'telegram' | 'bale';
    customerInfo: Record<string, string>;
  }, products: Product[], plans: Plan[]): { sub: Subscription; payment: Payment } {
    // Simulator data is deliberately isolated from production records.
    const users = this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);

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

    const subs = this.getItem<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);

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
    const payments = this.getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
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

  static async getStats(): Promise<DashboardStats> {
    return apiFetch('/api/admin/stats');
  }

  static resetToFreshState(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTIONS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }
}
