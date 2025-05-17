import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, message, Result, Typography } from 'antd';
import { getCurrentUser } from '../lib/supabase';
import type { User } from '../types/auth';
import styles from './PrivateRoute.module.scss';

// Define the component props interface
interface PrivateRouteProps {
  children: ReactNode;
}

// Extended AuthState for route protection
interface RouteAuthState {
  isAuthenticated: boolean | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const [authState, setAuthState] = useState<RouteAuthState>({
    isAuthenticated: null,
    user: null,
    isLoading: true,
    error: null,
  });
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const user = await getCurrentUser();

        if (isMounted) {
          setAuthState({
            isAuthenticated: !!user,
            user,
            isLoading: false,
            error: null,
          });

          if (!user) {
            message.info('Please log in to access this page');
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);

        if (isMounted) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown authentication error'),
          });

          message.error('Authentication error. Please log in again.');
        }
      }
    };

    checkAuthStatus();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle error state
  if (authState.error && !authState.isLoading) {
    return (
      <Result
        status="error"
        title="Authentication Error"
        subTitle="There was a problem verifying your login status. Please try again."
        extra={<Navigate to="/login" state={{ from: location }} replace />}
      />
    );
  }

  // Check for loading state
  if (authState.isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Spin size="large" />
          <Typography.Text>Checking authentication...</Typography.Text>
        </div>
      </div>
    );
  }

  // Check if not authenticated
  if (!authState.isAuthenticated) {
    // Redirect to login page with the current location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default PrivateRoute;
