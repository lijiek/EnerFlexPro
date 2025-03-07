import { LoadIndicator, AssessmentResult, WeightConfig, RelativeImportance } from '../types/assessment';
import { AssessmentUtils } from '../utils/assessment';
import { ExcelService } from './excelService';

export class AssessmentService {
  private static instance: AssessmentService;
  private weightConfig: WeightConfig;
  private relativeImportance: RelativeImportance;
  private excelService: ExcelService;
  private normalizeColumns: {
    dayAhead: number[];
    intraDay: number[];
    realTime: number[];
  };

  private constructor() {
    this.excelService = ExcelService.getInstance();
    
    // 默认权重配置
    this.weightConfig = {
      dayAhead: [0.4, 0.3, 0.3],
      intraDay: [0.3, 0.2, 0.2, 0.3],
      realTime: [0.2, 0.2, 0.2, 0.2, 0.2]
    };

    // 默认序关系配置
    this.relativeImportance = {
      dayAhead: [1.4, 1.2],
      intraDay: [1.2, 1.2, 1.2],
      realTime: [1.4, 1.4, 1.2, 1.2]
    };

    // 默认需要正向化的列索引（因为这些指标是越小越好）
    this.normalizeColumns = {
      dayAhead: [2], // 响应成本，越小越好
      intraDay: [1], // 响应准备时间，越小越好
      realTime: [0, 3] // 响应准备时间和通信延时，越小越好
    };
  }

  static getInstance(): AssessmentService {
    if (!AssessmentService.instance) {
      AssessmentService.instance = new AssessmentService();
    }
    return AssessmentService.instance;
  }

  // 设置权重配置
  setWeightConfig(config: WeightConfig): void {
    this.weightConfig = config;
  }

  // 设置序关系配置
  setRelativeImportance(config: RelativeImportance): void {
    this.relativeImportance = config;
  }

  // 设置需要正向化的列
  setNormalizeColumns(config: {
    dayAhead: number[];
    intraDay: number[];
    realTime: number[];
  }): void {
    this.normalizeColumns = config;
  }

