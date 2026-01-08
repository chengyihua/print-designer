// renderUtils.ts
import React from 'react';
import { Band, ControlObject, ControlObjectAll, DataField } from './../types/types';
import { evaluateFormula } from './formulaUtils';

/**
 * 渲染对象的通用工具函数
 * 用于设计和预览时的统一渲染
 * 
 * 注：函数参数使用 ControlObjectAll 类型，因为需要访问多种控件的属性
 */

/**
 * 根据字段名获取字段类型
 * 从 dataFields 中查找字段定义
 */
const getFieldType = (dataFields: DataField[], fieldName: string): string => {
    const field = dataFields.find(f => f.name === fieldName);
    return field?.type || 'string';
};

/**
 * 根据字段名获取中文标签
 * 用于设计模式显示
 */
const getFieldNameLabel = (dataFields: DataField[], fieldName: string): string => {
    const field = dataFields.find(f => f.name === fieldName);
    if (field) return field.label;
    // 如果找不到，尝试用字段名的最后一部分查找
    if (fieldName.includes('.')) {
        const actualName = fieldName.split('.')[1];
        const matchedField = dataFields.find(f => f.name.endsWith('.' + actualName));
        if (matchedField) return matchedField.label;
    }
    return fieldName;
};

/**
 * 根据字段类型格式化值
 */
const formatFieldValue = (value: any, fieldType: string): string => {
    if (value === undefined || value === null) return '';
    
    switch (fieldType) {
        case 'currency':
            if (typeof value === 'number') {
                return `¥${value.toLocaleString('zh-CN')}`;
            }
            return String(value);
        case 'number':
            if (typeof value === 'number') {
                return value.toLocaleString('zh-CN');
            }
            return String(value);
        case 'date':
            if (value instanceof Date) {
                return value.toLocaleDateString('zh-CN');
            }
            return String(value);
        case 'string':
        default:
            return String(value);
    }
};

/**
 * 格式化日期时间
 * 支持格式: yyyy-MM-dd, yyyy/MM/dd, yyyy年MM月dd日, HH:mm:ss 等
 */
const formatDateTime = (date: Date, format: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
        .replace(/yyyy/g, String(year))
        .replace(/MM/g, month)
        .replace(/dd/g, day)
        .replace(/HH/g, hours)
        .replace(/mm/g, minutes)
        .replace(/ss/g, seconds);
};

// 计算对象的裁剪路径
export const calculateClipPath = (
    obj: ControlObjectAll,
    band: Band
): React.CSSProperties['clipPath'] => {
    const objectTop = obj.y;
    const objectBottom = objectTop + obj.height;
    const bandTop = band.top;
    const bandBottom = band.actualBottom;

    if (objectBottom > bandTop && objectTop < bandBottom) {
        const visibleTop = Math.max(objectTop, bandTop);
        const visibleBottom = Math.min(objectBottom, bandBottom);
        const clipTop = visibleTop - objectTop;
        const clipBottom = objectBottom - visibleBottom;
        return `inset(${clipTop}px 0 ${clipBottom}px 0)`;
    }
    return undefined;
};

