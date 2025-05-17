const STORAGE_KEYS = {
  CURRENT_TENANT: 'currentTenant',
} as const;

export const storage = {
  setCurrentTenant: (tenantSlug: string) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, tenantSlug);
  },
  
  getCurrentTenant: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_TENANT);
  },
  
  clearCurrentTenant: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
  }
};

