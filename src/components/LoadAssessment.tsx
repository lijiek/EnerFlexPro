import React, { useState, useEffect } from 'react';
import { Card, Table, Spin, Button, message, Upload, Tabs, Statistic, Row, Col, Tooltip, Tag, Progress, Alert, Space, Typography, Divider } from 'antd';
import { UploadOutlined, ReloadOutlined, InfoCircleOutlined, DownloadOutlined, FundProjectionScreenOutlined, ThunderboltOutlined, RiseOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { Line, Column, Pie } from '../components/Charts';
import { AssessmentService } from '../services/assessmentService';
import { AssessmentResult } from '../types/assessment';
import { RcFile } from 'antd/lib/upload';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const LoadAssessment: React.FC = () => {
  const [file, setFile] = useState<UploadFile | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('results');
  const [forceRender, setForceRender] = useState<number>(0);

  // 当标签页切换时，强制重新渲染图表
  useEffect(() => {
    // 等待DOM更新后，触发图表重绘
    const timer = setTimeout(() => {
      setForceRender(prev => prev + 1);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

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

  // 标签页切换处理
  const handleTabChange = (key: string) => {
    setActiveTab(key);
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
    { 
      title: '负荷ID', 
      dataIndex: 'loadId', 
      key: 'loadId',
      render: (id: string) => (
        <Tag color="blue">{id}</Tag>
      )
    },
    { 
      title: '日前得分', 
      dataIndex: 'dayAheadScore', 
      key: 'dayAheadScore',
      render: (value: number) => (
        <Tooltip title={`得分: ${value.toFixed(4)}`}>
          <Progress 
            percent={Math.round(value * 100)} 
            size="small" 
            status={value > 0.7 ? "success" : value > 0.4 ? "normal" : "exception"}
            format={percent => `${percent}%`}
          />
        </Tooltip>
      ),
      sorter: (a: AssessmentResult, b: AssessmentResult) => a.dayAheadScore - b.dayAheadScore
    },
    { 
      title: '日内得分', 
      dataIndex: 'intraDayScore', 
      key: 'intraDayScore',
      render: (value: number) => (
        <Tooltip title={`得分: ${value.toFixed(4)}`}>
          <Progress 
            percent={Math.round(value * 100)}
            size="small" 
            status={value > 0.7 ? "success" : value > 0.4 ? "normal" : "exception"}
            format={percent => `${percent}%`}
          />
        </Tooltip>
      ),
      sorter: (a: AssessmentResult, b: AssessmentResult) => a.intraDayScore - b.intraDayScore
    },
    { 
      title: '实时得分', 
      dataIndex: 'realTimeScore', 
      key: 'realTimeScore',
      render: (value: number) => (
        <Tooltip title={`得分: ${value.toFixed(4)}`}>
          <Progress 
            percent={Math.round(value * 100)}
            size="small" 
            status={value > 0.7 ? "success" : value > 0.4 ? "normal" : "exception"}
            format={percent => `${percent}%`}
          />
        </Tooltip>
      ),
      sorter: (a: AssessmentResult, b: AssessmentResult) => a.realTimeScore - b.realTimeScore
    },
    { 
      title: '负荷类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type: string) => {
        const color = type === '供能' ? 'green' : type === '用能' ? 'orange' : 'purple';
        return <Tag color={color}>{type}</Tag>;
      },
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
      color: ['#1677ff', '#52c41a', '#faad14'],
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
      color: ['#1677ff', '#52c41a', '#faad14'],
      legend: { position: 'top' as const },
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
      autoFit: true,
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
      autoFit: true,
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
      autoFit: true,
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

  return (
    <Spin spinning={loading}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card 
            className="card-container"
            variant="outlined"
            style={{ borderRadius: '8px' }}
          >
            <div className="upload-container" style={{ 
              padding: '20px',
              border: '2px dashed #d9d9d9',
              borderRadius: '8px',
              background: '#fafafa',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              margin: 0
            }}>
              {!file ? (
                <>
                  <p><UploadOutlined style={{ fontSize: '48px', color: '#1677ff' }} /></p>
                  <Title level={5}>点击或拖拽文件至此处上传</Title>
                  <Paragraph type="secondary">支持 .xlsx 格式的 Excel 文件</Paragraph>
                  <Upload {...uploadProps} onChange={handleFileChange}>
                    <Button type="primary" icon={<UploadOutlined />}>选择文件</Button>
                  </Upload>
                </>
              ) : (
                <>
                  <p><FundProjectionScreenOutlined style={{ fontSize: '48px', color: '#52c41a' }} /></p>
                  <Title level={5}>已上传文件: {file.name}</Title>
                  <Space>
                    <Button type="primary" onClick={assessData} icon={<ThunderboltOutlined />}>
                      开始评估
                    </Button>
                    <Upload {...uploadProps} onChange={handleFileChange}>
                      <Button icon={<ReloadOutlined />}>更换文件</Button>
                    </Upload>
                  </Space>
                </>
              )}
            </div>
          </Card>
        </Col>

        {results.length > 0 && (
          <>
            <Col span={24}>
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={8}>
                  <Card className="stat-card" variant="outlined">
                    <Statistic
                      title={<><ThunderboltOutlined /> 总可调容量</>}
                      value={stats.totalCapacity}
                      suffix="MW"
                      precision={2}
                      valueStyle={{ color: '#1677ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card className="stat-card" variant="outlined">
                    <Statistic
                      title={<><RiseOutlined /> 平均响应效率</>}
                      value={stats.avgEfficiency}
                      suffix="%"
                      precision={0}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card className="stat-card" variant="outlined">
                    <Statistic
                      title={<><InfoCircleOutlined /> 最大响应速率</>}
                      value={stats.maxResponseRate}
                      suffix="MW/min"
                      precision={2}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Col>

            <Col span={24}>
              <Card 
                className="card-container"
                variant="outlined"
                title="评估结果分析"
                style={{ borderRadius: '8px' }}
                extra={
                  <Button icon={<DownloadOutlined />} onClick={assessData}>
                    下载评估报告
                  </Button>
                }
              >
                <Tabs activeKey={activeTab} onChange={handleTabChange}>
                  <TabPane key="results" tab="详细评估结果">
                    <Table 
                      dataSource={results} 
                      columns={columns} 
                      rowKey="loadId" 
                      pagination={{ pageSize: 5 }}
                      bordered={false}
                      size="middle"
                      loading={loading}
                      scroll={{ x: 'max-content' }}
                    />
                  </TabPane>
                  <TabPane key="trends" tab="评分趋势分析">
                    <div style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '24px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                      height: '400px', // 固定高度
                      width: '100%',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {results.length > 0 ? (
                        <div key={`line-chart-${forceRender}`} style={{ width: '100%', height: '100%' }}>
                          <Line {...getScoreLineConfig()} height={360} />
                        </div>
                      ) : (
                        <div style={{
                          height: '100%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          background: '#f0f2f5',
                          borderRadius: '8px',
                          color: '#999'
                        }}>
                          请先评估数据
                        </div>
                      )}
                    </div>
                  </TabPane>
                  <TabPane key="distribution" tab="负荷分布分析">
                    <Row gutter={24}>
                      <Col xs={24} lg={12}>
                        <div style={{
                          background: 'white',
                          padding: '20px',
                          borderRadius: '8px',
                          marginBottom: '24px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                          height: '400px', // 固定高度
                          width: '100%',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <Title level={5}>负荷类型分布</Title>
                          <Divider style={{ margin: '12px 0' }} />
                          {results.length > 0 ? (
                            <div key={`pie-chart-${forceRender}`} style={{ width: '100%', height: 'calc(100% - 50px)' }}>
                              <Pie {...getTypeDistributionConfig()} height={315} />
                            </div>
                          ) : (
                            <div style={{
                              height: 'calc(100% - 50px)',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              background: '#f0f2f5',
                              borderRadius: '8px',
                              color: '#999'
                            }}>
                              请先评估数据
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col xs={24} lg={12}>
                        <div style={{
                          background: 'white',
                          padding: '20px',
                          borderRadius: '8px',
                          marginBottom: '24px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                          height: '400px', // 固定高度
                          width: '100%',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <Title level={5}>能源消耗分析</Title>
                          <Divider style={{ margin: '12px 0' }} />
                          {results.length > 0 ? (
                            <div key={`column-chart-${forceRender}`} style={{ width: '100%', height: 'calc(100% - 50px)' }}>
                              <Column {...getEnergyConfig()} height={315} />
                            </div>
                          ) : (
                            <div style={{
                              height: 'calc(100% - 50px)',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              background: '#f0f2f5',
                              borderRadius: '8px',
                              color: '#999'
                            }}>
                              请先评估数据
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
          </>
        )}

        <Col span={24}>
          <Card 
            variant="outlined"
            title="使用说明"
            style={{ borderRadius: '8px' }}
          >
            <Alert
              message="数据要求"
              description={
                <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>准备符合格式的Excel文件，包含以下字段（<Text strong>带*为必填</Text>）：</li>
                  <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                    <li><Text code>负荷编号*</Text> - 每个负荷的唯一标识</li>
                    <li><Text code>响应容量(MW)*</Text> - 负荷的可调节容量</li>
                    <li><Text code>响应持续时间(h)*</Text> - 负荷可持续响应的时间</li>
                    <li><Text code>响应成本(元/MW)*</Text> - 每MW响应的成本</li>
                    <li><Text code>响应速率(MW/min)*</Text> - 负荷响应的速度</li>
                    <li><Text code>响应准备时间(min)*</Text> - 从接收指令到开始响应的时间</li>
                    <li><Text code>有效响应率(%)</Text> - 默认95%</li>
                    <li><Text code>通信延时(ms)</Text> - 默认100ms</li>
                    <li><Text code>响应精度(%)</Text> - 默认98%</li>
                    <li><Text code>可靠性评分(%)</Text> - 默认99%</li>
                  </ul>
                </ul>
              }
              type="info"
              showIcon
            />
            <div style={{ height: '16px' }}></div>
            <Alert
              message="操作流程"
              description={
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>点击"选择文件"按钮上传数据文件</li>
                  <li>点击"开始评估"按钮进行评估</li>
                  <li>系统将自动生成评估结果并下载到本地</li>
                  <li>可以通过标签页切换查看不同的分析视图</li>
                </ol>
              }
              type="success"
              showIcon
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};

export default LoadAssessment; 