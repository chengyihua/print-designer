

export default class UnitConverter {
  static currentDPI = 96; // 与下面的计算保持一致

  static units = {
    mm: { name: 'mm', conversionFactor: 1, precision: 2 },
    cm: { name: 'cm', conversionFactor: 10, precision: 2 },
    inch: { name: 'inch', conversionFactor: 25.4, precision: 3 },
    // 初始基于300DPI
    px: { name: 'px', conversionFactor: 25.4 / 96, precision: 2 }
  };

  // 设置 DPI
  static setDPI(dpi) {
    this.currentDPI = dpi;
    // 更新px的转换因子
    this.units.px.conversionFactor = 25.4 / dpi;
  }

  // 获取当前DPI
  static getDPI() {
    return this.currentDPI;
  }

  // 从任意单位转换到毫米
  static toMm(value, fromUnit) {
    const unit = this.units[fromUnit];
    if (!unit) return value;
    return value * unit.conversionFactor;
  }

  // 从毫米转换到任意单位
  static fromMm(value, toUnit) {
    const unit = this.units[toUnit];
    if (!unit) return value;
    return value / unit.conversionFactor;
  }

  // 直接单位转换
  static convert(value, fromUnit, toUnit) {
    const mmValue = this.toMm(value, fromUnit);
    return this.fromMm(mmValue, toUnit);
  }

  // 获取像素值（考虑缩放）- 更清晰的版本
  static toPx(value, fromUnit, scale = 1) {
    const mmValue = this.toMm(value, fromUnit);
    const px = mmValue / this.units.px.conversionFactor;
    return px * scale;
  }

  // 从像素转换
  static fromPx(pxValue, toUnit, scale = 1) {
    const adjustedPx = pxValue / scale;
    const mmValue = adjustedPx * this.units.px.conversionFactor;
    return this.fromMm(mmValue, toUnit);
  }

  // 格式化显示
  static format(value, unit) {
    const precision = this.units[unit]?.precision || 2;
    return `${value.toFixed(precision)}${unit}`;
  }

  // 边距对象转换函数
static convertMargins(margins, fromUnit = 'mm', toUnit = 'px', scale = 1) {
    // console.log('输入 margins:', margins);
    // console.log('输入类型:', typeof margins);
    // console.log('margins.top:', margins?.top);
    
    const result = {};
    
    // 确保每个属性都处理
    if (margins.top !== undefined) {
        result.top = this.toPx(margins.top, fromUnit, scale);
    }
    if (margins.bottom !== undefined) {
        result.bottom = this.toPx(margins.bottom, fromUnit, scale);
    }
    if (margins.left !== undefined) {
        result.left = this.toPx(margins.left, fromUnit, scale);
    }
    if (margins.right !== undefined) {
        result.right = this.toPx(margins.right, fromUnit, scale);
    }
    
    // console.log('输出 result:', result);
    // console.log('输出类型:', typeof result);
    
    return result;
}
  // 获取可用的内容区域尺寸
  static getContentArea(pageSize, margins, fromUnit = 'mm', toUnit = 'px', scale = 1) {
    if (!pageSize || !pageSize.width || !pageSize.height) {
      throw new Error('Page size must have width and height properties');
    }

    // 转换边距
    const marginsPx = this.convertMargins(margins, fromUnit, 'px', scale);

    // 转换页面尺寸
    const pageWidthPx = this.toPx(pageSize.width, fromUnit, scale);
    const pageHeightPx = this.toPx(pageSize.height, fromUnit, scale);

    // 计算内容区域
    const contentWidth = pageWidthPx - (marginsPx.left || 0) - (marginsPx.right || 0);
    const contentHeight = pageHeightPx - (marginsPx.top || 0) - (marginsPx.bottom || 0);

    if (toUnit === 'px') {
      return {
        width: contentWidth,
        height: contentHeight,
        margins: marginsPx,
        pageSize: { width: pageWidthPx, height: pageHeightPx }
      };
    } else {
      return {
        width: this.fromPx(contentWidth, toUnit, scale),
        height: this.fromPx(contentHeight, toUnit, scale),
        margins: this.convertMargins(margins, fromUnit, toUnit),
        pageSize: {
          width: this.fromPx(pageWidthPx, toUnit, scale),
          height: this.fromPx(pageHeightPx, toUnit, scale)
        }
      };
    }
  }


  // 调试信息
  static debugInfo() {
    return {
      dpi: this.currentDPI,
      pxConversionFactor: this.units.px.conversionFactor,
      sample: {
        '10mm_to_px': this.toPx(10, 'mm'),
        '100px_to_mm': this.fromPx(100, 'mm')
      }
    };
  }
}