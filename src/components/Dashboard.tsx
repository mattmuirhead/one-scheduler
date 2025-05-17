import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Space, Card, Avatar, Spin, message } from 'antd';
import { LogoutOutlined, UserOutlined, ScheduleOutlined } from '@ant-design/icons';
import { getCurrentUser, signOut } from '../lib/supabase';
import type { User } from '../types/auth';
import styles from './Dashboard.module.scss';
import commonStyles from '../styles/common.module.scss';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
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

  if (loading) {
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
    <Layout className={commonStyles.pageContainer}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <Title level={3} className={styles.title}>
            <ScheduleOutlined /> One Scheduler
          </Title>
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
                Welcome to One Scheduler
              </Title>
              <Text className={styles.userEmail}>You're signed in as: {user?.email}</Text>
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
