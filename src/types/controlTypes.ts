/**
 * 控件类型定义文件
 * 
 * 结构说明：
 * 1. BorderStyle - 边框样式
 * 2. ControlType - 控件类型枚举
 * 3. 共性属性接口 - BaseControlProps, TextStyleProps, ContainerStyleProps
 * 4. 各控件独立接口 - TextControl, FieldControl, ImageControl 等
 * 5. ControlObject - 联合类型（严格类型检查）
 * 6. ControlObjectAll - 通用类型（用于属性面板等场景）
 * 7. 类型守卫函数 - isTextStyleControl, hasBorderControl 等
 */

// ==================== 边框样式 ====================

export interface BorderStyle {
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted' | 'none';
  color?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

// ==================== 边距样式 ====================

export interface PaddingStyle {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

// ==================== 控件类型枚举 ====================

export type ControlType = 
  | 'text'           // 文本
  | 'multiline_text' // 多行文本
  | 'field'          // 数据字段
  | 'calculated'     // 计算字段
  | 'image'          // 图片
  | 'line'           // 线条
  | 'rectangle'      // 矩形
  | 'page_number'    // 页码
  | 'current_date'   // 日期
  | 'barcode'        // 条形码
  | 'qrcode'         // 二维码
  | 'ellipse'        // 椭圆
  | 'star'           // 五角星
  | 'triangle'       // 三角形
  | 'diamond';       // 菱形

// ==================== 共性属性接口 ====================

/** 基础属性 - 所有控件必需 */
export interface BaseControlProps {
  id: string;
  type: ControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;  // 层级，默认为1
  printVisible?: boolean;  // 打印时是否可见，默认为true
}

/** 文本样式属性 - 用于文本类控件 (text, field, page_number, current_date) */
export interface TextStyleProps {
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  textVerticalAlign?: 'top' | 'middle' | 'bottom';
}

/** 容器样式属性 - 用于有背景/边框的控件 */
export interface ContainerStyleProps {
  background?: string;
  border?: BorderStyle;
  padding?: number | PaddingStyle;  // 支持统一边距或独立上下左右边距
  margin?: number;
}

// ==================== 各控件类型独立接口 ====================

/** 文本控件 */
export interface TextControl extends BaseControlProps, TextStyleProps, ContainerStyleProps {
  type: 'text';
  text?: string;
}

/** 多行文本控件 */
export interface MultilineTextControl extends BaseControlProps, TextStyleProps, ContainerStyleProps {
  type: 'multiline_text';
  text?: string;
}

/** 数据字段控件 */
export interface FieldControl extends BaseControlProps, TextStyleProps, ContainerStyleProps {
  type: 'field';
  fieldName?: string;    // 绑定的数据字段名
  text?: string;         // 默认文本/显示格式
  formatType?: 'number' | 'currency' | 'percent' | 'text';  // 格式化类型
  decimalPlaces?: number;     // 小数位数
}

/** 计算字段控件 */
export interface CalculatedControl extends BaseControlProps, TextStyleProps, ContainerStyleProps {
  type: 'calculated';
  formula?: string;           // 计算公式，如 "price * quantity"
  text?: string;              // 默认文本
  formatType?: 'number' | 'currency' | 'percent' | 'text';  // 格式化类型
  decimalPlaces?: number;     // 小数位数
}

/** 图片控件 */
export interface ImageControl extends BaseControlProps {
  type: 'image';
  src?: string;          // 图片地址（支持URL或base64）
  imageUrl?: string;     // 图片URL（兼容属性）
  alt?: string;          // 替代文本
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'repeat';  // 图片显示方式，新增 repeat 平铺
  border?: BorderStyle;
  padding?: number | PaddingStyle;  // 图片边距
  floating?: boolean;    // 浮动图片，以页面为基准定位（而非带区）
}

/** 线条控件 - 使用 SVG 实现，支持任意角度 */
export interface LineControl extends BaseControlProps {
  type: 'line';
  // 起点坐标（相对于带区）- 可选，兼容旧数据
  x1?: number;
  y1?: number;
  // 终点坐标（相对于带区）- 可选，兼容旧数据
  x2?: number;
  y2?: number;
  // 线条样式
  color?: string;        // 线条颜色
  strokeWidth?: number;  // 线条粗细
  lineStyle?: 'solid' | 'dashed' | 'dotted';  // 线段样式
}

/** 矩形控件 */
export interface RectangleControl extends BaseControlProps, ContainerStyleProps {
  type: 'rectangle';
  borderRadius?: number;  // 圆角半径
}

/** 页码控件 */
export interface PageNumberControl extends BaseControlProps, TextStyleProps, ContainerStyleProps {
  type: 'page_number';
  text?: string;         // 页码格式，如 "第 {page} 页 / 共 {total} 页"
}

/** 日期控件 */
export interface CurrentDateControl extends BaseControlProps, TextStyleProps, ContainerStyleProps {
  type: 'current_date';
  text?: string;         // 日期格式，如 "YYYY-MM-DD"
}

/** 条形码控件 */
export interface BarcodeControl extends BaseControlProps {
  type: 'barcode';
  text?: string;         // 静态条码内容
  fieldName?: string;    // 绑定的数据字段
  barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14';  // 条码类型
  showText?: boolean;    // 是否显示条码下方文字
  background?: string;   // 背景色
  lineColor?: string;    // 条码颜色
}

/** 二维码控件 */
export interface QRCodeControl extends BaseControlProps {
  type: 'qrcode';
  text?: string;         // 静态二维码内容
  fieldName?: string;    // 绑定的数据字段
  errorLevel?: 'L' | 'M' | 'Q' | 'H';  // 容错级别
  background?: string;   // 背景色
  foreground?: string;   // 前景色
}

/** 椭圆控件 */
export interface EllipseControl extends BaseControlProps, ContainerStyleProps {
  type: 'ellipse';
}

/** 五角星控件 */
export interface StarControl extends BaseControlProps, ContainerStyleProps {
  type: 'star';
}

/** 三角形控件 */
export interface TriangleControl extends BaseControlProps, ContainerStyleProps {
  type: 'triangle';
}

/** 菱形控件 */
export interface DiamondControl extends BaseControlProps, ContainerStyleProps {
  type: 'diamond';
}

// ==================== 控件对象类型 ====================

/** 控件对象 - 联合类型，严格类型检查 */
export type ControlObject = 
  | TextControl
  | MultilineTextControl
  | FieldControl
  | CalculatedControl
  | ImageControl
  | LineControl
  | RectangleControl
  | PageNumberControl
  | CurrentDateControl
  | BarcodeControl
  | QRCodeControl
  | EllipseControl
  | StarControl
  | TriangleControl
  | DiamondControl;

// ==================== 辅助类型 ====================

/** 获取联合类型中所有可能的键 */
type AllKeys<T> = T extends any ? keyof T : never;

/** 获取联合类型中某个键对应的所有可能值类型 */
type ValueOfKey<T, K extends string> = T extends { [P in K]?: infer V } | { [P in K]: infer V } ? V : never;

/** 非基础属性的键 */
type NonBaseKeys = Exclude<AllKeys<ControlObject>, keyof BaseControlProps>;

/** 
 * 控件对象通用类型 - 基础属性必需，其他属性可选
 * 用于需要访问多种属性的场景，如渲染函数、属性面板等
 */
export type ControlObjectAll = BaseControlProps & {
  [K in NonBaseKeys]?: ValueOfKey<ControlObject, K & string>;
};

// ==================== 控件类型配置 ====================

export interface ControlTypeConfig {
  id: ControlType;
  name: string;
  icon: string;
  category: 'basic' | 'field' | 'system' | 'decorator';
  defaultWidth: number;
  defaultHeight: number;
}

// ==================== 类型守卫函数 ====================

/** 判断是否为文本类控件（有文本样式属性） - 不包括富文本，因为富文本自带格式化工具 */
export const isTextStyleControl = (obj: ControlObject): obj is TextControl | FieldControl | CalculatedControl | PageNumberControl | CurrentDateControl => {
  return ['text', 'field', 'calculated', 'page_number', 'current_date'].includes(obj.type);
};

/** 判断是否为容器类控件（有背景/边框属性） - 不包括富文本，因为富文本自带格式化工具 */
export const isContainerStyleControl = (obj: ControlObject): obj is TextControl | FieldControl | CalculatedControl | RectangleControl | EllipseControl | StarControl | TriangleControl | DiamondControl | PageNumberControl | CurrentDateControl => {
  return ['text', 'field', 'calculated', 'rectangle', 'ellipse', 'star', 'triangle', 'diamond', 'page_number', 'current_date'].includes(obj.type);
};

/** 判断是否有边框属性 */
export const hasBorderControl = (obj: ControlObject): obj is TextControl | MultilineTextControl | FieldControl | CalculatedControl | ImageControl | LineControl | RectangleControl | EllipseControl | StarControl | TriangleControl | DiamondControl | PageNumberControl | CurrentDateControl | BarcodeControl | QRCodeControl => {
  return ['text', 'multiline_text', 'field', 'calculated', 'image', 'line', 'rectangle', 'ellipse', 'star', 'triangle', 'diamond', 'page_number', 'current_date', 'barcode', 'qrcode'].includes(obj.type);
};

/** 判断是否有字段绑定属性 */
export const hasFieldBinding = (obj: ControlObject): obj is FieldControl | BarcodeControl | QRCodeControl => {
  return ['field', 'barcode', 'qrcode'].includes(obj.type);
};

/** 获取控件的文本样式属性（安全访问） */
export const getTextStyleProps = (obj: ControlObject): TextStyleProps | null => {
  if (isTextStyleControl(obj)) {
    return {
      fontSize: obj.fontSize,
      color: obj.color,
      fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle,
      textAlign: obj.textAlign,
      lineHeight: obj.lineHeight,
      textVerticalAlign: obj.textVerticalAlign,
    };
  }
  return null;
};

/** 获取控件的容器样式属性（安全访问） */
export const getContainerStyleProps = (obj: ControlObject): ContainerStyleProps | null => {
  if (isContainerStyleControl(obj)) {
    return {
      background: obj.background,
      border: obj.border,
      padding: obj.padding,
      margin: obj.margin,
    };
  }
  return null;
};

/** 
 * 添加新控件步骤：
 * 1. 在 ControlType 中添加新类型
 * 2. 创建新控件的独立接口（如 NewControl extends BaseControlProps）
 * 3. 将新接口添加到 ControlObject 联合类型
 * 4. 在 constants.ts 的 controlTypes 数组中添加配置
 * 
 * 使用说明：
 * - ControlObject: 联合类型，用于存储和传递控件对象
 * - ControlObjectAll: 通用类型，用于需要访问多种属性的场景
 * - 类型守卫函数: isTextStyleControl, hasBorderControl 等，用于类型缩小
 */
