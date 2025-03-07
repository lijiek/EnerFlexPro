import React from 'react';
import { Area } from './Charts';
import { Select } from 'antd';

const RealTimeMonitor: React.FC = () => {
  const data = [
    { time: '00:00', value: 300 },
    { time: '01:00', value: 280 },
    { time: '02:00', value: 250 },
    { time: '03:00', value: 260 },
    { time: '04:00', value: 270 },
    { time: '05:00', value: 300 },
  ];

  const config = {
    data,
    xField: 'time',
    yField: 'value',
    smooth: true,
    areaStyle: {
      fill: 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff',
    },
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          defaultValue="realtime"
          style={{ width: 120 }}
          options={[
            { value: 'realtime', label: '实时监测' },
            { value: 'hour', label: '小时数据' },
            { value: 'day', label: '天数据' },
          ]}
        />
      </div>
      <Area {...config} />
    </div>
  );
};

export default RealTimeMonitor; 