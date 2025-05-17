import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Card, Alert, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { signIn, signInWithGoogle } from '../../lib/supabase';
import type { LoginFormData, AuthResponse } from '../../types/auth';
import styles from './Auth.module.scss';

const { Title, Text } = Typography;

const LoginForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginFormData) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await signIn(values.email, values.password);

      if (error) {
        throw error;
      }

      if (data.user) {
        // Create a successful auth response
        const response: AuthResponse = {
          success: true,
          message: 'Login successful!',
        };

        // Redirect to dashboard after successful login
        navigate('/dashboard', { state: { authResponse: response } });
      } else {
        // This case shouldn't happen with Supabase but handling for completeness
        throw new Error('Login succeeded but no user was returned');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        throw error;
      }

      // The page will redirect to Google's OAuth page
      // and then back to the app after authentication
      // No need to navigate manually
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);

      if (err instanceof Error) {
        setError(`Google sign-in failed: ${err.message}`);
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }

      setGoogleLoading(false);
    }
  };

  return (
    <Card className={styles.authCard}>
      <Space direction="vertical" size="large" className={styles.formContainer}>
        <Title level={2} className={styles.formTitle}>
          Sign In
        </Title>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            className={styles.errorMessage}
          />
        )}

        <Form name="login" initialValues={{ remember: true }} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className={styles.submitButton}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider className={styles.divider}>
          <Text type="secondary">OR</Text>
        </Divider>

        <Button
          icon={<GoogleOutlined />}
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          className={styles.googleButton}
        >
          Sign in with Google
        </Button>

        <Text className={styles.linkContainer}>
          Don't have an account? <Link to="/register">Sign Up</Link>
        </Text>
      </Space>
    </Card>
  );
};

export default LoginForm;
