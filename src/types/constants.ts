import { ControlTypeConfig, DataField, Band, DesignerOptions } from './types';

// A4纸张尺寸常量
export const A4_WIDTH = 210; // A4纸宽度(像素) 210mm * 3.78px/mm
export const A4_HEIGHT = 297; // A4纸高度(像素) 297mm * 3.78px/mm
export const PAGE_MARGINS = {
  top: 10,    // 上边距 10mm
  bottom: 10, // 下边距 10mm
  left: 10,   // 左边距 10mm  
  right: 10,  // 右边距 10mm
};


// 默认设计器选项
export const defaultOptions: DesignerOptions = {
    minBandHeight: 0,
    defaultBandHeight: 0,
    showGrid: true,
    gridSize: 8,
    bandSpacing: 20,
};

// 默认带区配置
export const defaultBands: Band[] = [
    {
        id: 'header',
        name: '头部带',
        type: 'header',
        top: 0,
        bottom: 50,
        actualBottom: 50,
        visible: true,
        objects: [],
    },
    {
        id: 'detail',
        name: '明细带',
        type: 'detail',
        top: 60, // header.bottom + spacing
        bottom: 120,
        actualBottom: 120,
        visible: true,
        objects: [],
    },
    {
        id: 'summary',
        name: '汇总带',
        type: 'summary',
        top: 130, // detail.bottom + spacing
        bottom: 200,
        actualBottom: 200,
        visible: true,
        objects: [],
    },
    {
        id: 'footer',
        name: '脚注带',
        type: 'footer',
        top: 210, // summary.bottom + spacing
        bottom: 270,
        actualBottom: 270,
        visible: true,
        objects: [],
    },
];

// 控件类型配置
export const controlTypes: ControlTypeConfig[] = [
    { 
        id: 'text', 
        name: '文本', 
        icon: 'T', 
        category: 'basic', 
        defaultWidth: 100, 
        defaultHeight: 30 
    },
    { 
        id: 'multiline_text', 
        name: '多行文本', 
        icon: '≡', 
        category: 'basic', 
        defaultWidth: 150, 
        defaultHeight: 60 
    },
    { 
        id: 'field', 
        name: '数据字段', 
        icon: 'F', 
        category: 'field', 
        defaultWidth: 120, 
        defaultHeight: 30 
    },
    { 
        id: 'calculated', 
        name: '计算字段', 
        icon: 'Σ', 
        category: 'field', 
        defaultWidth: 120, 
        defaultHeight: 30 
    },
    { 
        id: 'image', 
        name: '图片', 
        icon: '📷', 
        category: 'basic', 
        defaultWidth: 100, 
        defaultHeight: 100 
    },
    { 
        id: 'line', 
        name: '线条', 
        icon: '━', 
        category: 'decorator', 
        defaultWidth: 200, 
        defaultHeight: 1 
    },
    { 
        id: 'rectangle', 
        name: '矩形', 
        icon: '▢', 
        category: 'decorator', 
        defaultWidth: 150, 
        defaultHeight: 100 
    },
    { 
        id: 'page_number', 
        name: '页码', 
        icon: '#', 
        category: 'system', 
        defaultWidth: 100, 
        defaultHeight: 25 
    },
    { 
        id: 'current_date', 
        name: '日期时间', 
        icon: '📅', 
        category: 'system', 
        defaultWidth: 150, 
        defaultHeight: 25 
    },
    { 
        id: 'barcode', 
        name: '条形码', 
        icon: '❙', 
        category: 'system', 
        defaultWidth: 150, 
        defaultHeight: 60 
    },
    { 
        id: 'qrcode', 
        name: '二维码', 
        icon: '▦', 
        category: 'system', 
        defaultWidth: 80, 
        defaultHeight: 80 
    },
    { 
        id: 'ellipse', 
        name: '椭圆', 
        icon: '○', 
        category: 'decorator', 
        defaultWidth: 120, 
        defaultHeight: 80 
    },
    { 
        id: 'star', 
        name: '五角星', 
        icon: '☆', 
        category: 'decorator', 
        defaultWidth: 60, 
        defaultHeight: 60 
    },
    { 
        id: 'triangle', 
        name: '三角形', 
        icon: '△', 
        category: 'decorator', 
        defaultWidth: 60, 
        defaultHeight: 60 
    },
    { 
        id: 'diamond', 
        name: '菱形', 
        icon: '◇', 
        category: 'decorator', 
        defaultWidth: 60, 
        defaultHeight: 60 
    },
];

