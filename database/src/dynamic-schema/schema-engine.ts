import { Property, DeviceModel, UIWidgetType } from '../schemas/types.js';

export interface DynamicWidgetSpec {
  propertyKey: string;
  label: string;
  widgetType: UIWidgetType;
  dataType: string;
  unit?: string;
  isControllable: boolean;
  options?: string[];
  range?: { min?: number; max?: number };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: Record<string, any>;
  alerts: Array<{
    propertyKey: string;
    level: 'WARNING' | 'CRITICAL';
    message: string;
    currentValue: any;
  }>;
}

/**
 * Dynamic Schema Engine:
 * Trái tim xử lý linh hoạt cho mọi loại thiết bị IoT Austec mà không cần code cứng.
 */
export class DynamicSchemaEngine {
  private propertiesMap: Map<string, Property> = new Map();
  private modelsMap: Map<string, DeviceModel> = new Map();

  /**
   * Đăng ký hoặc cập nhật thuộc tính vào từ điển hệ thống
   */
  public registerProperty(prop: Property): void {
    this.propertiesMap.set(prop.propertyKey, prop);
  }

  public getProperty(key: string): Property | undefined {
    return this.propertiesMap.get(key);
  }

  public getAllProperties(): Property[] {
    return Array.from(this.propertiesMap.values());
  }

  /**
   * Đăng ký hoặc cập nhật Model cùng cấu hình thuộc tính của nó
   */
  public registerModel(model: DeviceModel): void {
    this.modelsMap.set(model.modelCode, model);
  }

  public getModel(code: string): DeviceModel | undefined {
    return this.modelsMap.get(code);
  }

  /**
   * Tự động sinh danh sách đặc tả Widget giao diện (UI Widget Specs)
   * cho Mobile App và Web CMS render theo thời gian thực
   */
  public generateUIWidgetSpecs(modelCode: string): DynamicWidgetSpec[] {
    const model = this.modelsMap.get(modelCode);
    if (!model) {
      throw new Error(`Model '${modelCode}' không tồn tại trong hệ thống.`);
    }

    const specs: DynamicWidgetSpec[] = [];
    for (const item of model.propertiesConfig) {
      const prop = this.propertiesMap.get(item.propertyKey);
      if (!prop) continue;

      specs.push({
        propertyKey: prop.propertyKey,
        label: prop.displayName,
        widgetType: prop.uiWidgetType,
        dataType: prop.dataType,
        unit: prop.unit,
        isControllable: prop.isControllable,
        options: prop.validationRule?.enumOptions,
        range: {
          min: prop.validationRule?.min,
          max: prop.validationRule?.max,
        },
      });
    }

    return specs;
  }

  /**
   * Kiểm tra tính hợp lệ của gói tin Telemetry hoặc Lệnh điều khiển gửi lên
   */
  public validateTelemetry(modelCode: string, payload: Record<string, any>): ValidationResult {
    const model = this.modelsMap.get(modelCode);
    if (!model) {
      return {
        isValid: false,
        errors: [`Model '${modelCode}' không hợp lệ`],
        sanitizedData: {},
        alerts: [],
      };
    }

    const errors: string[] = [];
    const sanitizedData: Record<string, any> = {};
    const alerts: ValidationResult['alerts'] = [];

    // Duyệt qua từng thuộc tính được khai báo cho model này
    for (const config of model.propertiesConfig) {
      const key = config.propertyKey;
      const prop = this.propertiesMap.get(key);
      const val = payload[key];

      if (!prop) continue;

      // Kiểm tra thuộc tính bắt buộc
      if (config.isRequired && (val === undefined || val === null)) {
        errors.push(`Thuộc tính '${prop.displayName}' (${key}) là bắt buộc.`);
        continue;
      }

      if (val === undefined || val === null) {
        if (config.defaultValue !== undefined) {
          sanitizedData[key] = config.defaultValue;
        }
        continue;
      }

      // Kiểm tra kiểu dữ liệu
      switch (prop.dataType) {
        case 'boolean':
          if (typeof val !== 'boolean') {
            errors.push(`'${key}' phải có giá trị true/false.`);
          } else {
            sanitizedData[key] = val;
          }
          break;

        case 'integer':
          if (!Number.isInteger(val)) {
            errors.push(`'${key}' phải là số nguyên.`);
          } else {
            sanitizedData[key] = val;
          }
          break;

        case 'float':
          if (typeof val !== 'number') {
            errors.push(`'${key}' phải là số thực.`);
          } else {
            sanitizedData[key] = val;
          }
          break;

        case 'string':
          if (typeof val !== 'string') {
            errors.push(`'${key}' phải là chuỗi ký tự.`);
          } else {
            sanitizedData[key] = val;
          }
          break;

        case 'enum':
          if (prop.validationRule?.enumOptions && !prop.validationRule.enumOptions.includes(val)) {
            errors.push(`'${key}' có giá trị '${val}' không thuộc danh mục hợp lệ [${prop.validationRule.enumOptions.join(', ')}].`);
          } else {
            sanitizedData[key] = val;
          }
          break;

        case 'json':
          sanitizedData[key] = val;
          break;
      }

      // Kiểm tra min/max nếu là kiểu số
      if (typeof val === 'number') {
        if (prop.validationRule?.min !== undefined && val < prop.validationRule.min) {
          errors.push(`'${key}' (${val}) thấp hơn ngưỡng tối thiểu cho phép (${prop.validationRule.min}).`);
        }
        if (prop.validationRule?.max !== undefined && val > prop.validationRule.max) {
          errors.push(`'${key}' (${val}) vượt quá ngưỡng tối đa cho phép (${prop.validationRule.max}).`);
        }

        // Kiểm tra ngưỡng cảnh báo (Alert thresholds)
        if (config.alertThresholdLow !== undefined && val <= config.alertThresholdLow) {
          alerts.push({
            propertyKey: key,
            level: 'WARNING',
            message: `Chỉ số '${prop.displayName}' chạm mức thấp cảnh báo (${val}${prop.unit || ''})!`,
            currentValue: val,
          });
        }
        if (config.alertThresholdHigh !== undefined && val >= config.alertThresholdHigh) {
          alerts.push({
            propertyKey: key,
            level: 'CRITICAL',
            message: `Chỉ số '${prop.displayName}' chạm mức cao nguy hiểm (${val}${prop.unit || ''})!`,
            currentValue: val,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData,
      alerts,
    };
  }
}