// 获取对象内容
export const getObjectContent = (
    obj: ControlObjectAll,
    context: {
        dataFields?: DataField[];
        data?: any;
        currentPage?: number;
        totalPages?: number;
        startIndex?: number;
        rowIndex?: number;
        /** 当前页条数 */
        pageSize?: number;
    } = {}
): string => {
    const { data = {}, currentPage = 1, totalPages = 1, startIndex = 0, rowIndex = 0, pageSize = 0 } = context;
    
    // 辅助函数：从字段路径获取数据源
    const getDataSource = (prefix: string): any[] => {
        if (data[prefix] && Array.isArray(data[prefix])) {
            return data[prefix];
        }
        return [];
    };
    
    // 当前行数据：从字段路径动态获取
    const getCurrentItem = (prefix: string): any => {
        const items = getDataSource(prefix);
        return items[startIndex + rowIndex] || null;
    };

    switch (obj.type) {
        case 'text':
        case 'multiline_text':
            return obj.text || '';
            
        case 'field':
            const fieldName = obj.fieldName || '';
            const fieldType = getFieldType(context.dataFields || [], fieldName);
        
            // 处理路径格式的字段，如 products.name、items.qty 等
            if (fieldName.includes('.')) {
                const [prefix, actualFieldName] = fieldName.split('.');
                const currentItem = getCurrentItem(prefix);
                
                // 明细行渲染时，从当前行数据获取
                if (currentItem && currentItem[actualFieldName] !== undefined) {
                    return formatFieldValue(currentItem[actualFieldName], fieldType);
                }
                
                // 设计模式预览：从主数据的嵌套数组中获取第一条
                const items = getDataSource(prefix);
                if (items.length > 0 && items[0][actualFieldName] !== undefined) {
                    return formatFieldValue(items[0][actualFieldName], fieldType);
                }
                // 显示中文标签
                return `{${getFieldNameLabel(context.dataFields || [], fieldName)}}`;
            }
            
            // 普通字段：从主数据获取
            const value = data[fieldName];
            if (value !== undefined) {
                return formatFieldValue(value, fieldType);
            }
            // 显示中文标签
            return `{${getFieldNameLabel(context.dataFields || [], fieldName)}}`;
        
        case 'calculated':
            return evaluateFormula(
                obj.formula || '',
                { data, currentPage, totalPages, rowIndex: startIndex + rowIndex, startIndex, pageSize },
                { formatType: obj.formatType, decimalPlaces: obj.decimalPlaces }
            );
            
        case 'page_number':
            return `第${currentPage}页/共${totalPages}页`;
            
        case 'current_date':
            return formatDateTime(new Date(), obj.text || 'yyyy-MM-dd');
            
        case 'image':
            return '[图片]';
            
        case 'line':
        case 'rectangle':
            return '';

        case 'barcode':
        case 'qrcode':
            // 条码/二维码：优先使用绑定字段的值，否则使用静态 text
            const barcodeFieldName = obj.fieldName || '';
            if (barcodeFieldName) {
                const barcodeFieldType = getFieldType(context.dataFields || [], barcodeFieldName);
                // 处理路径格式的字段，如 products.name
                if (barcodeFieldName.includes('.')) {
                    const [prefix, actualFieldName] = barcodeFieldName.split('.');
                    const currentItem = getCurrentItem(prefix);
                    if (currentItem && currentItem[actualFieldName] !== undefined) {
                        return formatFieldValue(currentItem[actualFieldName], barcodeFieldType);
                    }
                    const items = getDataSource(prefix);
                    if (items.length > 0 && items[0][actualFieldName] !== undefined) {
                        return formatFieldValue(items[0][actualFieldName], barcodeFieldType);
                    }
                } else {
                    // 普通字段
                    const barcodeValue = data[barcodeFieldName];
                    if (barcodeValue !== undefined) {
                        return formatFieldValue(barcodeValue, barcodeFieldType);
                    }
                }
            }
            // 无绑定字段或字段无值时，返回静态 text
            return obj.text || '';
            
        default:
            return '';
    }
};

// 根据垂直对齐方式生成样式
export const getVerticalAlignStyle = (
    obj: ControlObjectAll,
    baseStyle: React.CSSProperties
): React.CSSProperties => {
    const align = obj.textVerticalAlign || baseStyle.verticalAlign || 'middle';
    const textAlign = baseStyle.textAlign || 'left';
    
    // 判断是否是需要垂直对齐的文本元素
    const isTextElement = ['text', 'multiline_text', 'field', 'calculated', 'page_number', 'current_date'].includes(obj.type);
    
    if (!isTextElement) {
        return {};
    }
    
    switch (align) {
        case 'top':
            return {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: textAlign === 'center' ? 'center' : 
                         textAlign === 'right' ? 'flex-end' : 'flex-start',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                margin: 0,
                padding: 0,
            };
        case 'bottom':
            return {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: textAlign === 'center' ? 'center' : 
                         textAlign === 'right' ? 'flex-end' : 'flex-start',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                margin: 0,
                padding: 0,
            };
        case 'middle':
        default:
            return {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: textAlign === 'center' ? 'center' : 
                         textAlign === 'right' ? 'flex-end' : 'flex-start',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                margin: 0,
                padding: 0,
            };
    }
};

