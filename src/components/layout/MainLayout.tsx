import { Layout, Menu, Typography, Spin, message, theme } from 'antd';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  HomeOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TeamOutlined,
  ReadOutlined,
  MehOutlined,
} from '@ant-design/icons';
import { useTenant } from '../../contexts/TenantContext';
import { signOut } from '../../lib/supabase';
import styles from './MainLayout.module.scss';
import React from 'react';

const { Content, Sider } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { currentTenant, loading: tenantLoading, error: tenantError } = useTenant();

  // Get the current path for menu selection
  const currentPath = location.pathname.replace(`/${currentTenant?.slug}/`, '') || 'dashboard';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const items = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: <Link to={`/${currentTenant?.slug}/dashboard`}>Dashboard</Link>,
    },
    {
      key: 'rooms',
      icon: <ReadOutlined />,
      label: <Link to={`/${currentTenant?.slug}/rooms`}>Rooms</Link>,
      children: [
        {
          key: 'rooms/add',
          label: <Link to={`/${currentTenant?.slug}/rooms/add`}>Add</Link>,
        },
        {
          key: 'rooms/upload',
          label: <Link to={`/${currentTenant?.slug}/rooms/upload`}>Upload</Link>,
        },
      ],
    },
    {
      key: 'staff',
      icon: <TeamOutlined />,
      label: <Link to={`/${currentTenant?.slug}/staff`}>Staff</Link>,
      children: [
        {
          key: 'staff/add',
          label: <Link to={`/${currentTenant?.slug}/staff/add`}>Add</Link>,
        },
        {
          key: 'staff/upload',
          label: <Link to={`/${currentTenant?.slug}/staff/upload`}>Upload</Link>,
        },
      ],
    },
    {
      key: 'students',
      icon: <MehOutlined />,
      label: <Link to={`/${currentTenant?.slug}/students`}>Students</Link>,
      children: [
        {
          key: 'students/add',
          label: <Link to={`/${currentTenant?.slug}/students/add`}>Add</Link>,
        },
        {
          key: 'students/upload',
          label: <Link to={`/${currentTenant?.slug}/students/upload`}>Upload</Link>,
        },
      ],
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: 'signout',
          label: (
            <Link to="/" onClick={handleLogout}>
              Sign Out
            </Link>
          ),
        },
      ],
    },
  ];

  // Add loading state when tenant isn't available
  if (!currentTenant) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

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

  return (
    <Layout className={styles.layout}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <Title level={3} className={styles.title} style={{ color: colorBgContainer, padding: 24 }}>
          <ScheduleOutlined /> {currentTenant?.name}
        </Title>
        <Menu theme="dark" mode="inline" defaultSelectedKeys={[currentPath]} items={items} />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
