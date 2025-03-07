import * as XLSX from 'xlsx';
import { LoadIndicator, FieldMapping, UnitInfo } from '../types/assessment';

export class ExcelService {
  private static instance: ExcelService;
  private fieldMappings: FieldMapping;
  private unitInfo: UnitInfo;

  private constructor() {
    // 初始化字段映射配置
    this.fieldMappings = {
      '负荷编号': 'id',
      '负荷ID': 'id',
      '响应容量': 'capacity',
      '响应容量(MW)': 'capacity',
      '响应持续时间': 'duration',
      '响应持续时间(h)': 'duration',
      '响应成本': 'cost',
      '响应成本(元/MW)': 'cost',
      '响应速率': 'rate',
      '响应速率(MW/min)': 'rate',
      '响应准备时间': 'prepTime',
      '响应准备时间(min)': 'prepTime',
      '有效响应率': 'efficiency',
      '有效响应率(%)': 'efficiency',
      '通信延时': 'delay',
      '通信延时(ms)': 'delay',
      '响应精度': 'accuracy',
      '响应精度(%)': 'accuracy',
      '可靠性评分': 'reliability',
      '可靠性评分(%)': 'reliability'
    };

    // 初始化单位信息
    this.unitInfo = {
      capacity: 'MW',
      duration: 'h',
      cost: '元/MW',
      rate: 'MW/min',
      prepTime: 'min',
      efficiency: '%',
      delay: 'ms',
      accuracy: '%',
      reliability: '%'
    };
  }

  static getInstance(): ExcelService {
    if (!ExcelService.instance) {
      ExcelService.instance = new ExcelService();
    }
    return ExcelService.instance;
  }

  // 可以自定义字段映射
  setFieldMappings(mappings: FieldMapping): void {
    this.fieldMappings = { ...this.fieldMappings, ...mappings };
  }

  // 获取当前字段映射
  getFieldMappings(): FieldMapping {
    return this.fieldMappings;
  }

  // 获取单位信息
  getUnitInfo(): UnitInfo {
    return this.unitInfo;
  }

  // 从Excel文件缓冲区读取负荷参数
  async readLoadParametersFromBuffer(buffer: ArrayBuffer): Promise<LoadIndicator[]> {
    console.log('Excel原始数据:', buffer);
    try {
      // 读取Excel文件
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet);

      console.log('Excel原始数据:', rawData);

      // 必填字段列表（内部字段名）
      const requiredFields = ['id', 'capacity', 'duration', 'cost', 'rate', 'prepTime'];
      
      // 可选字段及其默认值
      const optionalFields: { [key: string]: number } = {
        'efficiency': 0.95, // 默认95%的有效响应率
        'delay': 100,      // 默认100ms的通信延时
        'accuracy': 0.98,  // 默认98%的响应精度
        'reliability': 0.99 // 默认99%的可靠性
      };

      // 检查每行数据是否包含必要字段
      const indicators = rawData.map((row: any, index: number) => {
        // 查找每个内部字段名对应的外部字段名（可能有多个）
        const missingFields: string[] = [];
        const loadIndicator: any = {};

        // 首先处理ID字段
        let idFound = false;
        for (const [externalName, internalName] of Object.entries(this.fieldMappings)) {
          if (internalName === 'id' && (row[externalName] !== undefined || row[`${externalName}`] !== undefined)) {
            loadIndicator.id = Number(row[externalName] || row[`${externalName}`]);
            idFound = true;
            break;
          }
        }
        
        // 如果没有找到ID，使用索引+1
        if (!idFound) {
          loadIndicator.id = index + 1;
        }

        // 处理其他字段
        for (const internalName of [...requiredFields, ...Object.keys(optionalFields)]) {
          if (internalName === 'id') continue; // ID已处理
          
          let fieldFound = false;
          // 尝试从映射的外部字段名中查找
          for (const [externalName, mappedInternalName] of Object.entries(this.fieldMappings)) {
            if (mappedInternalName === internalName && 
                (row[externalName] !== undefined || row[`${externalName}`] !== undefined)) {
              
              let value = row[externalName] || row[`${externalName}`];
              
              // 百分比值处理（转换为小数）
              if (['efficiency', 'accuracy', 'reliability'].includes(internalName) && 
                  externalName.includes('%') && value > 1) {
                value = value / 100;
              }
              
              loadIndicator[internalName] = Number(value);
              fieldFound = true;
              break;
            }
          }
          
          // 如果是必填字段但未找到，记录错误
          if (!fieldFound && requiredFields.includes(internalName)) {
            missingFields.push(this.getExternalFieldName(internalName));
          }
          // 如果是可选字段但未找到，使用默认值
          else if (!fieldFound && internalName in optionalFields) {
            loadIndicator[internalName] = optionalFields[internalName];
          }
        }

        // 如果有缺失的必填字段，报告错误
        if (missingFields.length > 0) {
          console.error(`第 ${index + 1} 行数据缺少必要字段:`, missingFields);
          throw new Error(`数据格式错误：第 ${index + 1} 行缺少字段 ${missingFields.join(', ')}`);
        }

        return loadIndicator as LoadIndicator;
      });

      return indicators;
    } catch (error) {
      console.error('读取 Excel 数据失败:', error);
      throw error;
    }
  }

  // 获取外部字段名（用于错误提示）
  private getExternalFieldName(internalName: string): string {
    // 查找映射中对应的第一个外部字段名
    for (const [externalName, mappedInternalName] of Object.entries(this.fieldMappings)) {
      if (mappedInternalName === internalName) {
        return externalName;
      }
    }
    return internalName; // 如果没找到映射，返回内部字段名
  }

  // 将指标名映射为属性名
  private mapFieldToProperty(field: string): keyof LoadIndicator {
    return (this.fieldMappings[field] || field) as keyof LoadIndicator;
  }

  // 将评估结果保存为Excel Blob
  async saveAssessmentResultsToBlob(results: any[]): Promise<Blob> {
    try {
      // 创建工作表数据
      const wsData = results.map(result => ({
        '负荷编号': result.loadId,
        '日前得分': result.dayAheadScore.toFixed(4),
        '日内得分': result.intraDayScore.toFixed(4),
        '实时得分': result.realTimeScore.toFixed(4),
        '负荷类型': this.translateType(result.type),
        '响应容量(MW)': result.capacity.toFixed(2),
        '有效响应率(%)': (result.efficiency * 100).toFixed(2),
        '响应速率(MW/min)': result.rate.toFixed(2),
        '能源消耗(MW·h)': result.energyConsumption.toFixed(2),
        '评估时间': result.timestamp
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, '负荷分级得分');

      // 输出为二进制数据
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([wbout], { type: 'application/octet-stream' });
    } catch (error) {
      console.error('保存评估结果失败:', error);
      throw error;
    }
  }

  // 将类型从英文翻译为中文
  private translateType(type: string): string {
    switch (type) {
      case 'supply': return '供能';
      case 'demand': return '用能';
      case 'both': return '供用能';
      default: return type;
    }
  }

  // 下载Blob为文件
  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
} 