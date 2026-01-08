/**
 * 公式计算工具函数
 * formulaUtils.ts
 *
 * 提供公式解析、计算和格式化功能
 */

// ==================== 类型定义 ====================

export interface FormulaContext {
  /** 主数据对象 */
  data?: Record<string, any>;
  /** 当前行数据 */
  currentItem?: Record<string, any>;
  /** 当前页码 */
  currentPage?: number;
  /** 总页数 */
  totalPages?: number;
  /** 当前行索引（全局） */
  rowIndex?: number;
  /** 当前页起始索引 */
  startIndex?: number;
  /** 当前页条数 */
  pageSize?: number;
}

export interface FormulaOptions {
  /** 格式化类型 */
  formatType?: 'number' | 'currency' | 'percent' | 'text';
  /** 小数位数 */
  decimalPlaces?: number;
}

// ==================== 内置函数定义 ====================

/**
 * 内置函数注册表
 * 可以通过 registerFunction 扩展
 */
const builtInFunctions: Record<string, (...args: any[]) => any> = {
  // 数学函数
  ROUND: (value: number, decimals: number = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },
  FLOOR: (value: number) => Math.floor(value),
  CEIL: (value: number) => Math.ceil(value),
  ABS: (value: number) => Math.abs(value),
  MOD: (a: number, b: number) => a % b,

  // 字符串函数
  CONCAT: (...args: any[]) => args.join(''),
  LEFT: (str: string, n: number) => String(str).substring(0, n),
  RIGHT: (str: string, n: number) => String(str).slice(-n),
  LEN: (str: string) => String(str).length,
  TRIM: (str: string) => String(str).trim(),
  UPPER: (str: string) => String(str).toUpperCase(),
  LOWER: (str: string) => String(str).toLowerCase(),

  // 日期函数
  NOW: () => new Date().toLocaleString('zh-CN'),
  TODAY: () => new Date().toLocaleDateString('zh-CN'),
  YEAR: (date: string) => new Date(date).getFullYear(),
  MONTH: (date: string) => new Date(date).getMonth() + 1,
  DAY: (date: string) => new Date(date).getDate(),

  // 逻辑函数
  IF: (condition: boolean, trueVal: any, falseVal: any) =>
    condition ? trueVal : falseVal,
  IIF: (condition: boolean, trueVal: any, falseVal: any) =>
    condition ? trueVal : falseVal,
  ISNULL: (value: any, defaultVal: any) =>
    value === null || value === undefined || value === '' ? defaultVal : value,

  // 格式化函数
  FORMAT: (value: number, type: string) => {
    switch (type) {
      case 'currency':
        return `¥${value.toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      case 'percent':
        return `${(value * 100).toFixed(2)}%`;
      default:
        return String(value);
    }
  },
  FIXED: (value: number, decimals: number = 2) => value.toFixed(decimals),
  PADLEFT: (str: string, len: number, char: string = '0') =>
    String(str).padStart(len, char),
  PADRIGHT: (str: string, len: number, char: string = ' ') =>
    String(str).padEnd(len, char),

  // 聚合函数（需要上下文注入）
  /** 计数 - 支持 COUNT(*), COUNT(array), COUNT(field) */
  COUNT: (arg: any) => {
    // COUNT(*) 或 COUNT(ROWID()) 会在外层处理
    if (Array.isArray(arg)) return arg.length;
    if (arg === '*' || arg === 'ROWID') return '__COUNT_ALL__';
    return 1;
  },
  /** 求和 */
  SUM: (arr: any[], field?: string) => {
    if (!Array.isArray(arr)) return 0;
    if (field) {
      return arr.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
    }
    return arr.reduce((sum, val) => sum + (Number(val) || 0), 0);
  },
  /** 平均值 */
  AVG: (arr: any[], field?: string) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sum = field
      ? arr.reduce((s, item) => s + (Number(item[field]) || 0), 0)
      : arr.reduce((s, val) => s + (Number(val) || 0), 0);
    return sum / arr.length;
  },
  /** 最大值 */
  MAX: (arr: any[], field?: string) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const values = field ? arr.map(item => Number(item[field]) || 0) : arr.map(v => Number(v) || 0);
    return Math.max(...values);
  },
  /** 最小值 */
  MIN: (arr: any[], field?: string) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const values = field ? arr.map(item => Number(item[field]) || 0) : arr.map(v => Number(v) || 0);
    return Math.min(...values);
  },
  /** 行号函数（用于 COUNT(ROWID()) 兼容） */
  ROWID: () => 'ROWID',

  // 财务函数
  /** 金额转中文大写 */
  TOCHINESE: (num: number): string => {
    if (num === 0) return '零元整';
    if (isNaN(num)) return '';
    
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = [['', '拾', '佰', '仟'], ['', '万', '亿', '兆']];
    
    const head = num < 0 ? '负' : '';
    num = Math.abs(num);
    
    let s = '';
    // 小数部分
    const numStr = num.toFixed(2);
    const [intPart, decPart] = numStr.split('.');
    
    for (let i = 0; i < decPart.length; i++) {
      const n = Number(decPart.charAt(i));
      if (n !== 0) s += digit[n] + fraction[i];
    }
    s = s || '整';
    
    // 整数部分
    let intNum = parseInt(intPart);
    if (intNum > 0) {
      let intStr = '';
      for (let i = 0; i < unit[1].length && intNum > 0; i++) {
        let p = '';
        for (let j = 0; j < unit[0].length && intNum > 0; j++) {
          p = digit[intNum % 10] + unit[0][j] + p;
          intNum = Math.floor(intNum / 10);
        }
        intStr = p.replace(/(零.)*零$/, '').replace(/^零+/, '') + unit[1][i] + intStr;
      }
      s = intStr.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零') + '元' + s;
    }
    
    return head + s;
  },
  
  /** 货币格式化（带千分位） */
  CURRENCY: (num: number, symbol: string = '￥', decimals: number = 2): string => {
    if (isNaN(num)) return '';
    const fixed = Math.abs(num).toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const sign = num < 0 ? '-' : '';
    return `${sign}${symbol}${formatted}${decPart ? '.' + decPart : ''}`;
  },
  
  /** 计算折扣后金额 */
  DISCOUNT: (amount: number, discountRate: number): number => {
    return amount * (1 - discountRate / 100);
  },
  
  /** 计算税额 */
  TAX: (amount: number, taxRate: number): number => {
    return amount * taxRate / 100;
  },
  
  /** 计算含税金额 */
  WITHTAX: (amount: number, taxRate: number): number => {
    return amount * (1 + taxRate / 100);
  },
  
  /** 从含税金额计算税额 */
  EXTRACTTAX: (amountWithTax: number, taxRate: number): number => {
    return amountWithTax - amountWithTax / (1 + taxRate / 100);
  },
};

// ==================== 公式解析 ====================

/**
 * 预处理公式，将中文标点转换为英文标点
 */
const preprocessFormula = (formula: string): string => {
  return formula
    .replace(/，/g, ',')   // 中文逗号 → 英文逗号
    .replace(/（/g, '(')   // 中文左括号 → 英文左括号
    .replace(/）/g, ')')   // 中文右括号 → 英文右括号
    .replace(/“/g, '"')   // 中文左双引号 → 英文双引号
    .replace(/”/g, '"')   // 中文右双引号 → 英文双引号
    .replace(/‘/g, "'")   // 中文左单引号 → 英文单引号
    .replace(/’/g, "'")   // 中文右单引号 → 英文单引号
    .replace(/；/g, ';')   // 中文分号 → 英文分号
    .replace(/：/g, ':');  // 中文冒号 → 英文冒号
};

/**
 * 替换公式中的系统变量
 */
const replaceSystemVariables = (
  formula: string,
  context: FormulaContext
): string => {
  const { currentPage = 1, totalPages = 1, rowIndex = 0 } = context;

  return formula
    .replace(/\{currentDate\}/g, `"${new Date().toLocaleDateString('zh-CN')}"`)
    .replace(/\{currentTime\}/g, `"${new Date().toLocaleTimeString('zh-CN')}"`)
    .replace(/\{pageNumber\}/g, String(currentPage))
    .replace(/\{totalPages\}/g, String(totalPages))
    .replace(/\{rowIndex\}/g, String(rowIndex + 1));
};

/**
 * 根据路径获取对象属性值
 * 支持 "products.name" 这样的路径格式
 */
const getValueByPath = (
  obj: Record<string, any> | undefined,
  path: string,
  product?: Record<string, any>
): any => {
  if (!obj && !product) return undefined;
  
  // 如果路径包含点号，说明是明细字段，如 products.name
  if (path.includes('.')) {
    const [prefix, fieldName] = path.split('.');
    // 明细字段优先从 product 中获取
    if (prefix === 'products' && product && product[fieldName] !== undefined) {
      return product[fieldName];
    }
    // 也支持从主数据的数组中获取（预留）
    if (obj && obj[prefix] && Array.isArray(obj[prefix])) {
      // 如果是数组，返回第一个元素的字段值（用于预览）
      return obj[prefix][0]?.[fieldName];
    }
    return undefined;
  }
  
  // 普通字段，优先从 product 获取，然后从主数据获取
  if (product && product[path] !== undefined) {
    return product[path];
  }
  if (obj && obj[path] !== undefined) {
    return obj[path];
  }
  return undefined;
};

/**
 * 替换公式中的数据字段
 * 支持路径格式，如 {products.name}
 * 返回 { expression, hasUnresolved }
 */
const replaceDataFields = (
  expression: string,
  context: FormulaContext
): { expression: string; hasUnresolved: boolean } => {
  const { data = {}, currentItem } = context;
  const fieldPattern = /\{([^}]+)\}/g;
  let hasUnresolved = false;

  const result = expression.replace(fieldPattern, (match, fieldName) => {
    const val = getValueByPath(data, fieldName, currentItem);
    
    if (val !== undefined) {
      return typeof val === 'number' ? String(val) : `"${val}"`;
    }
    
    // 字段未找到
    hasUnresolved = true;
    return `"[${fieldName}]"`;
  });

  return { expression: result, hasUnresolved };
};

/**
 * 替换公式中的函数调用
 * 将 FUNC(args) 转换为 __fn.FUNC(args)
 */
const replaceFunctionCalls = (expression: string): string => {
  const funcNames = Object.keys(builtInFunctions).join('|');
  const funcPattern = new RegExp(`\\b(${funcNames})\\s*\\(`, 'g');
  return expression.replace(funcPattern, '__fn.$1(');
};

/**
 * 处理聚合函数，从字段路径动态获取数据源
 * 支持 COUNT(*), PAGECOUNT(*), SUM(field), PAGESUM(field) 等
 */
const processAggregateFunctions = (
  expression: string,
  context: FormulaContext
): string => {
  const { data = {}, startIndex = 0, pageSize = 0 } = context;
  
  // 辅助函数：从字段路径获取数据源
  const getDataSource = (field: string): any[] => {
    const prefix = field.includes('.') ? field.split('.')[0] : null;
    if (prefix && data[prefix] && Array.isArray(data[prefix])) {
      return data[prefix];
    }
    // 尝试查找 data 中的数组类型属性
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
    return [];
  };
  
  // 获取实际字段名
  const getActualField = (field: string): string => {
    return field.includes('.') ? field.split('.')[1] : field;
  };
  
  // === 当前页数据统计（先处理长函数名，避免被短函数名匹配） ===
  // 处理 PAGECOUNT(*)
  expression = expression.replace(/\bPAGECOUNT\s*\(\s*\*\s*\)/gi, () => {
    return String(pageSize);
  });
  expression = expression.replace(/\bPAGECOUNT\s*\(\s*ROWID\s*\(\s*\)\s*\)/gi, () => {
    return String(pageSize);
  });
  
  // 处理 PAGESUM({field}) - 当前页数据
  expression = expression.replace(/\bPAGESUM\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const pageItems = allItems.slice(startIndex, startIndex + pageSize);
    const actualField = getActualField(field);
    const sum = pageItems.reduce((s: number, item: any) => s + (Number(item[actualField]) || 0), 0);
    return String(sum);
  });
  
  // 处理 PAGEAVG({field}) - 当前页平均
  expression = expression.replace(/\bPAGEAVG\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const pageItems = allItems.slice(startIndex, startIndex + pageSize);
    const actualField = getActualField(field);
    if (pageItems.length === 0) return '0';
    const sum = pageItems.reduce((s: number, item: any) => s + (Number(item[actualField]) || 0), 0);
    return String(sum / pageItems.length);
  });
  
  // 处理 PAGEMAX({field}) - 当前页最大值
  expression = expression.replace(/\bPAGEMAX\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const pageItems = allItems.slice(startIndex, startIndex + pageSize);
    const actualField = getActualField(field);
    if (pageItems.length === 0) return '0';
    const values = pageItems.map((item: any) => Number(item[actualField]) || 0);
    return String(Math.max(...values));
  });
  
  // 处理 PAGEMIN({field}) - 当前页最小值
  expression = expression.replace(/\bPAGEMIN\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const pageItems = allItems.slice(startIndex, startIndex + pageSize);
    const actualField = getActualField(field);
    if (pageItems.length === 0) return '0';
    const values = pageItems.map((item: any) => Number(item[actualField]) || 0);
    return String(Math.min(...values));
  });
  
  // === 全部数据统计 ===
  // 处理 COUNT(*)
  expression = expression.replace(/\bCOUNT\s*\(\s*\*\s*\)/gi, () => {
    // 查找数据源
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        return String(data[key].length);
      }
    }
    return '0';
  });
  // 处理 COUNT(ROWID())
  expression = expression.replace(/\bCOUNT\s*\(\s*ROWID\s*\(\s*\)\s*\)/gi, () => {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        return String(data[key].length);
      }
    }
    return '0';
  });
  
  // 处理 SUM({field}) 或 SUM(field) - 全部数据
  expression = expression.replace(/\bSUM\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const actualField = getActualField(field);
    const sum = allItems.reduce((s: number, item: any) => s + (Number(item[actualField]) || 0), 0);
    return String(sum);
  });
  
  // 处理 AVG({field}) - 全部数据
  expression = expression.replace(/\bAVG\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const actualField = getActualField(field);
    if (allItems.length === 0) return '0';
    const sum = allItems.reduce((s: number, item: any) => s + (Number(item[actualField]) || 0), 0);
    return String(sum / allItems.length);
  });
  
  // 处理 MAX({field}) - 全部数据
  expression = expression.replace(/\bMAX\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const actualField = getActualField(field);
    if (allItems.length === 0) return '0';
    const values = allItems.map((item: any) => Number(item[actualField]) || 0);
    return String(Math.max(...values));
  });
  
  // 处理 MIN({field}) - 全部数据
  expression = expression.replace(/\bMIN\s*\(\s*\{?([\w.]+)\}?\s*\)/gi, (match, field) => {
    const allItems = getDataSource(field);
    const actualField = getActualField(field);
    if (allItems.length === 0) return '0';
    const values = allItems.map((item: any) => Number(item[actualField]) || 0);
    return String(Math.min(...values));
  });
  
  return expression;
};

/**
 * 格式化数值结果
 */
const formatResult = (result: number, options: FormulaOptions): string => {
  const { formatType = 'text', decimalPlaces = 2 } = options;

  switch (formatType) {
    case 'currency':
      return `¥${result
        .toFixed(decimalPlaces)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    case 'percent':
      return `${(result * 100).toFixed(decimalPlaces)}%`;
    case 'number':
      return result
        .toFixed(decimalPlaces)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    case 'text':
    default:
      return String(result);
  }
};

// ==================== 主函数 ====================

/**
 * 计算公式求值
 * @param formula 公式字符串，如 "{price} * {quantity}" 或 "CONCAT({name}, '-', {code})"
 * @param context 数据上下文
 * @param options 格式化选项
 * @returns 计算结果字符串
 */
export const evaluateFormula = (
  formula: string,
  context: FormulaContext = {},
  options: FormulaOptions = {}
): string => {
  if (!formula || !formula.trim()) {
    return '[公式]';
  }

  // 预处理：将中文标点转换为英文标点
  formula = preprocessFormula(formula);

  try {
    // console.log('[Formula] 输入:', formula);
    // console.log('[Formula] 上下文:', { data: context.data, currentItem: context.currentItem, startIndex: context.startIndex, pageSize: context.pageSize });
    
    // 1. 替换系统变量
    let expression = replaceSystemVariables(formula, context);
    // console.log('[Formula] 替换系统变量后:', expression);
    
    // 2. 处理聚合函数（COUNT, SUM, AVG, MAX, MIN）
    expression = processAggregateFunctions(expression, context);
    // console.log('[Formula] 处理聚合函数后:', expression);

    // 3. 替换数据字段
    const { expression: fieldReplaced, hasUnresolved } = replaceDataFields(
      expression,
      context
    );
    expression = fieldReplaced;
    // console.log('[Formula] 替换字段后:', expression, '未解析:', hasUnresolved);

    // 4. 如果有未解析的字段且没有函数调用，显示预览
    const hasFunctionCall = /\b(SUM|COUNT|AVG|MAX|MIN|PAGESUM|PAGECOUNT|PAGEAVG|PAGEMAX|PAGEMIN|ROWID|ROUND|FLOOR|CEIL|ABS|MOD|CONCAT|LEFT|RIGHT|LEN|TRIM|UPPER|LOWER|NOW|TODAY|YEAR|MONTH|DAY|IF|IIF|ISNULL|FORMAT|FIXED|PADLEFT|PADRIGHT|TOCHINESE|CURRENCY|DISCOUNT|TAX|WITHTAX|EXTRACTTAX)\s*\(/i.test(expression);
    // console.log('[Formula] 有函数调用:', hasFunctionCall);
    
    if (hasUnresolved && !hasFunctionCall) {
      try {
        // eslint-disable-next-line
        const result = Function('"use strict"; return (' + expression + ')')();
        // console.log('[Formula] 无函数结果:', result);
        return String(result);
      } catch {
        return formula.replace(/\{([^}]+)\}/g, '[$1]');
      }
    }

    // 4. 替换函数调用
    expression = replaceFunctionCalls(expression);
    // console.log('[Formula] 替换函数后:', expression);
    
    // 5. 检查是否包含字符串（双引号或单引号）
    const hasString = expression.includes('"') || expression.includes("'");
    // console.log('[Formula] 含字符串:', hasString);
    
    if (hasString) {
      // 字符串模式 - 允许点号、下划线、单引号、比较运算符用于函数调用
     
      if (
        !/^[\d\s+"'\u4e00-\u9fa5\w\-_.,:;=<>!&|\uff08\uff09\uff1a\uff0c\u3002\u3001()[\]]+$/.test(expression)
      ) {
        console.error('[公式错误] 字符串公式包含不允许的字符:', expression);
        return '[公式错误]';
      }
      // eslint-disable-next-line
      const result = Function(
        '__fn',
        '"use strict"; return (' + expression + ')'
      )(builtInFunctions);
    //   console.log('[Formula] 字符串模式结果:', result);
      return String(result);
    } else {
      // 数字模式 - 允许点号用于函数调用
      if (!/^[\d\s+\-*/().%<>=!&|?:\w]+$/.test(expression)) {
        console.error('数字公式包含不允许的字符:', expression);
        return '[公式错误]';
      }
// eslint-disable-next-line
      const result = Function(
        '__fn',
        '"use strict"; return (' + expression + ')'
      )(builtInFunctions);

      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return formatResult(result, options);
      }

      return String(result);
    }
  } catch (error) {
    console.error('公式计算错误:', error);
    return '[计算错误]';
  }
};

// ==================== 扩展接口 ====================

/**
 * 注册自定义函数
 * @param name 函数名（大写）
 * @param fn 函数实现
 */
export const registerFunction = (
  name: string,
  fn: (...args: any[]) => any
): void => {
  builtInFunctions[name.toUpperCase()] = fn;
};

/**
 * 获取所有已注册的函数名
 */
export const getRegisteredFunctions = (): string[] => {
  return Object.keys(builtInFunctions);
};

/**
 * 校验公式语法
 * @param formula 公式字符串
 * @returns { valid: boolean, message: string }
 */
export const validateFormula = (
  formula: string
): { valid: boolean; message: string } => {
  if (!formula || !formula.trim()) {
    return { valid: false, message: '公式不能为空' };
  }

  // 预处理：将中文标点转换为英文标点
  const processed = preprocessFormula(formula);

  // 检查括号是否匹配
  let bracketCount = 0;
  for (const char of processed) {
    if (char === '(') bracketCount++;
    if (char === ')') bracketCount--;
    if (bracketCount < 0) {
      return { valid: false, message: '括号不匹配：多余的右括号' };
    }
  }
  if (bracketCount !== 0) {
    return { valid: false, message: '括号不匹配：缺少右括号' };
  }

  // 检查花括号是否匹配
  let braceCount = 0;
  for (const char of processed) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) {
      return { valid: false, message: '字段引用格式错误：多余的 }' };
    }
  }
  if (braceCount !== 0) {
    return { valid: false, message: '字段引用格式错误：缺少 }' };
  }

  // 检查公式结构：函数调用后不应该有多余字符
  // 匹配最外层函数调用，检查后面是否有多余内容
  const funcPattern = /^\s*[A-Z_][A-Z0-9_]*\s*\(/i;
  if (funcPattern.test(processed)) {
    // 找到匹配的右括号位置
    let depth = 0;
    let endIndex = -1;
    for (let i = 0; i < processed.length; i++) {
      if (processed[i] === '(') depth++;
      if (processed[i] === ')') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex !== -1 && endIndex < processed.length - 1) {
      const remaining = processed.substring(endIndex + 1).trim();
      // 允许运算符连接的情况
      if (remaining && !/^[\s+\-*/&|<>=]+/.test(remaining)) {
        return { valid: false, message: `公式语法错误：函数调用后有多余内容 "${remaining}"` };
      }
    }
  }

  // 检查引号是否匹配
  let inString = false;
  let quoteChar = '';
  for (let i = 0; i < processed.length; i++) {
    const char = processed[i];
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      quoteChar = char;
    } else if (inString && char === quoteChar && processed[i - 1] !== '\\') {
      inString = false;
    }
  }
  if (inString) {
    return { valid: false, message: '字符串引号不匹配' };
  }

  return { valid: true, message: '公式格式正确' };
};

/**
 * 带模拟数据执行的公式校验
 * @param formula 公式字符串
 * @param mockData 模拟主表数据
 * @param mockProduct 模拟明细数据
 * @returns { valid: boolean, message: string, result?: string }
 */
export const validateFormulaWithExecution = (
  formula: string,
  mockData: Record<string, any>,
  mockProduct: Record<string, any>
): { valid: boolean; message: string; result?: string } => {
  if (!formula || !formula.trim()) {
    return { valid: false, message: '公式不能为空' };
  }

  // 预处理
  const processed = preprocessFormula(formula);

  try {
    // 1. 替换系统变量
    let expression = replaceSystemVariables(processed, {
      currentPage: 1,
      totalPages: 1,
      rowIndex: 0,
    });
    
    // 2. 处理聚合函数（用模拟数据）
    const mockItems = mockData.products || [mockProduct];
    expression = processAggregateFunctions(expression, {
      data: { ...mockData, products: mockItems },
      startIndex: 0,
      pageSize: mockItems.length,
    });

    // 3. 替换数据字段
    const { expression: fieldReplaced } = replaceDataFields(expression, {
      data: mockData,
      currentItem: mockProduct,
    });
    expression = fieldReplaced;

    // 4. 替换函数调用
    expression = replaceFunctionCalls(expression);

    // 5. 尝试执行
    // eslint-disable-next-line
    const result = Function(
      '__fn',
      '"use strict"; return (' + expression + ')'
    )(builtInFunctions);

    return {
      valid: true,
      message: '校验通过',
      result: String(result),
    };
  } catch (error) {
    // 解析错误信息
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // 提取更友好的错误信息
    if (errorMsg.includes('is not defined')) {
      const match = errorMsg.match(/(\w+) is not defined/);
      if (match) {
        return {
          valid: false,
          message: `未定义的变量或函数: "${match[1]}"，请检查拼写或使用 {字段名} 格式引用数据字段`,
        };
      }
    }
    
    if (errorMsg.includes('is not a function')) {
      const match = errorMsg.match(/(\w+) is not a function/);
      if (match) {
        return {
          valid: false,
          message: `"${match[1]}" 不是有效的函数，请检查函数名拼写`,
        };
      }
    }
    
    if (errorMsg.includes('Unexpected token')) {
      return {
        valid: false,
        message: `语法错误: 意外的符号，请检查括号、引号、运算符是否正确`,
      };
    }
    
    if (errorMsg.includes('Unexpected end')) {
      return {
        valid: false,
        message: `语法错误: 公式不完整，请检查是否缺少括号或参数`,
      };
    }

    return {
      valid: false,
      message: `执行错误: ${errorMsg}`,
    };
  }
};
