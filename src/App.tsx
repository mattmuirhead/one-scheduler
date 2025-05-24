import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp, Spin, Typography } from 'antd';
// Ant Design v5 doesn't require CSS imports as it uses CSS-in-JS
// For custom styles, we still use our own CSS file

import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import AuthCallback from './components/auth/AuthCallback';
import TenantSetup from './components/tenant/TenantSetup';
import Dashboard from './components/Dashboard';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './routes/PrivateRoute';
import { TenantProvider } from './contexts/TenantContext';
import { getCurrentUser } from './lib/supabase';
import type { User } from './types/auth';
import './App.css';
import styles from './App.module.scss';

function App() {
  const [_user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Spin size="large" />
          <Typography.Text>Loading application...</Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        // Use default algorithm with customized token
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontSize: 14,
        },
        components: {
          Layout: {
            bodyBg: '#f0f2f5',
          },
          Card: {
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          },
        },
      }}
    >
      <AntApp className={styles.mainLayout}>
        <TenantProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Protected routes */}
              <Route
                path="/tenant/setup"
                element={
                  <PrivateRoute>
                    <TenantSetup />
                  </PrivateRoute>
                }
              />

              {/* Tenant-specific routes with MainLayout */}
              <Route
                path="/:tenantSlug?/*"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Routes>
                        <Route path="dashboard" element={<Dashboard />} />
                        {/* <Route index element={<Navigate to="dashboard" replace />} /> */}
                      </Routes>
                    </MainLayout>
                  </PrivateRoute>
                }
              />

              {/* Default routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </TenantProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