// 生成对象的基础样式
export const getBaseObjectStyle = (
    obj: ControlObjectAll,
    options: {
        isSelected?: boolean;
        isPreview?: boolean;
    } = {}
): React.CSSProperties => {
    const { isSelected = false, isPreview = false } = options;
    
    const style: React.CSSProperties = {
        fontSize: obj.fontSize || 12,
        color: obj.color || '#000000',
        backgroundColor: obj.background || 'transparent',
        fontWeight: obj.fontWeight || 'normal',
        fontStyle: obj.fontStyle || 'normal',
        textAlign: obj.textAlign || 'left',
        lineHeight: obj.lineHeight || 1.2,
    };

    // 处理 padding：支持数字或对象类型
    if (typeof obj.padding === 'object' && obj.padding) {
        // 独立的上右下左边距
        const pt = obj.padding.top ?? 0;
        const pr = obj.padding.right ?? 0;
        const pb = obj.padding.bottom ?? 0;
        const pl = obj.padding.left ?? 0;
        style.padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
    } else {
        // 统一边距，默认为0
        style.padding = obj.padding ?? 0;
    }

    // 边框显示规则：以边框宽度为标准，宽度 > 0 就显示边框
    const border = obj.border;
    
    if (border && border.width && border.width > 0) {
        const borderWidth = border.width;
        const borderStyle = (border.style && border.style !== 'none') ? border.style : 'solid';
        // 边框颜色：如果是 transparent 或未设置，默认使用黑色
        const borderColor = (border.color && border.color !== 'transparent') ? border.color : '#000000';
        style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
    }

    // 特殊类型样式
    switch (obj.type) {
        case 'multiline_text':
            style.whiteSpace = 'pre-wrap';
            style.wordBreak = 'break-word';
            break;
        case 'field':
        case 'calculated':
            // 不再设置默认边框，统一为无边框
            break;
        case 'page_number':
        case 'current_date':
            style.color = style.color || '#666666';
            break;
        case 'image':
            // 图片默认无边框，用户可通过属性面板设置
            style.display = 'flex';
            style.alignItems = 'center';
            style.justifyContent = 'center';
            style.overflow = 'hidden';
            break;
        case 'line':
            // 线条现在使用 SVG 单独渲染，此处不再处理
            break;
        case 'rectangle':
            if (!obj.border) {
                style.border = '1px solid #000000';
            }
            // 应用圆角
            if (obj.borderRadius && obj.borderRadius > 0) {
                style.borderRadius = `${obj.borderRadius}px`;
            }
            break;
        case 'ellipse':
            // 椭圆使用 50% 圆角
            style.borderRadius = '50%';
            // 椭圆边框最小为1
            if (!border || !border.width || border.width < 1) {
                style.border = '1px solid #000000';
            }
            break;
        case 'star':
            // 五角星使用 clip-path
            style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
            // 形状控件必须有背景色才能显示
            if (!style.backgroundColor || style.backgroundColor === 'transparent') {
                style.backgroundColor = '#FFD700';
            }
            break;
        case 'triangle':
            // 三角形使用 clip-path
            style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            if (!style.backgroundColor || style.backgroundColor === 'transparent') {
                style.backgroundColor = '#000000';
            }
            break;
        case 'diamond':
            // 菱形使用 clip-path
            style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
            if (!style.backgroundColor || style.backgroundColor === 'transparent') {
                style.backgroundColor = '#000000';
            }
            break;
    }

    if (!isPreview && isSelected) {
        style.outline = '1px solid #4d90fe';
        style.zIndex = 1000;
    }

    return style;
};

