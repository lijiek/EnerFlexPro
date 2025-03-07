// 负荷评估指标接口
export interface LoadIndicator {
  id: number;
  capacity: number;      // 响应容量 (MW)
  duration: number;      // 响应持续时间 (h)
  cost: number;         // 响应成本 (元/MW)
  rate: number;         // 响应速率 (MW/min)
  prepTime: number;     // 响应准备时间 (min)
  efficiency: number;   // 有效响应率 (0-1)
  delay: number;        // 通信延时 (ms)
  accuracy: number;     // 响应精度 (0-1)
  reliability: number;  // 可靠性评分 (0-1)
}

// 评估结果接口
export interface AssessmentResult {
  loadId: number;
  dayAheadScore: number;    // 日前得分
  intraDayScore: number;    // 日内得分
  realTimeScore: number;    // 实时得分
  timestamp: string;
  energyConsumption: number;
  type: '供能' | '用能' | '供用能' | 'supply' | 'demand' | 'both';
  capacity: number;
  efficiency: number;
  rate: number;
}

// 权重配置接口
export interface WeightConfig {
  dayAhead: number[];
  intraDay: number[];
  realTime: number[];
}

// 序关系重要度配置接口
export interface RelativeImportance {
  dayAhead: number[];
  intraDay: number[];
  realTime: number[];
}

// 字段映射配置
export interface FieldMapping {
  [key: string]: string; // 外部字段名到内部字段名的映射
}

// 单位信息
export interface UnitInfo {
  capacity: string;
  duration: string;
  cost: string;
  rate: string;
  prepTime: string;
  efficiency: string;
  delay: string;
  accuracy: string;
  reliability: string;
} 