import { Select, Spin, Typography } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import styles from './TenantSwitcher.module.scss';

const { Text } = Typography;

const TenantSwitcher = () => {
  const navigate = useNavigate();
  const { currentTenant, userTenants, loading, selectTenant } = useTenant();

  const handleTenantChange = (tenantSlug: string) => {
    selectTenant(tenantSlug);
    navigate(`/tenant/${tenantSlug}/dashboard`);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="small" />
      </div>
    );
  }

  if (userTenants.length <= 1) {
    return null;
  }

  return (
    <div className={styles.switcher}>
      <Text className={styles.label}>School:</Text>
      <Select
        value={currentTenant?.slug}
        onChange={handleTenantChange}
        loading={loading}
        className={styles.select}
        suffixIcon={<TeamOutlined />}
      >
        {userTenants.map(ut => (
          <Select.Option key={ut.tenant.slug} value={ut.tenant.slug}>
            {ut.tenant.name}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

export default TenantSwitcher;