// 创建对象内容包装器（用于垂直对齐）
export const createObjectContentWrapper = (
    content: string,
    obj: ControlObject,
    baseStyle: React.CSSProperties
): React.ReactElement | string => {
    // 判断是否是需要垂直对齐的文本元素
    const isTextElement = ['text', 'multiline_text', 'field', 'calculated', 'page_number', 'current_date'].includes(obj.type);
    
    if (!isTextElement) {
        return content;
    }
    
    const verticalAlignStyle = getVerticalAlignStyle(obj, baseStyle);
    
    // 如果有垂直对齐样式，创建包装器
    if (Object.keys(verticalAlignStyle).length > 0) {
        const contentStyle: React.CSSProperties = {
            padding: baseStyle.padding,
            boxSizing: 'border-box',
            width: '100%',
            textAlign: baseStyle.textAlign,
            lineHeight: baseStyle.lineHeight,
            whiteSpace: obj.type === 'multiline_text' ? 'normal' : 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
        };
        
        // 多行文本使用 dangerouslySetInnerHTML 渲染 HTML
        if (obj.type === 'multiline_text') {
            return React.createElement(
                'div',
                {
                    style: verticalAlignStyle,
                    className: 'text-content-wrapper',
                },
                React.createElement(
                    'div',
                    {
                        style: contentStyle,
                        className: 'text-content rich-text-content',
                        dangerouslySetInnerHTML: { __html: content },
                    }
                )
            );
        }
        
        return React.createElement(
            'div',
            {
                style: verticalAlignStyle,
                className: 'text-content-wrapper',
            },
            React.createElement(
                'div',
                {
                    style: contentStyle,
                    className: 'text-content',
                },
                content
            )
        );
    }
    
    // 多行文本无垂直对齐时也需要渲染 HTML
    if (obj.type === 'multiline_text') {
        return React.createElement(
            'div',
            {
                className: 'rich-text-content',
                dangerouslySetInnerHTML: { __html: content },
            }
        );
    }
    
    return content;
};

// 获取对象渲染数据
export interface ObjectRenderData {
    content: string;
    style: React.CSSProperties;
    wrappedContent?: React.ReactElement | string;
}

export const getObjectCompleteStyle = (
    obj: ControlObjectAll,
    baseStyle: React.CSSProperties,
    isTextElement: boolean = false
): React.CSSProperties => {
    if (!isTextElement) {
        return baseStyle;
    }
    
    // 获取对齐值，默认居中
    const verticalAlign = obj.textVerticalAlign || 'middle';
    const textAlign = obj.textAlign || 'left';
    
    return {
        ...baseStyle,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: verticalAlign === 'top' ? 'flex-start' 
                   : verticalAlign === 'bottom' ? 'flex-end' 
                   : 'center',
        alignItems: textAlign === 'center' ? 'center' 
                 : textAlign === 'right' ? 'flex-end' 
                 : 'flex-start',
    };
};

