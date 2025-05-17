import { useState, useEffect } from 'react';
import { Typography, Space, Avatar, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getCurrentUser } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import type { User } from '../types/auth';
import styles from './Dashboard.module.scss';
import commonStyles from '../styles/common.module.scss';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { currentTenant, userRole, loading: tenantLoading } = useTenant();
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

  return (
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
  );
};

export default Dashboard;
