import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spin, Result, Typography } from 'antd';
import { handleAuthCallback, getCurrentUser, getUserTenants } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import type { AuthResponse } from '../../types/auth';
import styles from './Auth.module.scss';
import commonStyles from '../../styles/common.module.scss';

const { Text } = Typography;

/**
 * Component that handles OAuth callbacks (e.g., from Google sign-in)
 * Shows loading state while processing the auth response
 * Redirects to dashboard on success or shows error messages
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { refreshTenants } = useTenant();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('Completing authentication...');

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Process the OAuth callback
        const { session, error } = await handleAuthCallback();

        if (error) {
          throw error;
        }

        if (session) {
          // Create auth response for state
          const authResponse: AuthResponse = {
            success: true,
            message: 'Authentication successful!',
          };

          setStatusMessage('Checking your account...');
          
          // Get current user
          const user = await getCurrentUser();
          if (!user) {
            throw new Error('No user found after authentication');
          }
          
          // Refresh tenants in context
          await refreshTenants();
          
          // Check if the user has any existing tenants
          setStatusMessage('Checking your schools...');
          const { tenants, error: tenantsError } = await getUserTenants(user.id);
          
          if (tenantsError) {
            throw tenantsError;
          }

          // Decide where to redirect based on tenant status
          setTimeout(() => {
            if (tenants.length === 0) {
              // No tenants, redirect to tenant setup
              navigate('/tenant/setup', {
                state: { authResponse },
                replace: true,
              });
            } else {
              // User has tenants, redirect to the first tenant's dashboard
              const firstTenant = tenants[0].tenant;
              navigate(`/tenant/${firstTenant.slug}/dashboard`, {
                state: { authResponse },
                replace: true,
              });
            }
          }, 1000); // Short delay to show success state
        } else {
          throw new Error('No session found after authentication');
        }
      } catch (err) {
        console.error('Error processing auth callback:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to complete authentication. Please try again.'
        );
      } finally {
        setIsProcessing(false);
      }
    };

    processAuthCallback();
  }, [navigate, refreshTenants]);

  if (isProcessing) {
    return (
      <Card className={styles.callbackContainer}>
        <div className={commonStyles.loadingContent}>
          <Spin size="large" />
          <Text strong>{statusMessage}</Text>
          <Text>Please wait while we complete this process...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Authentication Failed"
        subTitle={error}
        extra={[
          <button key="login" onClick={() => navigate('/login')} className={styles.backButton}>
            Back to Login
          </button>,
        ]}
      />
    );
  }

  // Success state (will redirect shortly)
  return (
    <Result
      status="success"
      title="Authentication Successful"
      subTitle="You are being redirected..."
    />
  );
};

export default AuthCallback;