export const getObjectRenderData = (
    obj: ControlObjectAll,
    band: Band,
    options: {
        isSelected?: boolean;
        isPreview?: boolean;
        data?: any;
        currentPage?: number;
        totalPages?: number;
        startIndex?: number;
        rowIndex?: number;
        includeClipPath?: boolean;
        /** 当前页条数 */
        pageSize?: number;
        /** 数据字段定义 */
        dataFields?: DataField[];
    } = {}
): ObjectRenderData => {
    const {
        isSelected = false,
        isPreview = false,
        data = {},
        currentPage = 1,
        totalPages = 1,
        startIndex = 0,
        rowIndex = 0,
        includeClipPath = true,
        pageSize = 0,
        dataFields = [],
    } = options;

    const content = getObjectContent(obj, {
        data,
        currentPage,
        totalPages,
        startIndex,
        rowIndex,
        pageSize,
        dataFields,
    });

    const baseStyle = getBaseObjectStyle(obj, { isSelected, isPreview });
    const positionStyle: React.CSSProperties = {
        position: 'absolute' as const,
        left: obj.x,
        top: obj.y - band.top,
        width: obj.width,
        height: obj.height,
        zIndex: obj.zIndex ?? 1,  // 应用层级，默认为1
    };
    const finalStyle: React.CSSProperties = {
        ...positionStyle,
        ...baseStyle,
    };

    const isTextElement = ['text', 'field', 'calculated', 'page_number', 'current_date'].includes(obj.type);
    if (isTextElement) {
        // 移除flex相关样式，让包装器处理
        delete finalStyle.display;
        delete finalStyle.alignItems;
        delete finalStyle.justifyContent;
        delete finalStyle.flexDirection;
    }


    // 形状控件和浮动图片不应用带区裁剪
    const shapeTypes = ['star', 'triangle', 'diamond'];
    const isFloatingImage = obj.type === 'image' && obj.floating === true;
    if (includeClipPath && !shapeTypes.includes(obj.type) && !isFloatingImage) {
        const clipPath = calculateClipPath(obj, band);
        if (clipPath) {
            finalStyle.clipPath = clipPath;
        }
    }

const wrappedContent = createObjectContentWrapper(content, obj, baseStyle);

    return {
        content,
        style: finalStyle,
        wrappedContent,
    };
};

// 获取带区对象渲染数据
export const getBandObjectsRenderData = (
    band: Band,
    options: {
        isPreview?: boolean;
        data?: any;
        currentPage?: number;
        totalPages?: number;
        selectedObjectId?: string;
        products?: any[];
        startIndex?: number;
        includeClipPath?: boolean;
        /** 数据字段定义 */
        dataFields?: DataField[];
    } = {}
): Array<{
    obj: ControlObject;
    renderData: ObjectRenderData;
    isSelected: boolean;
    rowIndex?: number;
}> => {
    const {
        isPreview = false,
        data = {},
        currentPage = 1,
        totalPages = 1,
        selectedObjectId = '',
        products = [],
        startIndex = 0,
        includeClipPath = true,
        dataFields = [],
    } = options;

    const result: Array<{
        obj: ControlObject;
        renderData: ObjectRenderData;
        isSelected: boolean;
        rowIndex?: number;
    }> = [];

    // 明细带区处理
    if (band.id === 'detail' && products.length > 0) {
        products.forEach((_, rowIndex) => {
            band.objects.forEach(obj => {
                const renderData = getObjectRenderData(obj, band, {
                    isSelected: selectedObjectId === obj.id,
                    isPreview,
                    data,
                    currentPage,
                    totalPages,
                    startIndex,
                    rowIndex,
                    includeClipPath,
                    pageSize: products.length,
                    dataFields,
                });
                
                result.push({
                    obj,
                    renderData,
                    isSelected: selectedObjectId === obj.id,
                    rowIndex,
                });
            });
        });
    } else {
        // 普通带区
        band.objects.forEach(obj => {
            const renderData = getObjectRenderData(obj, band, {
                isSelected: selectedObjectId === obj.id,
                isPreview,
                data,
                currentPage,
                totalPages,
                includeClipPath,
                dataFields,
            });
            
            result.push({
                obj,
                renderData,
                isSelected: selectedObjectId === obj.id,
            });
        });
    }

    return result;
};

// 创建单个对象的 React 元素
export const createObjectElement = (
    obj: ControlObject,
    renderData: ObjectRenderData,
    key?: string
): React.ReactElement => {
    return React.createElement(
        'div',
        {
            key: key || obj.id,
            style: renderData.style,
            title: obj.type === 'field' ? `${obj.fieldName}: ${renderData.content}` : undefined,
        },
        renderData.content
    );
};

