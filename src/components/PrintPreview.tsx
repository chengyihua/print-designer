

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Band, ControlObject, ControlObjectAll, DataField } from './../types/types';
import {
    getObjectRenderData,
    getObjectCompleteStyle,
    getObjectContent,
    getBaseObjectStyle,
    createObjectContentWrapper,
} from './../utils/renderUtils';
import { evaluateFormula } from './../utils/formulaUtils';
import { BarcodeRenderer, QRCodeRenderer } from './BarcodeRenderer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './PrintPreview.css';
import { getDetailDataKey } from '../types/constants';

interface PrintPreviewProps {
    bands: Band[];
    data: any;
    dataFields: DataField[];
    onClose: () => void;
    pageWidth?: number;
    pageHeight?: number;
    pageMargins?: { top: number; bottom: number; left: number; right: number };
    showPageNumbers?: boolean;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({
    bands,
    data,
    dataFields,
    onClose,
    pageWidth = 794,
    pageHeight = 1123,
    showPageNumbers = true,
    pageMargins = { top: 40, bottom: 40, left: 40, right: 40 },
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showMargins, setShowMargins] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const detailDataKey = getDetailDataKey(dataFields) || 'products';
    // 获取关键带区
    const { headerBand, detailBand, summaryBand, footerBand } = useMemo(() => ({
        headerBand: bands.find(b => b.id === 'header'),
        detailBand: bands.find(b => b.id === 'detail'),
        summaryBand: bands.find(b => b.id === 'summary'),
        footerBand: bands.find(b => b.id === 'footer'),
    }), [bands]);

    // 计算分页
    const { rowsPerPage, totalPages, singleRowHeight, minTopOffset } = useMemo(() => {
        if (!detailBand || !data?.[detailDataKey]) {
            return { rowsPerPage: 0, totalPages: 1, singleRowHeight: 0, minTopOffset: 0 };
        }
        
        // 单行高度 = 带区高度 - 对象顶部偏移
        const bandHeight = detailBand.actualBottom - detailBand.top;
        // 计算对象的最小顶部偏移（相对于带区）
        // 只计算在带区可视范围内的对象
        const visibleObjects = detailBand.objects?.filter(obj => 
            obj.y >= detailBand.top && obj.y < detailBand.actualBottom
        ) || [];
        const minTopOffset = visibleObjects.length > 0
            ? Math.min(...visibleObjects.map(obj => obj.y - detailBand.top))
            : 0;
        const singleRowHeight = bandHeight - minTopOffset;
        // 页面可用高度
        const usableHeight = pageHeight - pageMargins.top - pageMargins.bottom;
        
        // 计算固定带区总高度
        let fixedBandsHeight = 0;
        
        // 头部带区：每页都显示
        if (headerBand) fixedBandsHeight += headerBand.actualBottom - headerBand.top;
        
        // 汇总带区：如果是“每页底部显示”模式，需要预留空间
        const summaryDisplayMode = summaryBand?.summaryDisplayMode || 'atEnd';
        if (summaryBand && summaryDisplayMode === 'perPage') {
            fixedBandsHeight += summaryBand.actualBottom - summaryBand.top;
        }
        
        // 可用明细高度
        const availableDetailHeight = usableHeight - fixedBandsHeight;
        const rowsPerPage = Math.max(1, Math.floor(availableDetailHeight / singleRowHeight));
        const detailItems = data[detailDataKey] as any[];
        const totalProducts = detailItems.length;
        const totalPages = Math.max(1, Math.ceil(totalProducts / rowsPerPage));

        // console.log('分页计算:', {
        //     summaryDisplayMode,
        //     singleRowHeight,
        //     usableHeight,
        //     fixedBandsHeight,
        //     availableDetailHeight,
        //     rowsPerPage,
        //     totalProducts,
        //     totalPages
        // });

        return { rowsPerPage, totalPages, singleRowHeight, minTopOffset };
    }, [detailBand, data, pageHeight, pageMargins, headerBand, summaryBand]);

    // 获取当前页数据 - 改为获取所有页的数据
    const allPagesData = useMemo(() => {
        const detailItems = data?.[detailDataKey] as any[] | undefined;
        if (!detailBand || !detailItems) return [];

        const pages = [];
        for (let page = 1; page <= totalPages; page++) {
            const startIndex = (page - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, detailItems.length);
            pages.push({
                pageNumber: page,
                items: detailItems.slice(startIndex, endIndex),
                startIndex,
                totalItems: detailItems.length
            });
        }
        return pages;
    }, [detailBand, data, rowsPerPage, totalPages]);

    // 获取所有浮动图片（以页面为基准定位）
    const floatingImages = useMemo(() => {
        const images: Array<{ obj: ControlObject; bandId: string }> = [];
        bands.forEach(band => {
            band.objects.forEach(obj => {
                if (obj.type === 'image' && (obj as ControlObjectAll).floating === true) {
                    images.push({ obj, bandId: band.id });
                }
            });
        });
        return images;
    }, [bands]);



    // 跳转到指定页面
    const scrollToPage = useCallback((pageNum: number) => {
        const pageEl = pageRefs.current[pageNum - 1];
        if (pageEl && contentRef.current) {
            pageEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        setCurrentPage(pageNum);
    }, []);

    // 导出 PDF
    const exportToPDF = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);

        // 保存当前边距显示状态，导出时隐藏边距线
        const prevShowMargins = showMargins;
        setShowMargins(false);

        // 等待 DOM 更新
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // 创建 PDF 文档 (A4 尺寸)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = 210; // A4 宽度 mm
            const pdfHeight = 297; // A4 高度 mm

            // 遍历所有页面
            for (let i = 0; i < totalPages; i++) {
                const pageEl = pageRefs.current[i];
                if (!pageEl) continue;

                // 使用 html2canvas 将页面转换为图片
                const canvas = await html2canvas(pageEl, {
                    scale: 2, // 提高清晰度
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                });

                const imgData = canvas.toDataURL('image/png');

                // 计算图片在 PDF 中的尺寸（保持比例）
                const imgWidth = pdfWidth;
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                // 如果不是第一页，添加新页
                if (i > 0) {
                    pdf.addPage();
                }

                // 添加图片到 PDF
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
            }

            // 下载 PDF
            const fileName = `报表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`;
            pdf.save(fileName);

            console.log('PDF 导出成功:', fileName);
        } catch (error) {
            console.error('PDF 导出失败:', error);
            alert('PDF 导出失败，请重试');
        } finally {
            // 恢复边距显示状态
            setShowMargins(prevShowMargins);
            setIsExporting(false);
        }
    }, [isExporting, totalPages, showMargins]);

    // 计算带区背景色（支持公式计算）
    const getBandBackgroundColor = useCallback((band: Band, context?: {
        rowIndex?: number;
        data?: any;
        currentPage?: number;
        totalPages?: number;
    }): string | undefined => {
        // 优先使用公式计算（仅明细/汇总带区）
        if (band.backgroundColorFormula && (band.id === 'detail' || band.id === 'summary')) {
            const result = evaluateFormula(
                band.backgroundColorFormula,
                {
                    data: context?.data || data,
                    currentPage: context?.currentPage || 1,
                    totalPages: context?.totalPages || totalPages,
                    rowIndex: context?.rowIndex ?? 0,
                },
                {}
            );
            console.log('[BgColor] rowIndex:', context?.rowIndex, 'formula:', band.backgroundColorFormula, 'result:', result);
            // 检查结果是否像颜色值，去除可能的引号
            if (result && !result.includes('错误') && !result.includes('公式')) {
                // 去除可能的引号
                return result.replace(/^["']|["']$/g, '');
            }
        }
        // 回退到静态背景色
        return band.backgroundColor;
    }, [data, totalPages]);

    // 计算行高（支持公式计算）
    const getRowHeight = useCallback((band: Band, rowIndex: number, context?: {
        data?: any;
        currentPage?: number;
        totalPages?: number;
    }): number => {
        // 优先使用公式计算（仅明细/汇总带区）
        if (band.rowHeightFormula && (band.id === 'detail' || band.id === 'summary')) {
            const result = evaluateFormula(
                band.rowHeightFormula,
                {
                    data: context?.data || data,
                    currentPage: context?.currentPage || 1,
                    totalPages: context?.totalPages || totalPages,
                    rowIndex: rowIndex,
                },
                {}
            );
            // 尝试解析为数字
            const height = parseFloat(result);
            if (!isNaN(height) && height > 0) {
                return height;
            }
        }
        // 回退到默认行高
        return singleRowHeight;
    }, [data, totalPages, singleRowHeight]);

    // ✅ 渲染明细行 - 与设计模式一致（包含 border + padding 的尺寸）
    const renderDetailRow = useCallback((band: Band, rowIndex: number, startIndex: number, pageNum: number, pageSize: number) => {
        // 计算行背景色（支持公式）
        const rowBgColor = getBandBackgroundColor(band, {
            rowIndex: startIndex + rowIndex,
            data: data,
            currentPage: pageNum,
            totalPages: totalPages,
        });
        // 计算行高（支持公式）
        const actualRowHeight = getRowHeight(band, startIndex + rowIndex, {
            data: data,
            currentPage: pageNum,
            totalPages: totalPages,
        });

        return (
            <div
                key={`detail-row-${rowIndex}`}
                className="detail-row"
                style={{
                    position: 'absolute',
                    top: `${rowIndex * actualRowHeight}px`,
                    left: '0px',
                    width: '100%',
                    height: `${actualRowHeight}px`,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    backgroundColor: rowBgColor,
                }}
            >
                {band.objects
                    .filter((obj) => obj.printVisible !== false && !((obj as ControlObjectAll).floating === true && obj.type === 'image'))  // 过滤掉打印不可见的元素和浮动图片
                    .map((obj) => {
                    // 线条使用 SVG 渲染
                    if (obj.type === 'line') {
                        const lineObj = obj as any;
                        const x1 = lineObj.x1 ?? obj.x;
                        const y1 = (lineObj.y1 ?? obj.y) - band.top - minTopOffset;
                        const x2 = lineObj.x2 ?? (obj.x + obj.width);
                        const y2 = (lineObj.y2 ?? obj.y) - band.top - minTopOffset;
                        const strokeColor = lineObj.color || '#000000';
                        const strokeWidth = lineObj.strokeWidth || 1;
                        const lineStyle = lineObj.lineStyle || 'solid';
                        
                        const minX = Math.min(x1, x2);
                        const minY = Math.min(y1, y2);
                        const maxX = Math.max(x1, x2);
                        const maxY = Math.max(y1, y2);
                        const width = maxX - minX || 1;
                        const height = maxY - minY || 1;
                        const padding = strokeWidth + 2;
                        
                        const getStrokeDasharray = () => {
                            if (lineStyle === 'dashed') return `${strokeWidth * 4} ${strokeWidth * 2}`;
                            if (lineStyle === 'dotted') return `${strokeWidth} ${strokeWidth * 2}`;
                            return 'none';
                        };
                        
                        return (
                            <svg
                                key={`${obj.id}-${rowIndex}`}
                                style={{
                                    position: 'absolute',
                                    left: minX - padding,
                                    top: minY - padding,
                                    width: width + padding * 2,
                                    height: height + padding * 2,
                                    overflow: 'hidden',  // 裁剪超出部分
                                    zIndex: (obj.zIndex ?? 1) + 100,  // 带区元素在浮动图片之上
                                }}
                            >
                                <line
                                    x1={x1 - minX + padding}
                                    y1={y1 - minY + padding}
                                    x2={x2 - minX + padding}
                                    y2={y2 - minY + padding}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={getStrokeDasharray()}
                                    strokeLinecap="round"
                                />
                            </svg>
                        );
                    }
                    
                    // 其他对象的渲染逻辑
                    // 获取对象内容
                    const content = getObjectContent(obj, {
                        data: data,
                        currentPage: pageNum,
                        totalPages: totalPages,
                        startIndex: startIndex,
                        rowIndex: rowIndex,
                        pageSize: pageSize,
                    });
                    const baseStyle = getBaseObjectStyle(obj, { isPreview: true });
                    const isTextElement = ['text', 'multiline_text', 'field', 'page_number', 'current_date'].includes(obj.type);
                    
                    // 从样式字符串解析边框宽度（与设计模式一致）
                    const parseBorderWidth = (border: string | undefined): number => {
                        if (!border || border === 'none') return 0;
                        const match = border.match(/(\d+)px/);
                        return match ? parseInt(match[1]) : 0;
                    };
                    const borderWidth = parseBorderWidth(baseStyle.border as string);
                    const padding = 2; // 与设计模式一致的 padding
                    const totalExtra = borderWidth + padding;
                    
                    // 明细行对象位置 = 相对偏移 - minTopOffset
                    const objRelativeTop = obj.y - band.top - minTopOffset;
                    const style: React.CSSProperties = {
                        position: 'absolute',
                        left: obj.x,
                        top: objRelativeTop,  // 相对偏移
                        width: obj.width + (totalExtra * 2),
                        height: obj.height + (totalExtra * 2),
                        zIndex: (obj.zIndex ?? 1) + 100,  // 带区元素在浮动图片之上
                        ...baseStyle,
                        boxSizing: 'border-box',
                    };
                    
                    return (
                        <div
                            key={`${obj.id}-${rowIndex}`}
                            style={getObjectCompleteStyle(obj, style, isTextElement)}
                            title={`${(obj as ControlObjectAll).fieldName}: ${content}`}
                        >
                            {/* 图片类型特殊处理 */}
                            {obj.type === 'image' ? (
                                (obj as ControlObjectAll).src || (obj as ControlObjectAll).imageUrl ? (
                                    (obj as ControlObjectAll).objectFit === 'repeat' ? (
                                        <div
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                backgroundImage: `url(${(obj as ControlObjectAll).src || (obj as ControlObjectAll).imageUrl})`,
                                                backgroundRepeat: 'repeat',
                                                backgroundSize: 'auto',
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={(obj as ControlObjectAll).src || (obj as ControlObjectAll).imageUrl}
                                            alt={(obj as ControlObjectAll).alt || '图片'}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: ((obj as ControlObjectAll).objectFit || 'contain') as React.CSSProperties['objectFit'],
                                            }}
                                        />
                                    )
                                ) : (
                                    <span style={{ color: '#999', fontSize: '12px' }}>[图片]</span>
                                )
                            ) : obj.type === 'barcode' ? (
                                <BarcodeRenderer
                                    value={content}
                                    type={(obj as ControlObjectAll).barcodeType || 'CODE128'}
                                    width={obj.width}
                                    height={obj.height}
                                    showText={(obj as ControlObjectAll).showText !== false}
                                    background={(obj as ControlObjectAll).background || '#FFFFFF'}
                                    lineColor={(obj as ControlObjectAll).lineColor || '#000000'}
                                />
                            ) : obj.type === 'qrcode' ? (
                                <QRCodeRenderer
                                    value={content}
                                    width={obj.width}
                                    height={obj.height}
                                    errorLevel={(obj as ControlObjectAll).errorLevel || 'M'}
                                    background={(obj as ControlObjectAll).background || '#FFFFFF'}
                                    foreground={(obj as ControlObjectAll).foreground || '#000000'}
                                />
                            ) : (
                                // 使用 wrappedContent 渲染 HTML
                                createObjectContentWrapper(content, obj, baseStyle)
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }, [minTopOffset, totalPages, data, getBandBackgroundColor, getRowHeight]);

    // ✅ 使用通用工具函数渲染其他带区对象
    const renderBandObject = useCallback((band: Band, obj: ControlObject, index: number, pageNum: number, pageSize: number) => {
        const bandHeight = band.actualBottom - band.top;
        
        // 线条使用 SVG 渲染
        if (obj.type === 'line') {
            const lineObj = obj as any;
            const rawY1 = (lineObj.y1 ?? obj.y) - band.top;
            const rawY2 = (lineObj.y2 ?? obj.y) - band.top;
            const rawX1 = lineObj.x1 ?? obj.x;
            const rawX2 = lineObj.x2 ?? (obj.x + obj.width);
            const strokeColor = lineObj.color || '#000000';
            const strokeWidth = lineObj.strokeWidth || 1;
            const lineStyle = lineObj.lineStyle || 'solid';
            
            // 计算裁剪后的坐标
            let x1 = rawX1, y1 = rawY1, x2 = rawX2, y2 = rawY2;
            
            // 检查线条是否完全在带区外
            const minRawY = Math.min(rawY1, rawY2);
            const maxRawY = Math.max(rawY1, rawY2);
            if (maxRawY <= 0 || minRawY >= bandHeight) {
                return null;  // 完全超出带区
            }
            
            // 对于部分超出的线条，计算与边界的交点
            if (rawY1 !== rawY2) {
                const dx = rawX2 - rawX1;
                const dy = rawY2 - rawY1;
                
                // 裁剪 Y 超出上边界的点
                if (rawY1 < 0) {
                    x1 = rawX1 + dx * (0 - rawY1) / dy;
                    y1 = 0;
                } else if (rawY1 > bandHeight) {
                    x1 = rawX1 + dx * (bandHeight - rawY1) / dy;
                    y1 = bandHeight;
                }
                
                if (rawY2 < 0) {
                    x2 = rawX2 + dx * (0 - rawY2) / dy;
                    y2 = 0;
                } else if (rawY2 > bandHeight) {
                    x2 = rawX2 + dx * (bandHeight - rawY2) / dy;
                    y2 = bandHeight;
                }
            } else {
                // 横线：检查是否在带区范围内
                if (rawY1 < 0 || rawY1 > bandHeight) {
                    return null;
                }
            }
            
            // 计算边界框
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const maxX = Math.max(x1, x2);
            const maxY = Math.max(y1, y2);
            const width = maxX - minX || 1;
            const height = maxY - minY || 1;
            const padding = strokeWidth + 2;
            
            // 计算虚线样式
            const getStrokeDasharray = () => {
                if (lineStyle === 'dashed') return `${strokeWidth * 4} ${strokeWidth * 2}`;
                if (lineStyle === 'dotted') return `${strokeWidth} ${strokeWidth * 2}`;
                return 'none';
            };
            
            return (
                <svg
                    key={`${band.id}-${obj.id}-${index}`}
                    style={{
                        position: 'absolute',
                        left: minX - padding,
                        top: minY - padding,
                        width: width + padding * 2,
                        height: height + padding * 2,
                        overflow: 'hidden',
                        zIndex: (obj.zIndex ?? 1) + 100,
                    }}
                >
                    <line
                        x1={x1 - minX + padding}
                        y1={y1 - minY + padding}
                        x2={x2 - minX + padding}
                        y2={y2 - minY + padding}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={getStrokeDasharray()}
                        strokeLinecap="round"
                    />
                </svg>
            );
        }
        
        // ✅ 其他对象使用通用工具函数获取渲染数据
        const renderData = getObjectRenderData(obj, band, {
            isSelected: false,
            isPreview: true,
            data: data,
            currentPage: pageNum,
            totalPages: totalPages,
            includeClipPath: true,
            pageSize: pageSize,
        });
        // 确保样式正确应用垂直对齐
        const isTextElement = ['text', 'multiline_text', 'field', 'page_number', 'current_date'].includes(obj.type);


        return (
            <div
                key={`${band.id}-${obj.id}-${index}`}
                style={getObjectCompleteStyle(obj, renderData.style, isTextElement)}
            >
                {/* 图片类型特殊处理 */}
                {obj.type === 'image' ? (
                    (obj as ControlObjectAll).src || (obj as ControlObjectAll).imageUrl ? (
                        (obj as ControlObjectAll).objectFit === 'repeat' ? (
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundImage: `url(${(obj as ControlObjectAll).src || (obj as ControlObjectAll).imageUrl})`,
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: 'auto',
                                }}
                            />
                        ) : (
                            <img
                                src={(obj as ControlObjectAll).src || (obj as ControlObjectAll).imageUrl}
                                alt={(obj as ControlObjectAll).alt || '图片'}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: ((obj as ControlObjectAll).objectFit || 'contain') as any,
                                }}
                            />
                        )
                    ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>[图片]</span>
                    )
                ) : obj.type === 'barcode' ? (
                    <BarcodeRenderer
                        value={renderData.content}
                        type={(obj as ControlObjectAll).barcodeType || 'CODE128'}
                        width={obj.width}
                        height={obj.height}
                        showText={(obj as ControlObjectAll).showText !== false}
                        background={(obj as ControlObjectAll).background || '#FFFFFF'}
                        lineColor={(obj as ControlObjectAll).lineColor || '#000000'}
                    />
                ) : obj.type === 'qrcode' ? (
                    <QRCodeRenderer
                        value={renderData.content}
                        width={obj.width}
                        height={obj.height}
                        errorLevel={(obj as ControlObjectAll).errorLevel || 'M'}
                        background={(obj as ControlObjectAll).background || '#FFFFFF'}
                        foreground={(obj as ControlObjectAll).foreground || '#000000'}
                    />
                ) : (
                    // 使用 wrappedContent 渲染 HTML
                    renderData.wrappedContent || renderData.content
                )}
            </div>
        );
    }, [data, totalPages]);

    // 计算指定页面的带区布局
    const getPageBandLayouts = useCallback((pageNum: number, pageData: any) => {
        const layouts = [];
        let currentY = pageMargins.top;
        const isLastPage = pageNum === totalPages;
        const summaryDisplayMode = summaryBand?.summaryDisplayMode || 'atEnd';

        // 1. 头部带区
        if (headerBand) {
            const height = headerBand.actualBottom - headerBand.top;
            layouts.push({
                band: headerBand,
                top: currentY,
                height,
                isDetail: false,
                pageData: pageData  // 传递 pageData 以便聚合函数访问
            });
            currentY += height;
        }

        // 2. 明细带区
        if (detailBand) {
            const detailHeight = singleRowHeight * (pageData.items?.length || 0);
            layouts.push({
                band: detailBand,
                top: currentY,
                height: detailHeight,
                isDetail: true,
                pageData: pageData
            });
            currentY += detailHeight;
        }

        // 3. 汇总带区 - 根据显示模式决定是否显示
        if (summaryBand) {
            let showSummary = false;
            
            switch (summaryDisplayMode) {
                case 'perPage':
                    // 每页都显示汇总
                    showSummary = true;
                    break;
                case 'perGroup':
                    // 每组后显示（需要分组数据支持，暂时当作最后一页处理）
                    showSummary = isLastPage;
                    break;
                case 'atEnd':
                default:
                    // 只在最后一页显示
                    showSummary = isLastPage;
                    break;
            }
            
            if (showSummary) {
                const height = summaryBand.actualBottom - summaryBand.top;
                layouts.push({
                    band: summaryBand,
                    top: currentY,
                    height,
                    isDetail: false,
                    pageData: pageData  // 传递 pageData 以便聚合函数访问
                });
                currentY += height;
            }
        }

        // 4. 脚注带区（只在最后一页显示）
        if (footerBand && isLastPage) {
            const height = footerBand.actualBottom - footerBand.top;
            layouts.push({
                band: footerBand,
                top: currentY,
                height,
                isDetail: false,
                pageData: pageData  // 传递 pageData 以便聚合函数访问
            });
        }

        return layouts;
    }, [headerBand, detailBand, summaryBand, footerBand, pageMargins, totalPages, singleRowHeight]);

    // 渲染带区
    const renderBandForPage = useCallback((layout: any, pageNum: number) => {
        const { band, top, height, isDetail, pageData } = layout;
        // 当前页条数
        const pageSize = pageData?.items?.length || 0;
        // 获取带区背景色
        const bandBgColor = getBandBackgroundColor(band, {
            data: data,
            currentPage: pageNum,
            totalPages: totalPages,
        });

        if (isDetail) {
            // 渲染明细带区
            return (
                <div
                    key={`${band.id}-page${pageNum}`}
                    className={`preview-band preview-band-${band.id}`}
                    style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: `${pageMargins.left}px`,
                        right: `${pageMargins.right}px`,
                        height: `${height}px`,
                        backgroundColor: bandBgColor,
                        overflow: 'hidden',
                        clipPath: 'inset(0)',  // 强制裁剪
                    }}
                >
                    {pageData?.items?.map((_: any, rowIndex: number) =>
                        renderDetailRow(band, rowIndex, pageData.startIndex, pageNum, pageSize)
                    )}
                </div>
            );
        } else {
            // 渲染其他带区
            return (
                <div
                    key={`${band.id}-page${pageNum}`}
                    className={`preview-band preview-band-${band.id}`}
                    style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: `${pageMargins.left}px`,
                        right: `${pageMargins.right}px`,
                        height: `${height}px`,
                        backgroundColor: bandBgColor,
                        overflow: 'hidden',
                        clipPath: 'inset(0)',  // 强制裁剪
                    }}
                >
                    {band.objects
                        .filter((obj: any) => {
                            // 过滤掉打印不可见的元素和浮动图片
                            if (obj.printVisible === false) return false;
                            if (obj.floating === true && obj.type === 'image') return false;
                            
                            // 过滤掉完全超出带区范围的对象
                            const bandHeight = band.actualBottom - band.top;
                            if (obj.type === 'line') {
                                const lineObj = obj as any;
                                const minY = Math.min(lineObj.y1 ?? obj.y, lineObj.y2 ?? obj.y) - band.top;
                                const maxY = Math.max(lineObj.y1 ?? obj.y, lineObj.y2 ?? obj.y) - band.top;
                                // 线条完全在带区上方或下方
                                return !(maxY <= 0 || minY >= bandHeight);
                            } else {
                                const objTop = obj.y - band.top;
                                const objBottom = objTop + obj.height;
                                // 对象完全在带区上方或下方
                                return !(objBottom <= 0 || objTop >= bandHeight);
                            }
                        })
                        .map((obj: any, index: number) =>
                            renderBandObject(band, obj, index, pageNum, pageSize)
                        )}
                </div>
            );
        }
    }, [pageMargins, renderDetailRow, renderBandObject, getBandBackgroundColor, data, totalPages]);

    // 渲染单个页面
    const renderPage = useCallback((pageNum: number) => {
        const pageData = allPagesData[pageNum - 1];
        const layouts = getPageBandLayouts(pageNum, pageData);

        return (
            <div
                key={`page-${pageNum}`}
                ref={(el) => { pageRefs.current[pageNum - 1] = el; }}
                className="preview-page"
                style={{
                    width: `${pageWidth}px`,
                    height: `${pageHeight}px`,
                    backgroundColor: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    position: 'relative',
                    marginBottom: '20px',
                }}
            >
                {/* 页边距区域 */}
                {showMargins && (
                    <div className="page-margins">
                        <div className="margin-top" style={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            height: `${pageMargins.top}px`, borderBottom: '1px dashed #ddd'
                        }} />
                        <div className="margin-bottom" style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: `${pageMargins.bottom}px`, borderTop: '1px dashed #ddd'
                        }} />
                        <div className="margin-left" style={{
                            position: 'absolute', top: 0, bottom: 0, left: 0,
                            width: `${pageMargins.left}px`, borderRight: '1px dashed #ddd'
                        }} />
                        <div className="margin-right" style={{
                            position: 'absolute', top: 0, bottom: 0, right: 0,
                            width: `${pageMargins.right}px`, borderLeft: '1px dashed #ddd'
                        }} />
                    </div>
                )}

                {/* 渲染浮动图片（作为背景，在所有元素之下） */}
                {floatingImages.map(({ obj }, index) => {
                    const imgObj = obj as ControlObjectAll;
                    if (imgObj.printVisible === false) return null;
                    
                    // 浮动图片使用设计时的 x, y 加上页边距
                    const imgStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: imgObj.x + pageMargins.left,
                        top: imgObj.y + pageMargins.top,
                        width: imgObj.width,
                        height: imgObj.height,
                        zIndex: 1,  // 浮动图片作为背景
                        overflow: 'hidden',
                    };
                    
                    return (
                        <div key={`floating-${obj.id}-${pageNum}-${index}`} style={imgStyle}>
                            {imgObj.src || imgObj.imageUrl ? (
                                imgObj.objectFit === 'repeat' ? (
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundImage: `url(${imgObj.src || imgObj.imageUrl})`,
                                            backgroundRepeat: 'repeat',
                                            backgroundSize: 'auto',
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={imgObj.src || imgObj.imageUrl}
                                        alt={imgObj.alt || '图片'}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: (imgObj.objectFit || 'contain') as any,
                                        }}
                                    />
                                )
                            ) : (
                                <span style={{ color: '#999', fontSize: '12px' }}>[图片]</span>
                            )}
                        </div>
                    );
                })}

                {/* 渲染所有带区 */}
                {layouts.map((layout: any) => renderBandForPage(layout, pageNum))}

                {/* 页码 */}
                {showPageNumbers && (
                    <div className="page-number" style={{
                        position: 'absolute',
                        bottom: `${pageMargins.bottom / 2}px`,
                        right: `${pageMargins.right}px`,
                        fontSize: '12px',
                        color: '#666',
                    }}>
                        {pageNum} / {totalPages}
                    </div>
                )}
            </div>
        );
    }, [allPagesData, getPageBandLayouts, pageWidth, pageHeight, showMargins, pageMargins, showPageNumbers, totalPages, renderBandForPage, floatingImages]);

    // 渲染所有页面
    const renderAllPages = useCallback(() => {
        return (
            <div
                className="all-pages-container"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top center',
                }}
            >
                {Array.from({ length: totalPages }, (_, i) => renderPage(i + 1))}
            </div>
        );
    }, [totalPages, zoomLevel, renderPage]);

    return (
        <div className="print-preview-modal">
            <div className="preview-overlay" onClick={onClose} />

            <div className="preview-container">
                {/* 工具栏 */}
                <div className="preview-toolbar">
                    <div className="toolbar-left">
                        <button className="btn" onClick={onClose} title="关闭">
                            ✕
                        </button>
                        <button className="btn btn-primary" onClick={() => window.print()} title="打印">
                            🖨️
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={exportToPDF}
                            disabled={isExporting}
                            title="导出 PDF"
                        >
                            {isExporting ? '⏳ 导出中...' : '📄 导出 PDF'}
                        </button>
                        <button className="btn" onClick={() => setShowMargins(!showMargins)} title={showMargins ? '隐藏边距' : '显示边距'}>
                            {showMargins ? '👁‍🗨' : '👁'}
                        </button>
                    </div>

                    <div className="toolbar-center">
                        <span>🔍</span>
                        <select
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                            className="zoom-select"
                        >
                            <option value="0.5">50%</option>
                            <option value="0.75">75%</option>
                            <option value="1">100%</option>
                            <option value="1.25">125%</option>
                            <option value="1.5">150%</option>
                        </select>

                        <div className="page-controls">
                            <button
                                className="btn btn-small"
                                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                title="上一页"
                            >
                                ◀
                            </button>
                            <span className="page-info">
                                第
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={currentPage}
                                    onChange={(e) => {
                                        const page = parseInt(e.target.value);
                                        if (!isNaN(page) && page >= 1 && page <= totalPages) {
                                            scrollToPage(page);
                                        }
                                    }}
                                    className="page-input"
                                />
                                页 / 共 {totalPages} 页
                            </span>
                            <button
                                className="btn btn-small"
                                onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                title="下一页"
                            >
                                ▶
                            </button>
                        </div>
                    </div>
                </div>

                {/* 预览内容 */}
                <div className="preview-content" ref={contentRef}>
                    {renderAllPages()}
                </div>
            </div>
        </div>
    );
};

export default PrintPreview;