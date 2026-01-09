
// 从 controlTypes.ts 导入控件类型
import type {
  BorderStyle,
  ControlType,
  BaseControlProps,
  TextStyleProps,
  ContainerStyleProps,
  TextControl,
  MultilineTextControl,
  FieldControl,
  ImageControl,
  LineControl,
  RectangleControl,
  PageNumberControl,
  CurrentDateControl,
  BarcodeControl,
  EllipseControl,
  ControlObject,
  ControlObjectAll,
  ControlTypeConfig,
} from './controlTypes';

// 导出类型守卫函数
export {
  isTextStyleControl,
  isContainerStyleControl,
  hasBorderControl,
  hasFieldBinding,
  getTextStyleProps,
  getContainerStyleProps,
} from './controlTypes';

// 重新导出控件类型
export type {
  BorderStyle,
  ControlType,
  BaseControlProps,
  TextStyleProps,
  ContainerStyleProps,
  TextControl,
  MultilineTextControl,
  FieldControl,
  ImageControl,
  LineControl,
  RectangleControl,
  PageNumberControl,
  CurrentDateControl,
  BarcodeControl,
  EllipseControl,
  ControlObject,
  ControlObjectAll,
  ControlTypeConfig,
};


export interface Band {
    id: 'header' | 'detail' | 'summary' | 'footer';
     name: string;
     type: string;
     top: number;
     bottom: number;
     actualBottom: number;
     visible: boolean;
     objects: ControlObject[];
     rowCount?: number; // 明细带行数
     rowHeight?: number; // 明细带单行高度
     offsetY?: number; // 用于记录拖动时的偏移量
     backgroundColor?: string; // 带区背景色
     backgroundColorFormula?: string; // 背景色公式（仅明细/汇总带区，返回颜色值）
     rowHeightFormula?: string; // 行高公式（仅明细/汇总带区，返回数值）
    [key: string]: any;
}



export interface DesignerOptions {
  minBandHeight: number;
  defaultBandHeight: number;
  showGrid: boolean;
  gridSize: number;
  bandSpacing: number;
}

export interface DesignerState {
    draggingBoundary: string | null;
    selectedBand: string | null;
    selectedObject: string | null;
    showBands: boolean;
    showGrid: boolean;
    showGuides: boolean;
    zoomLevel: number;
    showRulers: boolean;
    showPageMargins: boolean;
}

export interface DataField {
    name: string;
    label: string;
    type: 'string' | 'number' | 'currency' | 'date';
    /** 数据来源: master-主表字段, detail-明细字段 */
    source: 'master' | 'detail';
}

// 页面设置类型
export interface PageSettings {
    /** 纸张类型 */
    paperSize: 'A4' | 'A3' | 'A5' | 'B4' | 'B5' | 'Letter' | 'Legal' | 'Custom';
    /** 纸张宽度（mm 或 inch，根据 unit） */
    width: number;
    /** 纸张高度（mm 或 inch，根据 unit） */
    height: number;
    /** 单位 */
    unit: 'mm' | 'in';
    /** 页边距 */
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    /** 纸张方向 */
    orientation: 'portrait' | 'landscape';
}

export interface BandBoundaryDesignerProps {
    options?: Partial<DesignerOptions>;
    initialDesign?: Band[];
    onDesignChange?: (bands: Band[]) => void;
    onSave?: (design: any) => void;
    onPreview?: () => void;
    /** 预览数据源 */
    data?: Record<string, any>;
    dataFields: DataField[];
    /** 初始页面设置 */
    initialPageSettings?: PageSettings;
    /** 页面设置变更回调 */
    onPageSettingsChange?: (settings: PageSettings) => void;
}