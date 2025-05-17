import type { User as SupabaseUser } from '@supabase/gotrue-js';

// Use the Supabase User type directly
export type User = SupabaseUser;

// Auth state interface
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Form submission interfaces
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  confirmPassword: string;
}

// Response interfaces
export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Re-export all types to ensure they're available
export type { SupabaseUser, User, AuthState, LoginFormData, RegisterFormData, AuthResponse };
