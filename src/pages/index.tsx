import React from 'react';
import { Layout, Menu } from 'antd';
import LoadAssessment from '../components/LoadAssessment';

const { Header, Content } = Layout;

const HomePage: React.FC = () => {
  return (
    <Layout className="layout">
      <Header>
        <div className="logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          items={[
            { key: '1', label: '负荷智能评估系统' },
            { key: '2', label: '实时监控' },
            { key: '3', label: '历史数据' },
          ]}
        />
      </Header>
      <Content style={{ padding: '24px' }}>
        <LoadAssessment />
      </Content>
    </Layout>
  );
};

export default HomePage; 