  // 从Excel文件内容读取数据并评估
  async assessLoadsFromExcelFile(file: File): Promise<AssessmentResult[]> {
    try {
      // 读取文件内容
      const buffer = await file.arrayBuffer();
      const indicators = await this.excelService.readLoadParametersFromBuffer(buffer);
      
      // 添加调试日志
      console.log('读取到的原始数据:', indicators);
      
      // 输出关键字段的值，特别关注实时评分的计算字段
      indicators.forEach((ind, i) => {
        console.log(`负荷 ${ind.id} 的关键字段:`, {
          prepTime: ind.prepTime,
          rate: ind.rate,
          accuracy: ind.accuracy,
          delay: ind.delay,
          reliability: ind.reliability
        });
      });
      
      // 计算组合权重
      const entropyWeights = {
        dayAhead: AssessmentUtils.calculateEntropyWeight(indicators.map(ind => [ind.capacity, ind.duration, ind.cost])),
        intraDay: AssessmentUtils.calculateEntropyWeight(indicators.map(ind => [ind.rate, ind.prepTime, ind.duration, ind.efficiency])),
        realTime: AssessmentUtils.calculateEntropyWeight(indicators.map(ind => [ind.prepTime, ind.rate, ind.accuracy, ind.delay, ind.reliability]))
      };

      // 添加调试日志
      console.log('熵权重计算结果:', entropyWeights);

      const relativeWeights = {
        dayAhead: AssessmentUtils.calculateRelativeWeight(this.relativeImportance.dayAhead),
        intraDay: AssessmentUtils.calculateRelativeWeight(this.relativeImportance.intraDay),
        realTime: AssessmentUtils.calculateRelativeWeight(this.relativeImportance.realTime)
      };

      // 添加调试日志
      console.log('序关系权重计算结果:', relativeWeights);

      // 组合权重（0.3熵权法 + 0.7序关系分析法）
      const combinedWeights = {
        dayAhead: entropyWeights.dayAhead.map((w, i) => w * 0.3 + relativeWeights.dayAhead[i] * 0.7),
        intraDay: entropyWeights.intraDay.map((w, i) => w * 0.3 + relativeWeights.intraDay[i] * 0.7),
        realTime: entropyWeights.realTime.map((w, i) => w * 0.3 + relativeWeights.realTime[i] * 0.7)
      };

      // 添加调试日志
      console.log('组合权重计算结果:', combinedWeights);

      // 提取实时评分矩阵进行调试
      const realTimeMatrix = indicators.map(ind => [
        ind.prepTime, ind.rate, ind.accuracy, ind.delay, ind.reliability
      ]);
      console.log('实时评分矩阵:', realTimeMatrix);
      
      // 应用正向化处理
      const normalizedRealTime = AssessmentUtils.normalizeMatrix(
        realTimeMatrix, 
        this.normalizeColumns.realTime
      );
      console.log('正向化后的实时评分矩阵:', normalizedRealTime);
      
      // 数据标准化
      const standardizedRealTime = AssessmentUtils.standardize(normalizedRealTime);
      console.log('标准化后的实时评分矩阵:', standardizedRealTime);
      
      // 使用组合权重和正向化配置进行评估
      const results = AssessmentUtils.assessLoad(indicators, {
        dayAheadWeights: combinedWeights.dayAhead,
        intraDayWeights: combinedWeights.intraDay,
        realTimeWeights: combinedWeights.realTime,
        normalizeColumns: this.normalizeColumns
      });

      // 添加调试日志
      console.log('初步评估结果:', results);

      // 扩展结果数据
      const enrichedResults = results.map((result, index) => {
        const loadType = this.determineLoadType(indicators[index]);
        const enriched = {
          ...result,
          timestamp: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
          energyConsumption: indicators[index].capacity * indicators[index].efficiency,
          type: loadType,
          capacity: indicators[index].capacity,
          efficiency: indicators[index].efficiency,
          rate: indicators[index].rate
        };
        // 添加调试日志
        console.log(`处理第 ${index + 1} 条数据:`, enriched);
        return enriched;
      });

      // 添加调试日志
      console.log('最终评估结果:', enrichedResults);

      // 生成并下载评估结果
      const blob = await this.excelService.saveAssessmentResultsToBlob(enrichedResults);
      this.excelService.downloadBlob(blob, '负荷分级得分.xlsx');

      return enrichedResults;
    } catch (error) {
      console.error('评估过程出错:', error);
      throw error;
    }
  }

  // 根据负荷特征确定类型
  private determineLoadType(indicator: LoadIndicator): '供能' | '用能' | '供用能' {
    const { efficiency, cost, capacity, rate } = indicator;
    
    // 改进的类型判断逻辑
    if (efficiency > 0.9 && cost < 350) {
      return '供能';
    } else if (capacity > 10 && efficiency < 0.8) {
      return '用能';
    } else if (rate > 4) {
      return '供能';
    } else {
      return '供用能';
    }
  }

  // 获取示例数据（用于测试）
  getExampleData(): LoadIndicator[] {
    return [
      {
        id: 1,
        capacity: 12.8,
        duration: 2,
        cost: 300,
        rate: 0.22,
        prepTime: 15,
        efficiency: 0.95,
        delay: 100,
        accuracy: 0.98,
        reliability: 0.99
      },
      {
        id: 2,
        capacity: 7.8,
        duration: 2,
        cost: 300,
        rate: 0.26,
        prepTime: 10,
        efficiency: 0.98,
        delay: 80,
        accuracy: 0.99,
        reliability: 0.98
      },
      {
        id: 3,
        capacity: 3.2,
        duration: 0.5,
        cost: 350,
        rate: 0.64,
        prepTime: 20,
        efficiency: 0.92,
        delay: 120,
        accuracy: 0.97,
        reliability: 0.97
      }
    ];
  }
} 