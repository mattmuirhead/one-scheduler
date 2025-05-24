import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase, getUserTenants } from '../lib/supabase';
import { storage } from '../utils/storage';
import type { Tenant, UserRole, UserTenant, TenantContextType } from '../types/tenant';

const TenantContext = createContext<TenantContextType | null>(null);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setUserTenants([]);
        setCurrentTenant(null);
        setUserRole(null);
        storage.clearCurrentTenant();
        return;
      }

      const { tenants, error: tenantsError } = await getUserTenants(data.user.id);
      if (tenantsError) throw tenantsError;

      setUserTenants(tenants);

      // Check if there's a stored tenant preference
      const storedTenantSlug = storage.getCurrentTenant();

      if (storedTenantSlug && tenants.length > 0) {
        // Find the tenant that matches the stored slug
        const matchingTenant = tenants.find((t) => t.tenant.slug === storedTenantSlug);

        if (matchingTenant) {
          setCurrentTenant(matchingTenant.tenant);
          setUserRole(matchingTenant.role as UserRole);
          return;
        }
      }

      // If no stored preference or it's invalid, use the first tenant if available
      if (tenants.length > 0) {
        setCurrentTenant(tenants[0].tenant);
        setUserRole(tenants[0].role as UserRole);

        // Store this selection
        storage.setCurrentTenant(tenants[0].tenant.slug);
      }
    } catch (err) {
      console.error('Error refreshing tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  // Function to set the current tenant with persistence
  const selectTenant = (tenantSlug: string) => {
    const tenant = userTenants.find((t) => t.tenant.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant.tenant);
      setUserRole(tenant.role as UserRole);
      storage.setCurrentTenant(tenant.tenant.slug);
    }
  };

  // Clear tenant on user signout
  useEffect(() => {
    const handleAuthChange = (event: 'SIGNED_IN' | 'SIGNED_OUT') => {
      if (event === 'SIGNED_OUT') {
        storage.clearCurrentTenant();
        setCurrentTenant(null);
        setUserRole(null);
        setUserTenants([]);
      }
    };

    const { data } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      data?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshTenants();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        userRole,
        userTenants,
        loading,
        error,
        setCurrentTenant,
        selectTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