// 创建带区对象的 React 元素数组
export const createBandObjectsElements = (
    band: Band,
    options: {
        isPreview?: boolean;
        data?: any;
        currentPage?: number;
        totalPages?: number;
        selectedObjectId?: string;
        products?: any[];
        startIndex?: number;
        includeClipPath?: boolean;
        singleRowHeight?: number;
    } = {}
): React.ReactElement[] => {
    const {
        isPreview = false,
        singleRowHeight,
        ...renderOptions
    } = options;

    const renderData = getBandObjectsRenderData(band, renderOptions);
    const elements: React.ReactElement[] = [];

    // 如果是明细带区，需要包装在行容器中
    if (band.id === 'detail' && renderOptions.products && renderOptions.products.length > 0) {
        const rowsMap = new Map<number, Array<{
            obj: ControlObject;
            renderData: ObjectRenderData;
            isSelected: boolean;
        }>>();

        // 按行分组
        renderData.forEach(item => {
            const rowIndex = item.rowIndex || 0;
            if (!rowsMap.has(rowIndex)) {
                rowsMap.set(rowIndex, []);
            }
            rowsMap.get(rowIndex)!.push(item);
        });

        // 创建每一行
        rowsMap.forEach((rowItems, rowIndex) => {
            const rowTop = rowIndex * (singleRowHeight || (band.actualBottom - band.top));
            
            // 创建行容器
            const rowContainer = React.createElement(
                'div',
                {
                    key: `detail-row-${rowIndex}`,
                    style: {
                        position: 'absolute' as const,
                        top: rowTop,
                        left: 0,
                        width: '100%',
                        height: singleRowHeight || (band.actualBottom - band.top),
                        boxSizing: 'border-box' as const,
                        borderBottom: isPreview ? '1px solid #e8e8e8' : 'none',
                        backgroundColor: isPreview && rowIndex % 2 === 0 
                            ? 'rgba(250, 250, 250, 0.8)' 
                            : isPreview ? 'rgba(240, 240, 240, 0.5)' 
                            : 'transparent',
                    }
                },
                // 创建行内的对象元素
                rowItems.map(item => 
                    createObjectElement(item.obj, item.renderData, `${item.obj.id}-${rowIndex}`)
                )
            );

            elements.push(rowContainer);
        });
    } else {
        // 普通带区直接创建对象元素
        renderData.forEach(item => {
            elements.push(createObjectElement(item.obj, item.renderData));
        });
    }

    return elements;
};

// 简化版本：直接生成对象样式（用于设计器和预览器）
export const generateObjectStyle = (
    obj: ControlObject,
    isSelected: boolean = false
): React.CSSProperties => {
    const baseStyle = getBaseObjectStyle(obj, { isSelected });
    const verticalAlignStyle = getVerticalAlignStyle(obj, baseStyle);
    
    return {
        ...baseStyle,
        ...verticalAlignStyle,
        position: 'absolute',
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
    };
};

// 获取支持垂直对齐的对象类型列表
export const getTextElementTypes = (): string[] => {
    return ['text', 'field', 'page_number', 'current_date'];
};

// 检查对象是否支持垂直对齐
export const supportsVerticalAlign = (obj: ControlObject): boolean => {
    return getTextElementTypes().includes(obj.type);
};

// 获取预览对象的完整样式
export const getPreviewObjectStyle = (
    obj: ControlObject,
    band: Band
): React.CSSProperties => {
    const baseStyle = getBaseObjectStyle(obj, { isPreview: true });
    
    // 计算位置（相对于带区）
    const positionStyle: React.CSSProperties = {
        position: 'absolute' as const,
        left: obj.x,
        top: obj.y - band.top ,
        width: obj.width,
        height: obj.height,
    };
    
    // 合并样式
    const finalStyle: React.CSSProperties = {
        ...positionStyle,
        ...baseStyle,
    };
    
    // 浮动图片不应用裁剪路径
    const isFloatingImage = obj.type === 'image' && (obj as ControlObjectAll).floating === true;
    if (!isFloatingImage) {
        const clipPath = calculateClipPath(obj, band);
        if (clipPath) {
            finalStyle.clipPath = clipPath;
        }
    }
    
    return finalStyle;
};