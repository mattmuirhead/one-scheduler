import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Tabs, Space, Alert, message, Spin } from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  LinkOutlined,
  BuildOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { createTenant, joinTenant, checkTenantNameAvailable, supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import type {
  CreateTenantFormData,
  JoinTenantFormData,
  TenantSetupOption,
} from '../../types/tenant';
import styles from './TenantSetup.module.scss';

const { Title, Text } = Typography;

const TenantSetup = () => {
  const navigate = useNavigate();
  const { refreshTenants, userTenants } = useTenant();
  const [activeTab, setActiveTab] = useState<TenantSetupOption>('create');
  const [loading, setLoading] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<{ name: string; code: string } | null>(null);
  const COUNTDOWN_START = 5; // 5 seconds
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [createForm] = Form.useForm();
  const [joinForm] = Form.useForm();
  const [nameLength, setNameLength] = useState(0);
  const REDIRECT_DELAY = 5000; // 5 seconds

  // Add error type constants
  const ERROR_MESSAGES = {
    NO_USER: 'You must be logged in to perform this action',
    NAME_TAKEN: 'This school name is already taken. Please choose another name.',
    INVALID_CODE: 'Invalid invite code. Please check and try again.',
    SERVER_ERROR: 'There was a problem connecting to the server. Please try again.',
    NAME_CHECK_FAILED: 'Could not verify school name availability. Please try again.',
  } as const;

  const debouncedCheckName = useCallback(
    debounce(async (value: string, validate: (error: Error | null) => void) => {
      try {
        const { available, error } = await checkTenantNameAvailable(value);
        if (error) {
          validate(new Error('Failed to check school name availability'));
          return;
        }
        if (!available) {
          validate(new Error('This school name is already taken'));
          return;
        }
        validate(null);
      } catch (err) {
        validate(err instanceof Error ? err : new Error('Failed to check name'));
      }
    }, 500),
    []
  );

  // Add cleanup for debounced function
  useEffect(() => {
    return () => {
      debouncedCheckName.cancel();
    };
  }, [debouncedCheckName]);

  // Redirect if user already has tenants
  useEffect(() => {
    if (userTenants.length > 0) {
      const firstTenant = userTenants[0].tenant;
      navigate(`/${firstTenant.slug}/dashboard`);
    }
  }, [userTenants, navigate]);

  // Add effect to handle auto-focus
  useEffect(() => {
    // Small delay to ensure the input is mounted
    const timer = setTimeout(() => {
      if (activeTab === 'create') {
        createForm.getFieldInstance('name')?.focus();
      } else {
        joinForm.getFieldInstance('code')?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activeTab, createForm, joinForm]);

  // Add countdown effect when success is true
  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success]);

  // Remove the form watcher effect - we'll use onValuesChange instead

  const handleCreateTenant = async (values: CreateTenantFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error(ERROR_MESSAGES.NO_USER);

      // Check if school name is available
      const { available, error: checkError } = await checkTenantNameAvailable(values.name);
      if (checkError) throw new Error(ERROR_MESSAGES.NAME_CHECK_FAILED);
      if (!available) {
        throw new Error(ERROR_MESSAGES.NAME_TAKEN);
      }

      const { tenant, error: createError } = await createTenant({
        name: values.name,
        userId: data.user.id,
      });

      if (createError) {
        throw createError;
      }

      if (!tenant) {
        throw new Error('Failed to create school');
      }

      await refreshTenants(); // Move this before setting success state

      // Use a small delay to ensure smooth transition
      setTimeout(() => {
        setCreatedTenant({
          name: tenant.name,
          code: tenant.code,
        });
        setSuccess(true);
        message.success('School created successfully!');
      }, 100);

      // Add delayed redirect
      setTimeout(() => {
        const newTenant = userTenants[0]?.tenant;
        if (newTenant) {
          navigate(`/${newTenant.slug}/dashboard`);
        }
      }, REDIRECT_DELAY);
    } catch (err) {
      console.error('Error creating school:', err);
      setError(err instanceof Error ? err.message : 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTenant = async (values: JoinTenantFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error(ERROR_MESSAGES.NO_USER);

      const { error: joinError } = await joinTenant({
        inviteCode: values.code.toUpperCase(), // Transform to uppercase
        userId: data.user.id,
      });

      if (joinError) {
        // Check for specific error types and map to user-friendly messages
        if (joinError.message.includes('not found') || joinError.message.includes('invalid')) {
          throw new Error(ERROR_MESSAGES.INVALID_CODE);
        }
        throw joinError;
      }

      await refreshTenants(); // Move this before setting success state

      // Use a small delay to ensure smooth transition
      setTimeout(() => {
        setSuccess(true);
        message.success('Joined school successfully!');
      }, 100);

      // Add delayed redirect
      setTimeout(() => {
        const newTenant = userTenants[0]?.tenant;
        if (newTenant) {
          navigate(`/${newTenant.slug}/dashboard`);
        }
      }, REDIRECT_DELAY);
    } catch (err) {
      console.error('Error joining school:', err);
      setError(err instanceof Error ? err.message : 'Failed to join school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.setupCard}>
        <Title level={2} className={styles.title}>
          <BuildOutlined /> School Setup
        </Title>
        <Text className={styles.subtitle}>
          Welcome to One Scheduler! Let's get you set up with your school.
        </Text>

        {error && (
          <Alert
            message="Error"
            description={
              <Space direction="vertical">
                <Text>{error}</Text>
                <Button
                  size="small"
                  onClick={() => {
                    setError(null);
                    if (activeTab === 'create') {
                      createForm.submit();
                    } else {
                      joinForm.submit();
                    }
                  }}
                >
                  Try Again
                </Button>
              </Space>
            }
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        {success && (
          <Alert
            message="Success"
            description={
              <div>
                <div>Setup completed!</div>
                {createdTenant && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <Text strong>School Name:</Text> {createdTenant.name}
                    <br />
                    <Text strong>Invite Code:</Text>{' '}
                    <Typography.Text copyable>{createdTenant.code}</Typography.Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Share this invite code with other teachers and staff to let them join your
                      school.
                    </Text>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Spin size="small" /> Redirecting to your dashboard in {countdown}{' '}
                  {countdown === 1 ? 'second' : 'seconds'}...
                </div>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as TenantSetupOption);
            // Reset forms when switching tabs
            if (key === 'create') {
              joinForm.resetFields();
            } else {
              createForm.resetFields();
            }
            // Reset error state
            setError(null);
          }}
          className={styles.tabs}
          items={[
            {
              key: 'create',
              label: (
                <span>
                  <PlusOutlined /> Create New School
                </span>
              ),
              children: (
                <Form
                  form={createForm}
                  layout="vertical"
                  onFinish={handleCreateTenant}
                  disabled={success || loading}
                  onValuesChange={(changedValues) => {
                    if ('name' in changedValues) {
                      setNameLength(changedValues.name?.length || 0);
                    }
                  }}
                >
                  <Form.Item
                    label={
                      <Space>
                        <span>School Name</span>
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                          ({nameLength}/50)
                        </Typography.Text>
                      </Space>
                    }
                    tooltip={{
                      title: (
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          <li>Must be between 3 and 50 characters</li>
                          <li>Can contain letters, numbers, spaces, and hyphens</li>
                          <li>Must be unique across all schools</li>
                        </ul>
                      ),
                      icon: <InfoCircleOutlined />,
                    }}
                    name="name"
                    rules={[
                      { required: true, message: 'Please enter your school name' },
                      { min: 3, message: 'School name must be at least 3 characters' },
                      { max: 50, message: 'School name cannot exceed 50 characters' },
                      {
                        validator: async (_, value) => {
                          if (!value) return;

                          if (!/^[a-zA-Z0-9\s-]+$/.test(value)) {
                            return Promise.reject(
                              new Error(
                                'School name can only contain letters, numbers, spaces, and hyphens'
                              )
                            );
                          }

                          setCheckingName(true);
                          return new Promise((resolve, reject) => {
                            debouncedCheckName(value, (error) => {
                              setCheckingName(false);
                              if (error) {
                                reject(error);
                              } else {
                                resolve();
                              }
                            });
                          });
                        },
                      },
                    ]}
                    validateTrigger={['onBlur']}
                  >
                    <Input
                      prefix={<TeamOutlined />}
                      placeholder="Enter school name"
                      disabled={loading}
                      suffix={checkingName ? <Spin size="small" /> : null}
                      maxLength={50}
                      showCount
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      className={styles.submitButton}
                    >
                      Create School
                    </Button>
                  </Form.Item>

                  <Text className={styles.info}>
                    Creating a new school will make you the super admin.
                  </Text>
                </Form>
              ),
            },
            {
              key: 'join',
              label: (
                <span>
                  <LinkOutlined /> Join Existing School
                </span>
              ),
              children: (
                <Form
                  form={joinForm}
                  layout="vertical"
                  onFinish={handleJoinTenant}
                  disabled={success || loading}
                >
                  <Form.Item
                    label="Invite Code"
                    name="code"
                    tooltip={{
                      title:
                        'The invite code should be 8 characters long, containing only uppercase letters and numbers',
                      icon: <InfoCircleOutlined />,
                    }}
                    rules={[
                      { required: true, message: 'Please enter the invite code' },
                      {
                        pattern: /^[A-Z0-9]{8}$/,
                        message: 'Invite code must be 8 uppercase letters or numbers',
                      },
                    ]}
                  >
                    <Input
                      placeholder="Enter invite code"
                      disabled={loading}
                      style={{ textTransform: 'uppercase' }}
                      maxLength={8}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      className={styles.submitButton}
                    >
                      Join School
                    </Button>
                  </Form.Item>

                  <Text className={styles.info}>
                    Enter the invite code provided by your school administrator.
                  </Text>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default TenantSetup;
