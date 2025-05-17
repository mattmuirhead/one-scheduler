import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Layout, Typography, Button, Space, Card, Avatar, Spin, message, Tag } from 'antd';
import { 
  LogoutOutlined, 
  UserOutlined, 
  ScheduleOutlined,
  TeamOutlined 
} from '@ant-design/icons';
import { getCurrentUser, signOut } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import type { User } from '../types/auth';
import styles from './Dashboard.module.scss';
import commonStyles from '../styles/common.module.scss';
import TenantSwitcher from './tenant/TenantSwitcher';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
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

  const handleLogout = async () => {
    try {
      await signOut();
      message.success('Successfully logged out');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      message.error('Failed to log out');
    }
  };

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
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.titleSection}>
              <Title level={3} className={styles.title}>
                <ScheduleOutlined /> {currentTenant.name}
              </Title>
              <Tag color="blue" icon={<TeamOutlined />} className={styles.roleTag}>
                {userRole}
              </Tag>
            </div>
            <TenantSwitcher />
          </div>
          <Button type="link" icon={<LogoutOutlined />} onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </Header>
      <Content className={styles.content}>
        <Card>
          <Space direction="vertical" size="large" className={styles.spaceContainer}>
            <div className={styles.welcomeSection}>
              <Avatar size={64} icon={<UserOutlined />} className={styles.avatar} />
              <Title level={2} className={styles.welcomeTitle}>
                Welcome to {currentTenant.name}
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
