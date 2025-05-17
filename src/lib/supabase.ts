import { createClient } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';
import type { AuthError, OAuthResponse, Session } from '@supabase/supabase-js';

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
