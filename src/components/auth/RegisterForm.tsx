import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Card, Alert, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, GoogleOutlined } from '@ant-design/icons';
import { signUp, signInWithGoogle } from '../../lib/supabase';
import type { RegisterFormData, AuthResponse } from '../../types/auth';
import styles from './Auth.module.scss';

const { Title, Text } = Typography;

const RegisterForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onFinish = async (values: RegisterFormData) => {
    setError(null);
    setLoading(true);

    try {
      // Password matching is now handled by form validation
      const { data: userData, error } = await signUp(values.email, values.password);

      if (error) {
        throw error;
      }

      if (userData.user) {
        // Create a successful auth response
        const response: AuthResponse = {
          success: true,
          message:
            'Registration successful! You can now set up your school or join an existing one.',
        };

        setSuccess(true);

        // Navigate to tenant setup after a short delay
        setTimeout(() => {
          navigate('/tenant/setup', { state: { authResponse: response } });
        }, 3000);
      } else {
        throw new Error('Registration succeeded but no user was returned');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create account. Please try again.');
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
        setError('Failed to sign up with Google. Please try again.');
      }

      setGoogleLoading(false);
    }
  };

  return (
    <Card className={styles.authCard}>
      <Space direction="vertical" size="large" className={styles.formContainer}>
        <Title level={2} className={styles.formTitle}>
          Sign Up
        </Title>

        {error && (
          <Alert
            message="Registration Error"
            description={error}
            type="error"
            showIcon
            closable
            className={styles.errorMessage}
          />
        )}

        {success && (
          <Alert
            message="Registration Successful"
            description="Your account has been created. Please check your email for verification instructions. You'll now be taken to set up your school or join an existing one..."
            type="success"
            showIcon
            banner
            className={styles.successMessage}
          />
        )}

        <Form name="register" onFinish={onFinish} layout="vertical" disabled={success}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
            className={styles.formItem}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 8, message: 'Password must be at least 8 characters long' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                message:
                  'Password must contain at least one uppercase letter, one lowercase letter, and one number',
              },
            ]}
            className={styles.formItem}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The passwords do not match!'));
                },
              }),
            ]}
            className={styles.formItem}
          >
            <Input.Password prefix={<SafetyOutlined />} placeholder="Confirm Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className={styles.submitButton}
            >
              Sign Up
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
          disabled={success}
        >
          Sign up with Google
        </Button>

        <Text className={styles.linkContainer}>
          Already have an account? <Link to="/login">Sign In</Link>
        </Text>
      </Space>
    </Card>
  );
};

export default RegisterForm;
