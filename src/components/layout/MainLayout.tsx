import { Layout, Menu, Button, Typography, Spin, Dropdown, Avatar, message } from 'antd';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  HomeOutlined,
  LogoutOutlined,
  ScheduleOutlined,
  UserOutlined,
  BankOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { signOut, getCurrentUser } from '../../lib/supabase';
import styles from './MainLayout.module.scss';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { currentTenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [user, setUser] = useState(null);
  console.log(user)

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, []);

  // Handle tenant mismatch or errors
  if (!currentTenant && !tenantLoading) {
    return <Navigate to="/tenant/setup" replace />;
  }

  if (tenantSlug !== currentTenant?.slug && !tenantLoading) {
    return <Navigate to={`/${currentTenant?.slug}/dashboard`} replace />;
  }

  if (tenantError) {
    message.error(tenantError);
    return <Navigate to="/tenant/setup" replace />;
  }

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

  // Create user menu items for dropdown
  const userMenuItems = [
    {
      key: 'email',
      label: <Text style={{ color: 'rgba(0, 0, 0, 0.45)' }}>{user?.email}</Text>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout,
      danger: true,
    },
  ];

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
              },
              {
                key: 'classrooms',
                icon: <BankOutlined />,
                label: <Link to={`/${currentTenant.slug}/classrooms`}>Classrooms</Link>,
              }
            ]}
          />
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" className={styles.avatarButton}>
              <Avatar src={user?.user_metadata?.avatar_url} icon={<UserOutlined />} />
              <DownOutlined className={styles.dropdownIcon} />
            </Button>
          </Dropdown>
        </div>
      </Header>
      <Content className={styles.content}>
        {children}
      </Content>
    </Layout>
  );
};

export default MainLayout;