/**
 * 从 dataFields 中自动推断明细数据源的 key
 * 例如: products.name → products
 */
export const getDetailDataKey = (dataFields: DataField[]): string | null => {
    const detailField = dataFields.find(f => f.source === 'detail');
    if (detailField && detailField.name.includes('.')) {
        return detailField.name.split('.')[0];
    }
    return null;
};

/** 明细数据源 key，从字段定义中自动推断 */

// 控件分类映射
export const controlCategories = {
    basic: '基本控件',
    field: '数据字段',
    system: '系统字段',
    decorator: '装饰控件',
} as const;

// 边框样式选项
export const borderStyles = [
    { value: 'none', label: '无' },
    { value: 'solid', label: '实线' },
    { value: 'dashed', label: '虚线' },
    { value: 'dotted', label: '点线' },
    { value: 'double', label: '双线' },
    { value: 'groove', label: '凹槽' },
    { value: 'ridge', label: '凸槽' },
    { value: 'inset', label: '内嵌' },
    { value: 'outset', label: '外凸' },
];

// 文本对齐选项
export const textAlignOptions = [
    { value: 'left', label: '左对齐' },
    { value: 'center', label: '居中' },
    { value: 'right', label: '右对齐' },
    { value: 'justify', label: '两端对齐' },
];

// 文本上下对齐选项
export const textVerticalAlignOptions = [
    { value: 'top', label: '顶部对齐' },
    { value: 'middle', label: '居中对齐' },
    { value: 'bottom', label: '底部对齐' },
];

export const DEFAULT_TEXT_VERTICAL_ALIGN: 'top' | 'middle' | 'bottom' = 'top';
// 字体粗细选项
export const fontWeightOptions = [
    { value: 'normal', label: '正常' },
    { value: 'bold', label: '粗体' },
    { value: 'bolder', label: '加粗' },
    { value: 'lighter', label: '细体' },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: '300', label: '300' },
    { value: '400', label: '400' },
    { value: '500', label: '500' },
    { value: '600', label: '600' },
    { value: '700', label: '700' },
    { value: '800', label: '800' },
    { value: '900', label: '900' },
];

// 字体样式选项
export const fontStyleOptions = [
    { value: 'normal', label: '正常' },
    { value: 'italic', label: '斜体' },
    { value: 'oblique', label: '倾斜' },
];

// 日期格式选项
export const dateFormatOptions = [
    { value: 'yyyy-MM-dd', label: '年-月-日 (2026-01-07)' },
    { value: 'yyyy/MM/dd', label: '年/月/日 (2026/01/07)' },
    { value: 'yyyy年MM月dd日', label: '中文日期 (2026年01月07日)' },
    { value: 'yyyy-MM-dd HH:mm', label: '年-月-日 时:分' },
    { value: 'yyyy-MM-dd HH:mm:ss', label: '年-月-日 时:分:秒' },
    { value: 'yyyy年MM月dd日 HH:mm:ss', label: '中文日期时间' },
];

// 数据格式化类型选项
export const formatTypeOptions = [
    { value: 'text', label: '文本' },
    { value: 'number', label: '数字' },
    { value: 'currency', label: '货币' },
    { value: 'percent', label: '百分比' },
];

// 图片显示方式选项
export const imageObjectFitOptions = [
    { value: 'contain', label: '保持比例（完整显示）' },
    { value: 'cover', label: '保持比例（填充裁剪）' },
    { value: 'fill', label: '拉伸填充' },
    { value: 'none', label: '原始尺寸' },
    { value: 'repeat', label: '平铺' },
];

// 条码类型选项
export const barcodeTypeOptions = [
    { value: 'CODE128', label: 'CODE128' },
    { value: 'CODE39', label: 'CODE39' },
    { value: 'EAN13', label: 'EAN13' },
    { value: 'EAN8', label: 'EAN8' },
    { value: 'UPC', label: 'UPC' },
    { value: 'ITF14', label: 'ITF14' },
];

