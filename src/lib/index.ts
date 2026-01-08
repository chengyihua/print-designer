// 主组件
export { default as BandBoundaryDesigner } from '../components/BandBoundaryDesigner';
export { default as PrintPreview } from '../components/PrintPreview';

// 辅助组件
export { default as ObjectPropertyPanel } from '../components/ObjectPropertyPanel';
export { default as BandPropertyPanel } from '../components/BandPropertyPanel';
export { default as Toolbar } from '../components/Toolbar';
export { default as CanvasArea } from '../components/CanvasArea';
export { default as ColorPicker } from '../components/ColorPicker';
export { default as FormulaEditor } from '../components/FormulaEditor';
export { default as RichTextEditor } from '../components/RichTextEditor';

// 类型导出
export type {
    Band,
    ControlObject,
    ControlObjectAll,
    DataField,
    DesignerOptions,
    DesignerState,
    BandBoundaryDesignerProps,
} from '../types/types';

// 常量导出
export {
    controlTypes,
    defaultBands,
    defaultOptions,
    fontWeightOptions,
    fontStyleOptions,
    textAlignOptions,
    textVerticalAlignOptions,
    borderStyles,
    lineStyleOptions,
    dateFormatOptions,
    formatTypeOptions,
    imageObjectFitOptions,
    barcodeTypeOptions,
    qrcodeErrorLevelOptions,
    bandTypeOptions,
    pageSizePresets,
    marginPresets,
    defaultFontSettings,
    getDetailDataKey,
} from '../types/constants';

// 工具函数导出
export {
    getBandObjectsRenderData,
    getObjectRenderData,
    getObjectContent,
} from '../utils/renderUtils';

export {
    evaluateFormula,
    validateFormula,
    registerFunction,
    getRegisteredFunctions,
} from '../utils/formulaUtils';

// Hooks 导出
export { useBandDesigner } from '../hooks/useBandDesigner';
export { default as useHistory } from '../hooks/useHistory';
