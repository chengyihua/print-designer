// DetailPreviewRenderer.tsx
import React, { useMemo } from 'react';
import { Band, ControlObject, ControlObjectAll } from './../types/types';

interface DetailPreviewRendererProps {
    band: Band;
    data: any[];
    startIndex: number;
    rowHeight?: number;
    onRowCountCalculated?: (rowCount: number) => void;
}

const DetailPreviewRenderer: React.FC<DetailPreviewRendererProps> = ({
    band,
    data,
    startIndex = 0,
    rowHeight = 25,
    onRowCountCalculated,
}) => {
    // 计算带区高度
    const bandHeight = band.actualBottom - band.top;

    // 计算每页最大行数
    const maxRowsPerPage = useMemo(() => {
        const calculatedRows = Math.max(1, Math.floor(bandHeight / rowHeight));

        // 回调通知行数
        if (onRowCountCalculated) {
            onRowCountCalculated(calculatedRows);
        }

        return calculatedRows;
    }, [bandHeight, rowHeight, onRowCountCalculated]);

    // 获取当前页的数据
    const currentPageData = useMemo(() => {
        return data.slice(0, maxRowsPerPage);
    }, [data, maxRowsPerPage]);

    // 渲染单行
    const renderRow = (item: any, rowIndex: number) => {
        const rowTop = rowIndex * rowHeight;
        const seqNumber = startIndex + rowIndex + 1;

        return (
            <div
                key={`row-${rowIndex}`}
                className="detail-preview-row"
                style={{
                    position: 'absolute',
                    top: `${rowTop}px`,
                    left: '0px',
                    width: '100%',
                    height: `${rowHeight}px`,
                    borderBottom: '1px solid #e8e8e8',
                    backgroundColor: rowIndex % 2 === 0 ? 'rgba(250, 250, 250, 0.8)' : 'rgba(240, 240, 240, 0.5)',
                    boxSizing: 'border-box',
                }}
            >
                {band.objects.map((obj) => {
                    const objAll = obj as ControlObjectAll;
                    const isTemplate = (obj as any).isTemplate === true;

                    if (!isTemplate) return null;

                    const style: React.CSSProperties = {
                        position: 'absolute',
                        left: `${obj.x}px`,
                        top: '0px',
                        width: `${obj.width}px`,
                        height: `${rowHeight}px`,
                        fontSize: objAll.fontSize || 11,
                        color: objAll.color || '#333333',
                        backgroundColor: 'transparent',
                        fontWeight: objAll.fontWeight || 'normal',
                        fontStyle: objAll.fontStyle || 'normal',
                        textAlign: objAll.textAlign || 'left',
                        lineHeight: `${rowHeight}px`,
                        padding: '0 4px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    };

                    // 复制边框样式
                    if (objAll.border) {
                        const { width, style: borderStyle, color } = objAll.border;
                        if (width && width > 0 && borderStyle && borderStyle !== 'none' && color) {
                            style.border = `${width}px ${borderStyle} ${color}`;
                        }
                    }

                    // 获取内容
                    const content = getRowContent(obj, item, seqNumber);

                    return (
                        <div
                            key={`${obj.id}-${rowIndex}`}
                            className="detail-preview-field"
                            style={style}
                        >
                            {content}
                        </div>
                    );
                })}
            </div>
        );
    };

    // 获取行内容
    const getRowContent = (obj: ControlObject, item: any, seqNumber: number) => {
        const objAll = obj as ControlObjectAll;
        if (obj.type === 'field') {
            const fieldName = objAll.fieldName || '';
            const templateKey = (obj as any).templateKey || fieldName;

            // 处理序号
            if (templateKey === 'seq') {
                return seqNumber.toString();
            }

            // 从数据中获取值
            if (item[templateKey] !== undefined) {
                return formatFieldValue(item[templateKey], templateKey);
            }

            // 尝试小写匹配
            const lowerKey = templateKey.toLowerCase();
            const dataKey = Object.keys(item).find(key => key.toLowerCase() === lowerKey);
            if (dataKey) {
                return formatFieldValue(item[dataKey], templateKey);
            }

            return `[${templateKey}]`;
        }

        return objAll.text || '';
    };

    // 格式化字段值
    const formatFieldValue = (value: any, fieldName: string) => {
        if (value === undefined || value === null) return '';

        if (typeof value === 'number') {
            if (fieldName.includes('price') || fieldName.includes('amount')) {
                return `¥${value.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            }
            return value.toLocaleString('zh-CN');
        }

        return String(value);
    };

    // 渲染空行提示
    const renderEmptyRows = () => {
        // 如果数据不足，渲染空行以填充带区
        const emptyRows = maxRowsPerPage - currentPageData.length;

        return Array.from({ length: emptyRows }).map((_, index) => {
            const rowIndex = currentPageData.length + index;
            const rowTop = rowIndex * rowHeight;

            return (
                <div
                    key={`empty-${rowIndex}`}
                    className="detail-empty-row"
                    style={{
                        position: 'absolute',
                        top: `${rowTop}px`,
                        left: '0px',
                        width: '100%',
                        height: `${rowHeight}px`,
                        borderBottom: '1px solid #e8e8e8',
                        backgroundColor: rowIndex % 2 === 0 ? 'rgba(250, 250, 250, 0.8)' : 'rgba(240, 240, 240, 0.5)',
                        boxSizing: 'border-box',
                    }}
                >
                    {band.objects.map((obj) => {
                        const objAll = obj as ControlObjectAll;
                        const isTemplate = (obj as any).isTemplate === true;
                        if (!isTemplate) return null;

                        const style: React.CSSProperties = {
                            position: 'absolute',
                            left: `${obj.x}px`,
                            top: '0px',
                            width: `${obj.width}px`,
                            height: `${rowHeight}px`,
                            fontSize: objAll.fontSize || 11,
                            color: '#999',
                            backgroundColor: 'transparent',
                            fontStyle: 'italic',
                            textAlign: objAll.textAlign || 'left',
                            lineHeight: `${rowHeight}px`,
                            padding: '0 4px',
                            boxSizing: 'border-box',
                        };

                        if (objAll.border) {
                            const { width, style: borderStyle, color } = objAll.border;
                            if (width && width > 0 && borderStyle && borderStyle !== 'none' && color) {
                                style.border = `${width}px ${borderStyle} ${color}`;
                            }
                        }

                        // 只在序号列显示占位符
                        const templateKey = (obj as any).templateKey;
                        const content = templateKey === 'seq' ? (startIndex + rowIndex + 1).toString() : '';

                        return (
                            <div
                                key={`${obj.id}-empty-${rowIndex}`}
                                className="detail-empty-field"
                                style={style}
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    return (
        <div
            className="detail-preview-container"
            style={{
                position: 'relative',
                height: bandHeight,
                width: '100%',
            }}
        >
            {/* 渲染数据行 */}
            {currentPageData.map((item, index) => renderRow(item, index))}

            {/* 渲染空行 */}
            {renderEmptyRows()}

            {/* 数据溢出提示 */}
            {data.length > maxRowsPerPage && (
                <div
                    className="data-overflow-hint"
                    style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '5px',
                        fontSize: '10px',
                        color: '#ff4d4f',
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        zIndex: 10,
                        fontWeight: 'bold',
                    }}
                >
                    +{data.length - maxRowsPerPage} 行将在下一页显示
                </div>
            )}
        </div>
    );
};

export default DetailPreviewRenderer;