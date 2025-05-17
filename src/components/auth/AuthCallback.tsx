import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spin, Result, Typography } from 'antd';
import { handleAuthCallback } from '../../lib/supabase';
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
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

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

          // Redirect to dashboard after successful auth
          setTimeout(() => {
            navigate('/dashboard', {
              state: { authResponse },
              replace: true,
            });
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
  }, [navigate]);

  if (isProcessing) {
    return (
      <Card className={styles.callbackContainer}>
        <div className={commonStyles.loadingContent}>
          <Spin size="large" />
          <Text strong>Completing authentication...</Text>
          <Text>Please wait while we complete your authentication...</Text>
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
      subTitle="You are being redirected to the dashboard..."
    />
  );
};

export default AuthCallback;
