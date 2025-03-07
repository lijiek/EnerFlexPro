import React, { useState } from 'react';
import { Card, Table, Spin, Button, message, Upload, Tabs, Statistic, Row, Col } from 'antd';
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { Line, Column, Pie } from '../components/Charts';
import { AssessmentService } from '../services/assessmentService';
import { AssessmentResult } from '../types/assessment';
import { RcFile } from 'antd/lib/upload';

const LoadAssessment: React.FC = () => {
  const [file, setFile] = useState<UploadFile | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('results');

  // 文件上传处理
  const handleFileChange = (info: any) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 上传成功`);
      setFile(info.file);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    } else {
      // 直接接收文件，不通过antd的上传功能发送请求
      setFile(info.file);
    }
  };

  // 评估数据
  const assessData = async () => {
    if (!file?.originFileObj) {
      message.warning('请先上传数据文件');
      return;
    }

    try {
      setLoading(true);
      const service = AssessmentService.getInstance();
      const assessmentResults = await service.assessLoadsFromExcelFile(file.originFileObj as RcFile);
      
      // 添加调试日志
      console.log('评估结果:', {
        rawResults: assessmentResults,
        totalCapacity: assessmentResults.reduce((acc, r) => acc + r.capacity, 0),
        avgEfficiency: assessmentResults.reduce((acc, r) => acc + r.efficiency, 0) / assessmentResults.length,
        maxResponse: Math.max(...assessmentResults.map(r => r.rate))
      });
      
      setResults(assessmentResults);
      message.success('评估完成，结果已下载到本地');
    } catch (error) {
      console.error('评估失败:', error);
      message.error(`评估失败: ${error instanceof Error ? error.message : '请检查数据文件格式'}`);
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    { title: '负荷ID', dataIndex: 'loadId', key: 'loadId' },
    { 
      title: '日前得分', 
      dataIndex: 'dayAheadScore', 
      key: 'dayAheadScore',
      render: (value: number) => value.toFixed(4),
      sorter: (a: AssessmentResult, b: AssessmentResult) => a.dayAheadScore - b.dayAheadScore
    },
    { 
      title: '日内得分', 
      dataIndex: 'intraDayScore', 
      key: 'intraDayScore',
      render: (value: number) => value.toFixed(4),
      sorter: (a: AssessmentResult, b: AssessmentResult) => a.intraDayScore - b.intraDayScore
    },
    { 
      title: '实时得分', 
      dataIndex: 'realTimeScore', 
      key: 'realTimeScore',
      render: (value: number) => value.toFixed(4),
      sorter: (a: AssessmentResult, b: AssessmentResult) => a.realTimeScore - b.realTimeScore
    },
    { 
      title: '负荷类型', 
      dataIndex: 'type', 
      key: 'type',
      filters: [
        { text: '供能', value: '供能' },
        { text: '用能', value: '用能' },
        { text: '供用能', value: '供用能' },
      ],
      onFilter: (value: any, record: AssessmentResult) => record.type === value
    }
  ];

  // 计算各类型指标平均数据
  const calculateStats = () => {
    if (!results || results.length === 0) {
      return {
        totalCapacity: 'N/A',
        avgEfficiency: 'N/A',
        maxResponseRate: 'N/A'
      };
    }

    const totalCapacity = results.reduce((acc, r) => acc + r.capacity, 0).toFixed(2);
    const avgEfficiency = (results.reduce((acc, r) => acc + r.efficiency, 0) / results.length * 100).toFixed(0);
    const maxResponseRate = Math.max(...results.map(r => r.rate)).toFixed(2);

    return {
      totalCapacity,
      avgEfficiency,
      maxResponseRate
    };
  };

  // 配置评分趋势图
  const getScoreLineConfig = () => {
    if (!results || results.length === 0) return {
      data: [],
      xField: 'id',
      yField: 'value',
      seriesField: 'type',
      color: ['#1890ff', '#2ca02c', '#ff7f0e'],
      legend: { position: 'top' as const },
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
    };

    return {
      data: results.map((r, index) => ([
        { type: '日前', value: r.dayAheadScore, id: r.loadId },
        { type: '日内', value: r.intraDayScore, id: r.loadId },
        { type: '实时', value: r.realTimeScore, id: r.loadId }
      ])).flat(),
      xField: 'id',
      yField: 'value',
      seriesField: 'type',
      color: ['#1890ff', '#2ca02c', '#ff7f0e'],
      legend: { position: 'top' as const },
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
    };
  };

  // 配置类型分布饼图
  const getTypeDistributionConfig = () => {
    if (!results || results.length === 0) return {
      data: [],
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      label: {
        type: 'outer',
        content: '{name} {percentage}',
      },
      interactions: [{ type: 'pie-legend-active' }, { type: 'element-active' }],
    };

    const typeCount = results.reduce((acc: any, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    const data = Object.entries(typeCount).map(([type, count]) => ({
      type,
      value: count
    }));

    return {
      data,
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      label: {
        type: 'outer',
        content: '{name} {percentage}',
      },
      interactions: [{ type: 'pie-legend-active' }, { type: 'element-active' }],
    };
  };

  // 配置能源消耗柱状图
  const getEnergyConfig = () => {
    if (!results || results.length === 0) return {
      data: [],
      xField: 'id',
      yField: 'energy',
      label: {
        position: 'middle' as const,
        style: {
          fill: '#FFFFFF',
          opacity: 0.6,
        },
      },
      colorField: 'type',
      meta: {
        energy: {
          alias: '能源消耗(MW·h)',
        },
      },
    };

    return {
      data: results.map(r => ({
        id: `负荷${r.loadId}`,
        energy: r.energyConsumption,
        type: r.type
      })),
      xField: 'id',
      yField: 'energy',
      label: {
        position: 'middle' as const,
        style: {
          fill: '#FFFFFF',
          opacity: 0.6,
        },
      },
      colorField: 'type',
      meta: {
        energy: {
          alias: '能源消耗(MW·h)',
        },
      },
    };
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.xlsx',
    beforeUpload: (file) => {
      const isXlsx = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!isXlsx) {
        message.error('请上传 Excel 文件 (.xlsx)');
      }
      return isXlsx || Upload.LIST_IGNORE;
    },
    customRequest: ({ file, onSuccess }) => {
      setTimeout(() => {
        onSuccess && onSuccess("ok");
      }, 0);
    }
  };

  const stats = calculateStats();
  const tabItems = [
    {
      key: 'results',
      label: '评估结果',
      children: (
        <Table 
          dataSource={results} 
          columns={columns} 
          rowKey="loadId" 
          pagination={false}
          bordered
          size="middle"
          loading={loading}
        />
      ),
    },
    {
      key: 'trends',
      label: '趋势分析',
      children: (
        results.length > 0 ? (
          <Line {...getScoreLineConfig()} height={350} />
        ) : (
          <div className="empty-chart">请先评估数据</div>
        )
      ),
    },
    {
      key: 'distribution',
      label: '负荷分布',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            {results.length > 0 ? (
              <Pie {...getTypeDistributionConfig()} height={350} />
            ) : (
              <div className="empty-chart">请先评估数据</div>
            )}
          </Col>
          <Col span={12}>
            {results.length > 0 ? (
              <Column {...getEnergyConfig()} height={350} />
            ) : (
              <div className="empty-chart">请先评估数据</div>
            )}
          </Col>
        </Row>
      ),
    }
  ];

  return (
    <Spin spinning={loading}>
      <Card 
        title="负荷评估与监控" 
        style={{ marginBottom: 16 }}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Upload {...uploadProps} onChange={handleFileChange}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <Button type="primary" onClick={assessData} disabled={!file}>
              开始评估
            </Button>
            {results.length > 0 && (
              <Button icon={<ReloadOutlined />} onClick={assessData}>
                重新评估
              </Button>
            )}
          </div>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="总可调容量"
                value={stats.totalCapacity}
                suffix="MW"
                precision={2}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均响应效率"
                value={stats.avgEfficiency}
                suffix="%"
                precision={0}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="最大响应速率"
                value={stats.maxResponseRate}
                suffix="MW/min"
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '4px' }}>
        <h3>使用说明：</h3>
        <p>1. 准备符合格式的Excel文件，包含以下字段（<b>带*为必填</b>）：</p>
        <ul>
          <li>负荷编号*</li>
          <li>响应容量(MW)*</li>
          <li>响应持续时间(h)*</li>
          <li>响应成本(元/MW)*</li>
          <li>响应速率(MW/min)*</li>
          <li>响应准备时间(min)*</li>
          <li>有效响应率(%) - 默认95%</li>
          <li>通信延时(ms) - 默认100ms</li>
          <li>响应精度(%) - 默认98%</li>
          <li>可靠性评分(%) - 默认99%</li>
        </ul>
        <p>2. 点击"选择文件"按钮上传数据文件</p>
        <p>3. 点击"开始评估"按钮进行评估</p>
        <p>4. 系统将自动生成评估结果并下载到本地</p>
        <p>5. 可以通过标签页切换查看不同的分析视图</p>
      </div>
      
      <style jsx>{`
        .empty-chart {
          height: 350px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f5f5f5;
          border-radius: 4px;
          color: #999;
        }
      `}</style>
    </Spin>
  );
};

export default LoadAssessment; 