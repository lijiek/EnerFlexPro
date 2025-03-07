import { LoadIndicator, WeightConfig, AssessmentResult } from '../types/assessment';

export class AssessmentUtils {
  // 数据正向化处理
  static normalize(data: number[]): number[] {
    const max = Math.max(...data);
    return data.map(x => max - x);
  }

  // 添加更灵活的正向化处理，可指定需要正向化的列
  static normalizeMatrix(matrix: number[][], columnsToNormalize: number[] = []): number[][] {
    // 如果没有指定需要正向化的列，直接返回原矩阵
    if (columnsToNormalize.length === 0) {
      return matrix;
    }

    const normalized = JSON.parse(JSON.stringify(matrix)); // 深拷贝
    
    // 对指定的列进行正向化
    for (let col of columnsToNormalize) {
      const columnValues = matrix.map(row => row[col]);
      const maxVal = Math.max(...columnValues);
      
      for (let i = 0; i < matrix.length; i++) {
        normalized[i][col] = maxVal - matrix[i][col];
      }
    }
    
    return normalized;
  }

  // 数据标准化处理
  static standardize(matrix: number[][]): number[][] {
    const n = matrix.length;
    const m = matrix[0].length;
    const normalized = Array(n).fill(0).map(() => Array(m).fill(0));

    for (let j = 0; j < m; j++) {
      const sum = Math.sqrt(matrix.reduce((acc, row) => acc + row[j] * row[j], 0));
      for (let i = 0; i < n; i++) {
        normalized[i][j] = matrix[i][j] / sum;
      }
    }
    return normalized;
  }

