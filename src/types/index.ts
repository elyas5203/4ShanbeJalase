export interface RequiredField {
  key: string;
  label: string;
  type: 'text' | 'phone' | 'email';
  required: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  required_fields: RequiredField[];
}

export interface Plan {
  id: number;
  product_id: number;
  name: string;
  duration_days: number;
  price: number; // Toman
  payping_product_url?: string; // Direct link created in https://app.payping.ir/myShop/product/create
  payping_product_code?: string; // Unique product code or ID in PayPing
  is_active: boolean;
  display_order: number;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  telegram_id?: string;
  bale_id?: string;
  created_at: string;
  subscriptions_count?: number;
}

export type SubscriptionStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  id: number;
  user_id: number;
  product_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  source_platform: 'telegram' | 'bale';
  customer_info: Record<string, string>;
  start_date?: string;
  end_date?: string;
  admin_notes?: string;
  auto_renew_count: number;
  created_at: string;
  
  // Joined fields for display
  user?: User;
  product?: Product;
  plan?: Plan;
}

export interface Payment {
  id: number;
  subscription_id: number;
  user_id: number;
  user_name?: string;
  user_phone?: string;
  amount: number;
  client_ref_id: string;
  payment_code?: string;
  ref_id?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
  paid_at?: string;
}

export interface SystemSettings {
  telegram_token: string;
  bale_token: string;
  admin_telegram_chat_id: string;
  payping_token: string;
  payping_return_url: string;
  test_mode: boolean;
  welcome_msg: string;
  reminder_5d_msg: string;
  reminder_3d_msg: string;
  reminder_exp_msg: string;
  admin_expired_msg: string;
}

export interface DashboardStats {
  today_sales: number;
  month_sales: number;
  total_sales: number;
  active_users: number;
  pending_activation: number;
  expired_users: number;
  expiring_soon: number;
  total_users: number;
}

export interface ActivityLog {
  id: string;
  type: 'sale' | 'activation' | 'renewal' | 'reminder';
  title: string;
  description: string;
  timestamp: string;
}
