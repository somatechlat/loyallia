export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  tenant_name: string;
  date_joined: string;
  is_active: boolean;
  is_email_verified: boolean;
  phone_number: string;
  is_phone_verified: boolean;
}