  // 熵权法计算权重
  static calculateEntropyWeight(matrix: number[][]): number[] {
    const n = matrix.length;
    const m = matrix[0].length;
    const weights = Array(m).fill(0);

    // 计算每列的信息熵
    for (let j = 0; j < m; j++) {
      let entropy = 0;
      const columnSum = matrix.reduce((acc, row) => acc + row[j], 0);
      
      for (let i = 0; i < n; i++) {
        const p = matrix[i][j] / columnSum;
        if (p > 0) {
          entropy -= (p * Math.log(p)) / Math.log(n);
        }
      }
      
      weights[j] = 1 - entropy;
    }

    // 归一化权重
    const weightSum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / weightSum);
  }

  // 序关系分析法计算权重
  static calculateRelativeWeight(relativeImportance: number[]): number[] {
    const n = relativeImportance.length + 1;
    const weights = Array(n).fill(0);
    
    let sum = 1;
    let product = 1;
    
    for (let i = 0; i < relativeImportance.length; i++) {
      product *= relativeImportance[i];
      sum += product;
    }
    
    weights[n - 1] = 1 / sum;
    
    for (let i = n - 2; i >= 0; i--) {
      weights[i] = weights[i + 1] * relativeImportance[i];
    }
    
    return weights;
  }

  // TOPSIS方法计算得分
  static calculateTOPSIS(matrix: number[][], weights: number[]): number[] {
    const n = matrix.length;
    const m = matrix[0].length;
    
    // 先检查矩阵中是否有NaN值，如果有则替换为列的平均值
    for (let j = 0; j < m; j++) {
      const column = matrix.map(row => row[j]);
      const validValues = column.filter(val => !isNaN(val));
      
      // 如果该列有NaN值且有效值不为空，则用平均值替换
      if (validValues.length > 0 && validValues.length < column.length) {
        const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        for (let i = 0; i < n; i++) {
          if (isNaN(matrix[i][j])) {
            matrix[i][j] = avg;
            console.warn(`TOPSIS计算: 矩阵[${i}][${j}]的NaN值已替换为平均值${avg}`);
          }
        }
      } 
      // 如果整列都是NaN，使用合理的默认值
      else if (validValues.length === 0) {
        // 对各评价指标使用合理的默认值
        // prepTime: 15分钟, rate: 0.5MW/min, accuracy: 0.98, delay: 100ms, reliability: 0.99
        const defaultValues = [15, 0.5, 0.98, 100, 0.99]; 
        const defaultValue = defaultValues[Math.min(j, defaultValues.length - 1)];
        console.warn(`TOPSIS计算: 矩阵整列[${j}]都是NaN，已用默认值${defaultValue}替换`);
        
        for (let i = 0; i < n; i++) {
          matrix[i][j] = defaultValue;
        }
      }
    }
    
    // 输出处理后的矩阵，检查是否还有NaN值
    console.log('处理NaN后的矩阵:', matrix);
    
    // 计算加权标准化矩阵
    const weightedMatrix = matrix.map(row =>
      row.map((val, j) => val * weights[j])
    );
    
    console.log('加权标准化矩阵:', weightedMatrix);
    
    // 确定正理想解和负理想解
    const positiveIdeal = Array(m).fill(0);
    const negativeIdeal = Array(m).fill(0);
    
    for (let j = 0; j < m; j++) {
      const column = weightedMatrix.map(row => row[j]);
      
      // 如果列中有NaN值，先过滤掉
      const validColumn = column.filter(val => !isNaN(val));
      if (validColumn.length === 0) {
        // 如果整列都是NaN，设置默认的理想解
        positiveIdeal[j] = 1;
        negativeIdeal[j] = 0;
        console.warn(`TOPSIS计算: 列[${j}]没有有效值，设置默认理想解`);
      } else {
        positiveIdeal[j] = Math.max(...validColumn);
        negativeIdeal[j] = Math.min(...validColumn);
      }
    }
    
    console.log('正理想解:', positiveIdeal);
    console.log('负理想解:', negativeIdeal);
    
    // 计算到正理想解和负理想解的距离
    const positiveDistances = weightedMatrix.map(row => {
      const sumOfSquares = row.reduce((sum, val, j) => {
        // 处理NaN值
        if (isNaN(val)) {
          console.warn(`计算正理想解距离时发现NaN值，已跳过`);
          return sum;
        }
        return sum + Math.pow(val - positiveIdeal[j], 2);
      }, 0);
      return Math.sqrt(sumOfSquares);
    });
    
    const negativeDistances = weightedMatrix.map(row => {
      const sumOfSquares = row.reduce((sum, val, j) => {
        // 处理NaN值
        if (isNaN(val)) {
          console.warn(`计算负理想解距离时发现NaN值，已跳过`);
          return sum;
        }
        return sum + Math.pow(val - negativeIdeal[j], 2);
      }, 0);
      return Math.sqrt(sumOfSquares);
    });
    
    console.log('正理想解距离:', positiveDistances);
    console.log('负理想解距离:', negativeDistances);
    
    // 计算相对接近度，添加保护防止除以零
    const scores = positiveDistances.map((d_p, i) => {
      const d_n = negativeDistances[i];
      
      // 处理特殊情况
      if (isNaN(d_p) || isNaN(d_n)) {
        console.warn(`TOPSIS计算: 第${i}行的距离值为NaN，返回默认值0.5`);
        return 0.5;
      }
      
      if (d_p === 0 && d_n === 0) {
        console.warn(`TOPSIS计算: 第${i}行的正负理想解距离都为0，返回默认值0.5`);
        return 0.5; // 默认中间值
      }
      
      if (d_p === 0) {
        console.warn(`TOPSIS计算: 第${i}行的正理想解距离为0，返回最大值1`);
        return 1; // 与正理想解距离为0，最优
      }
      
      return d_n / (d_p + d_n);
    });
    
    console.log('未归一化分数:', scores);
    
    // 检查是否所有分数都是NaN
    const validScores = scores.filter(score => !isNaN(score));
    if (validScores.length === 0) {
      console.error('TOPSIS计算: 所有分数都是NaN，返回均匀分布');
      return Array(n).fill(1/n); // 返回均匀分布
    }
    
    // 归一化得分，保护防止除以零
    const sum = scores.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    if (sum === 0) {
      console.warn('TOPSIS计算: 分数总和为0，返回均匀分布');
      return Array(n).fill(1/n); // 返回均匀分布
    }
    
    return scores.map(score => isNaN(score) ? 1/n : score / sum);
  }

  // 评估负荷
  static assessLoad(indicators: LoadIndicator[], config: {
    dayAheadWeights?: number[],
    intraDayWeights?: number[],
    realTimeWeights?: number[],
    normalizeColumns?: {
      dayAhead?: number[],
      intraDay?: number[],
      realTime?: number[],
    }
  } = {}): AssessmentResult[] {
    // 提取各维度指标数据
    const dayAheadMatrix = indicators.map(ind => [
      ind.capacity, ind.duration, ind.cost
    ]);
    
    const intraDayMatrix = indicators.map(ind => [
      ind.rate, ind.prepTime, ind.duration, ind.efficiency
    ]);
    
    const realTimeMatrix = indicators.map(ind => [
      ind.prepTime, ind.rate, ind.accuracy, ind.delay, ind.reliability
    ]);

    // 应用正向化处理
    const normalizedDayAhead = this.normalizeMatrix(dayAheadMatrix, config.normalizeColumns?.dayAhead || [2]); // 默认成本列需要正向化
    const normalizedIntraDay = this.normalizeMatrix(intraDayMatrix, config.normalizeColumns?.intraDay || [1]); // 默认准备时间列需要正向化
    const normalizedRealTime = this.normalizeMatrix(realTimeMatrix, config.normalizeColumns?.realTime || [0, 3]); // 默认准备时间和通信延时列需要正向化

    // 数据标准化
    const standardizedDayAhead = this.standardize(normalizedDayAhead);
    const standardizedIntraDay = this.standardize(normalizedIntraDay);
    const standardizedRealTime = this.standardize(normalizedRealTime);

    // 使用配置的权重或默认权重
    const dayAheadWeights = config.dayAheadWeights || [0.4, 0.3, 0.3];
    const intraDayWeights = config.intraDayWeights || [0.3, 0.2, 0.2, 0.3];
    const realTimeWeights = config.realTimeWeights || [0.2, 0.2, 0.2, 0.2, 0.2];

    // 计算得分
    const dayAheadScores = this.calculateTOPSIS(standardizedDayAhead, dayAheadWeights);
    const intraDayScores = this.calculateTOPSIS(standardizedIntraDay, intraDayWeights);
    const realTimeScores = this.calculateTOPSIS(standardizedRealTime, realTimeWeights);

    // 返回评估结果
    return indicators.map((ind, index) => ({
      loadId: ind.id,
      dayAheadScore: dayAheadScores[index],
      intraDayScore: intraDayScores[index],
      realTimeScore: realTimeScores[index],
      capacity: ind.capacity,
      efficiency: ind.efficiency,
      rate: ind.rate,
      timestamp: new Date().toISOString(),
      energyConsumption: ind.capacity * ind.efficiency,
      type: 'supply' // 这个值将在AssessmentService中被覆盖
    }));
  }
} 