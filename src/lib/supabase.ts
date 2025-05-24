import { createClient } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';
import type { AuthError, OAuthResponse, Session } from '@supabase/supabase-js';
import type {
  UserTenant,
  CreateTenantParams,
  JoinTenantParams,
  TenantWithRole,
} from '../types/tenant';

// Database error messages
const DB_ERRORS = {
  TENANT_NOT_FOUND: 'School not found',
  NAME_TAKEN: 'School name is already taken',
  INVALID_CODE: 'Invalid invite code',
  ALREADY_MEMBER: 'You are already a member of this school',
  NO_PERMISSION: 'You do not have permission to perform this action',
  CONNECTION_ERROR: 'Could not connect to the database',
} as const;

// Helper function to handle database errors
const handleDbError = (error: unknown): Error => {
  if (error instanceof Error) {
    // Map known error messages to user-friendly ones
    if (error.message.includes('duplicate key')) {
      return new Error(DB_ERRORS.NAME_TAKEN);
    }
    if (error.message.includes('Invalid invite code')) {
      return new Error(DB_ERRORS.INVALID_CODE);
    }
    if (error.message.includes('already a member')) {
      return new Error(DB_ERRORS.ALREADY_MEMBER);
    }
    return error;
  }
  return new Error(DB_ERRORS.CONNECTION_ERROR);
};

// Database response types are now defined in ../types/tenant.ts

// Replace with your Supabase URL and anon key from project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// OAuth redirect URL - Must match the callback URL configured in Supabase dashboard
const redirectUrl = import.meta.env.VITE_REDIRECT_URL || window.location.origin;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are not set. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({
    email,
    password,
  });
};

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

/**
 * Sign in with Google OAuth provider
 * @returns Promise containing OAuth response
 */
export const signInWithGoogle = async (): Promise<OAuthResponse> => {
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

/**
 * Get available OAuth providers
 * @returns Promise containing the list of enabled providers
 */
export const getAuthProviders = async (): Promise<Provider[]> => {
  try {
    // This is an undocumented API that may change, but works for now
    const settings = await supabase.auth.getSettings();
    return settings.data.auth_providers || [];
  } catch (error) {
    console.error('Error fetching auth providers:', error);
    return [];
  }
};

/**
 * Handle OAuth callback and session establishment
 * @returns Session information if auth is complete
 */
export const handleAuthCallback = async (): Promise<{
  session: Session | null;
  error: AuthError | Error | null;
}> => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return { session: data.session, error: null };
  } catch (error) {
    console.error('Error handling auth callback:', error);
    return {
      session: null,
      error: error instanceof Error ? error : new Error('Unknown error during authentication'),
    };
  }
};

// Convert a string to a URL-friendly slug
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

// Check if a tenant name is already taken
export const checkTenantNameAvailable = async (
  name: string
): Promise<{
  available: boolean;
  error: Error | null;
}> => {
  try {
    const slug = slugify(name);
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;

    // Name is available if no data was returned
    return {
      available: !data,
      error: null,
    };
  } catch (err) {
    console.error('Error checking tenant name:', err);
    return {
      available: false,
      error: handleDbError(err),
    };
  }
};

// Create a new tenant and set the user as super admin
export const createTenant = async ({
  name,
  userId,
  slug: providedSlug,
}: CreateTenantParams): Promise<{
  tenant: TenantWithRole | null;
  error: Error | null;
}> => {
  try {
    const slug = providedSlug || slugify(name);

    // Check if name is available
    const { available, error: checkError } = await checkTenantNameAvailable(name);
    if (checkError) throw checkError;
    if (!available) {
      throw new Error(DB_ERRORS.NAME_TAKEN);
    }

    // Call the create_tenant function we defined in SQL
    const { data, error } = await supabase.rpc('create_tenant', {
      tenant_name: name,
      user_id: userId,
      tenant_slug: slug,
    });

    if (error) {
      throw error;
    }

    return { tenant: data as TenantWithRole, error: null };
  } catch (err) {
    console.error('Error creating tenant:', err);
    return {
      tenant: null,
      error: handleDbError(err),
    };
  }
};

// Join an existing tenant using an invite code
export const joinTenant = async ({
  inviteCode,
  userId,
}: JoinTenantParams): Promise<{
  tenant: TenantWithRole | null;
  error: Error | null;
}> => {
  try {
    // Call the join_tenant function we defined in SQL
    const { data, error } = await supabase.rpc('join_tenant', {
      invite_code: inviteCode.toUpperCase(),
      user_id: userId,
    });

    if (error) {
      throw error;
    }

    return { tenant: data as TenantWithRole, error: null };
  } catch (err) {
    console.error('Error joining tenant:', err);
    return {
      tenant: null,
      error: handleDbError(err),
    };
  }
};

// Get all tenants the user is a member of
export const getUserTenants = async (
  userId: string
): Promise<{
  tenants: UserTenant[];
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('user_tenants')
      .select(
        `
        id,
        user_id,
        tenant_id,
        role,
        created_at,
        updated_at,
        tenant:tenants (
          id,
          name,
          slug,
          code,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { tenants: (data || []) as UserTenant[], error: null };
  } catch (err) {
    console.error('Error fetching user tenants:', err);
    return {
      tenants: [],
      error: handleDbError(err),
    };
  }
};
