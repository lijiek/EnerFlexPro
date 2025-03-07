import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Breadcrumb, theme, Dropdown, Button, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  BulbOutlined,
  BarChartOutlined,
  UserOutlined,
  BellOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import LoadAssessment from '../components/LoadAssessment';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const HomePage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const items = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: '负荷评估',
    },
    {
      key: '2',
      icon: <LineChartOutlined />,
      label: '实时监控',
    },
    {
      key: '3',
      icon: <BarChartOutlined />,
      label: '历史数据',
    },
    {
      key: '4',
      icon: <AppstoreOutlined />,
      label: '能源管理',
      children: [
        {
          key: '4-1',
          label: '配置管理',
        },
        {
          key: '4-2',
          label: '参数设置',
        },
      ],
    },
    {
      key: '5',
      icon: <BulbOutlined />,
      label: '优化建议',
    },
  ];

  const userMenuItems = [
    {
      key: '1',
      label: '个人中心',
    },
    {
      key: '2',
      label: '账户设置',
    },
    {
      key: '3',
      label: '退出登录',
    },
  ];

  return (
    <Layout className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: token.colorBgContainer,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 100,
        }}
        theme="light"
        width={220}
      >
        <div className="app-logo" style={{ 
          background: token.colorPrimary, 
          color: token.colorWhite, 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: collapsed ? '16px' : '18px',
          fontWeight: 'bold'
        }}>
          {collapsed ? 'EFP' : 'EnerFlexPro'}
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['1']}
          defaultOpenKeys={['4']}
          style={{ borderRight: 0 }}
          items={items}
        />
      </Sider>
      <Layout style={{ 
        marginLeft: collapsed ? '80px' : '220px', 
        transition: 'all 0.2s',
        minHeight: '100vh'
      }}>
        <Header style={{ 
          background: token.colorBgContainer,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          width: '100%',
          height: '64px',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ 
              fontSize: '16px', 
              marginRight: 16,
              border: 'none',
              padding: '8px' 
            }}
          />

          <Breadcrumb
            style={{ margin: '0 16px' }}
            items={[
              { title: '首页' },
              { title: '负荷评估' },
            ]}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <Badge count={5} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px', marginRight: 8 }}
              />
            </Badge>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              style={{ fontSize: '16px', marginRight: 16 }}
            />

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span style={{ marginLeft: 8 }} className="responsive-hidden">管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ 
          padding: '24px',
          backgroundColor: '#f5f7fa',
          overflow: 'auto'
        }}>
          <div style={{ 
            marginBottom: 16,
            background: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
          }}>
            <Title level={4} style={{ marginBottom: 8, marginTop: 0 }}>负荷资源可调能力动态评估系统</Title>
            <Text type="secondary">智能评估负荷资源响应能力，助力电网调度优化</Text>
          </div>
          <LoadAssessment />
        </Content>
      </Layout>
    </Layout>
  );
};

export default HomePage; 