// 二维码纠错级别选项
export const qrcodeErrorLevelOptions = [
    { value: 'L', label: '低 (7%)' },
    { value: 'M', label: '中 (15%)' },
    { value: 'Q', label: '较高 (25%)' },
    { value: 'H', label: '高 (30%)' },
];

// 线条样式选项
export const lineStyleOptions = [
    { value: 'solid', label: '实线' },
    { value: 'dashed', label: '虚线' },
    { value: 'dotted', label: '点线' },
];

// 带区类型选项
export const bandTypeOptions = [
    { value: 'header', label: '头部带' },
    { value: 'detail', label: '明细带' },
    { value: 'summary', label: '汇总带' },
    { value: 'footer', label: '脚注带' },
];

// 汇总带显示模式选项
export const summaryDisplayOptions = [
    { value: 'atEnd', label: '在所有明细后显示' },
    { value: 'perPage', label: '每页底部显示' },
    { value: 'perGroup', label: '每组后显示' },
];

// 纸张尺寸预设
export const pageSizePresets = {
    A4: { width: 210, height: 297, name: 'A4 (210mm × 297mm)' , unit:"mm"},
    A3: { width: 297, height: 420, name: 'A3 (297mm × 420mm)' , unit:"mm"},
    A5: { width: 148, height: 210, name: 'A5 (148mm × 210mm)' , unit:"mm"},
    B4: { width: 250, height: 353, name: 'B4 (250mm × 353mm)' , unit:"mm"},
    B5: { width: 176, height: 250, name: 'B5 (176mm × 250mm)' , unit:"mm"},
    Letter: { width: 8.5, height: 11, name: 'Letter (8.5" × 11")' , unit:"in"},
    Legal: { width: 8.5, height: 14, name: 'Legal (8.5" × 14")' , unit:"in"},
} as const;

// 边距预设
export const marginPresets = {
    normal: { top: 10, right: 10, bottom: 10, left: 10, name: '正常 (10mm)' ,type:'mm'},
    narrow: { top: 5, right: 5, bottom: 5, left: 5, name: '窄 (5mm)', type:'mm' },
    wide: { top: 15, right: 15, bottom: 15, left: 15, name: '宽 (15mm)', type:'mm' },
    custom: { top: 0, right: 0, bottom: 0, left: 0, name: '自定义' , type:'custom'},
} as const;

// 默认字体设置
export const defaultFontSettings = {
    fontFamily: 'Microsoft YaHei, Arial, sans-serif',
    fontSize: 12,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    color: '#000000',
    lineHeight: 1.2,
};

// 默认颜色预设
export const colorPresets = [
    '#000000', // 黑色
    '#333333', // 深灰
    '#666666', // 中灰
    '#999999', // 浅灰
    '#CCCCCC', // 淡灰
    '#FFFFFF', // 白色
    '#FF0000', // 红色
    '#FF6B6B', // 浅红
    '#FFA500', // 橙色
    '#FFD700', // 金色
    '#FFFF00', // 黄色
    '#90EE90', // 浅绿
    '#008000', // 绿色
    '#00FFFF', // 青色
    '#00BFFF', // 深天蓝
    '#0000FF', // 蓝色
    '#4d90fe', // 浅蓝
    '#8A2BE2', // 蓝紫
    '#FF00FF', // 品红
    '#FFC0CB', // 粉红
    '#FF6347', // 番茄色
    '#32CD32', // 酸橙色
    '#20B2AA', // 浅海绿
    '#4682B4', // 钢蓝色
    '#6A5ACD', // 板岩蓝
    '#D2691E', // 巧克力色
    '#A0522D', // 赭色
    '#CD853F', // 秘鲁色
];

// 默认背景色预设
export const backgroundColorPresets = [
    'transparent',
    '#FFFFFF',
    '#F5F5F5',
    '#F0F0F0',
    '#E8E8E8',
    '#E0E0E0',
    '#F8F9FA',
    '#F0F7FF',
    '#F0FFF0',
    '#FFF0F5',
    '#FFF5EE',
    '#F5FFFA',
    '#F0FFFF',
    '#F5F5DC',
    '#FAFAD2',
    '#FAF0E6',
];

