export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  date_joined: string;
  is_active: boolean;
  is_email_verified: boolean;
  phone_number: string;
  is_phone_verified: boolean;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  total_visits: number;
  total_spent: string;
  last_visit: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  card_type: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Transaction {
  id: string;
  transaction_type: string;
  amount: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  is_trial: boolean;
  trial_end: string | null;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  total: number;
  count: number;
  items: T[];
  next_cursor: string | null;
}
