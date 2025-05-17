import { Layout, Menu, Button, Typography, Tag, Spin } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  LogoutOutlined,
  ScheduleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { signOut } from '../../lib/supabase';
import styles from './MainLayout.module.scss';

const { Header, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTenant, userRole } = useTenant();

  // Ensure tenant is available
  useEffect(() => {
    if (!currentTenant) {
      navigate('/tenant/setup');
    }
  }, [currentTenant, navigate]);

  // Get the current path for menu selection
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Add loading state when tenant isn't available
  if (!currentTenant) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.titleSection}>
              <Title level={3} className={styles.title}>
                <ScheduleOutlined /> {currentTenant?.name}
              </Title>
              {userRole && (
                <Tag color="blue" icon={<TeamOutlined />} className={styles.roleTag}>
                  {userRole}
                </Tag>
              )}
            </div>
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[currentPath]}
            className={styles.menu}
            items={[
              {
                key: 'dashboard',
                icon: <HomeOutlined />,
                label: <Link to={`/${currentTenant.slug}/dashboard`}>Dashboard</Link>,
              }
            ]}
          />
          <Button type="link" icon={<LogoutOutlined />} onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </Header>
      <Content className={styles.content}>
        {children}
      </Content>
    </Layout>
  );
};

export default MainLayout;

