// User role enumeration
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STAFF = 'staff',
}

// Base tenant interface
export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier for routing
  code: string; // Invite code for joining
  created_at: string;
  updated_at: string;
}

// User's relationship with a tenant
export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  tenant: Tenant;
}

// Response from tenant creation/join operations
export interface TenantWithRole {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_code: string;
  user_role: UserRole;
}

// Parameters for tenant operations
export interface CreateTenantParams {
  name: string;
  userId: string;
  slug?: string; // Optional since we'll generate it if not provided
}

export interface JoinTenantParams {
  inviteCode: string;
  userId: string;
}

// Form data types
export interface CreateTenantFormData {
  name: string;
}

export interface JoinTenantFormData {
  code: string;
}

export type TenantSetupOption = 'create' | 'join';

// Used during initial tenant setup
export interface TenantSetupData {
  name: string;
  inviteCode?: string;
  createNew: boolean;
}

// Context type for tenant state management
export interface TenantContextType {
  currentTenant: Tenant | null;
  userRole: UserRole | null;
  userTenants: UserTenant[];
  loading: boolean;
  error: string | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  selectTenant: (tenantSlug: string) => void;
  refreshTenants: () => Promise<void>;
}

// Database response types for better type safety
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface UserTenantResponse {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  tenant: TenantResponse;
}