// 系统字段的默认格式
export const systemFieldFormats = {
    page_number: '第{page}页/共{total}页',
    current_date: 'yyyy年MM月dd日',
    current_time: 'HH:mm:ss',
    current_datetime: 'yyyy年MM月dd日 HH:mm:ss',
} as const;

// 数据字段类型图标映射
export const fieldTypeIcons = {
    string: '🔤',
    number: '🔢',
    currency: '💰',
    date: '📅',
    time: '⏰',
    boolean: '✅',
} as const;

// 控件类型默认样式（统一：无边框、背景透明、文字黑色）
export const controlTypeDefaultStyles: Record<string, any> = {
    text: {
        fontSize: 14,
        color: '#000000',
        textAlign: 'left',
        background: 'transparent',
    },
    field: {
        fontSize: 12,
        color: '#000000',
        textAlign: 'left',
        background: 'transparent',
    },
    calculated: {
        fontSize: 12,
        color: '#000000',
        textAlign: 'left',
        background: 'transparent',
    },
    page_number: {
        fontSize: 12,
        color: '#000000',
        textAlign: 'center',
        background: 'transparent',
    },
    current_date: {
        fontSize: 12,
        color: '#000000',
        textAlign: 'right',
        background: 'transparent',
    },
    line: {
        background: '#000000',
        height: 2,
    },
    rectangle: {
        background: 'transparent',
    },
    image: {
        background: 'transparent',
    },
    barcode: {
        barcodeType: 'CODE128',
        showText: true,
        background: '#FFFFFF',
        lineColor: '#000000',
    },
    qrcode: {
        errorLevel: 'M',
        background: '#FFFFFF',
        foreground: '#000000',
    },
};

// 默认设计器状态
export const defaultDesignerState = {
    draggingBoundary: null,
    selectedBand: null,
    selectedObject: null,
    showBands: true,
    showGrid: true,
    showGuides: true,
    zoomLevel: 1,
    showRulers: true,
    showPageMargins: true,
    snapToGrid: true,
    showObjectBorders: true,
    showBandLabels: true,
    showDebugInfo: false,
} as const;

// 键盘快捷键映射
export const keyboardShortcuts = {
    selectAll: 'Ctrl+A',
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
    cut: 'Ctrl+X',
    delete: 'Delete',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    save: 'Ctrl+S',
    preview: 'Ctrl+P',
    zoomIn: 'Ctrl+=',
    zoomOut: 'Ctrl+-',
    zoomReset: 'Ctrl+0',
    duplicate: 'Ctrl+D',
    group: 'Ctrl+G',
    ungroup: 'Ctrl+Shift+G',
    bringToFront: 'Ctrl+Shift+]',
    sendToBack: 'Ctrl+Shift+[',
    bringForward: 'Ctrl+]',
    sendBackward: 'Ctrl+[',
    alignLeft: 'Ctrl+Shift+L',
    alignCenter: 'Ctrl+Shift+C',
    alignRight: 'Ctrl+Shift+R',
    alignTop: 'Ctrl+Shift+T',
    alignMiddle: 'Ctrl+Shift+M',
    alignBottom: 'Ctrl+Shift+B',
} as const;

const allConstants = {
    A4_WIDTH,
    A4_HEIGHT,
    PAGE_MARGINS,
    defaultOptions,
    defaultBands,
    controlTypes,
    controlCategories,
    borderStyles,
    textAlignOptions,
    textVerticalAlignOptions,
    fontWeightOptions,
    fontStyleOptions,
    dateFormatOptions,
    formatTypeOptions,
    imageObjectFitOptions,
    barcodeTypeOptions,
    qrcodeErrorLevelOptions,
    lineStyleOptions,
    bandTypeOptions,
    summaryDisplayOptions,
    pageSizePresets,
    marginPresets,
    defaultFontSettings,
    colorPresets,
    backgroundColorPresets,
    systemFieldFormats,
    fieldTypeIcons,
    controlTypeDefaultStyles,
    defaultDesignerState,
    keyboardShortcuts,
};

export default allConstants;