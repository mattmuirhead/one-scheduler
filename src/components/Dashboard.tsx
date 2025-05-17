import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Layout, Typography, Space, Card, Avatar, Spin, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getCurrentUser } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import type { User } from '../types/auth';
import styles from './Dashboard.module.scss';
import commonStyles from '../styles/common.module.scss';

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const { tenantSlug } = useParams()
  const { currentTenant, userRole, loading: tenantLoading, error: tenantError } = useTenant();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading || tenantLoading) {
    return (
      <div className={commonStyles.loadingContainer}>
        <div className={commonStyles.loadingContent}>
          <Spin size="large" />
          <Typography.Text>Loading...</Typography.Text>
        </div>
      </div>
    );
  }

  // Handle tenant mismatch or errors
  if (!currentTenant && !tenantLoading) {
    return <Navigate to="/tenant/setup" replace />;
  }

  if (!tenantSlug && currentTenant && !tenantLoading) {
    return <Navigate to={`/${currentTenant.slug}/dashboard`} replace />;
  }

  if (tenantError) {
    message.error(tenantError);
    return <Navigate to="/tenant/setup" replace />;
  }

  return (
    <Layout className={commonStyles.pageContainer}>
      <Content className={styles.content}>
        <Card>
          <Space direction="vertical" size="large" className={styles.spaceContainer}>
            <div className={styles.welcomeSection}>
              <Avatar size={64} icon={<UserOutlined />} className={styles.avatar} />
              <Title level={2} className={styles.welcomeTitle}>
                Welcome to {currentTenant?.name}
              </Title>
              <Text className={styles.userEmail}>You're signed in as: {user?.email}</Text>
              <Text className={styles.roleInfo}>Role: {userRole}</Text>
            </div>

            <div className={styles.gettingStarted}>
              <Title level={4}>Getting Started</Title>
              <Text>This is your school scheduling dashboard. From here, you'll be able to:</Text>
              <ul className={styles.featureList}>
                <li>Upload information about students, teachers, and rooms</li>
                <li>Define lessons and subjects</li>
                <li>Generate optimized class schedules</li>
                <li>Manage school resources efficiently</li>
              </ul>
              <Text>The complete functionality is still under development.</Text>
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default Dashboard;
