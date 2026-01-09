/**
 * 打印输出工具
 * 提供独立的渲染和导出接口，无需进入设计器即可生成打印输出
 */

import { Band, ControlObject, ControlObjectAll, DataField, PageSettings } from '../types/types';
import { getObjectContent, getBaseObjectStyle } from './renderUtils';
import { evaluateFormula } from './formulaUtils';
import { getDetailDataKey } from '../types/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import UnitConverter from './unitConverter';


/** 打印配置选项 */
export interface PrintOptions {
    /** 设计模板（带区数据） */
    template: Band[];
    /** 业务数据 */
    data: any;
    /** 数据字段定义（用于确定明细数据键名） */
    dataFields?: DataField[];
    /** 页面设置（从设计器传入） */
    pageSettings?: PageSettings;
    /** 页面宽度(px)，如果没有 pageSettings 则使用此值，默认 794 (A4) */
    pageWidth?: number;
    /** 页面高度(px)，如果没有 pageSettings 则使用此值，默认 1123 (A4) */
    pageHeight?: number;
    /** 页边距(px)，如果没有 pageSettings 则使用此值 */
    pageMargins?: { top: number; bottom: number; left: number; right: number };
}

/** PDF 导出选项 */
export interface PdfExportOptions extends PrintOptions {
    /** 文件名（不含扩展名） */
    fileName?: string;
    /** 是否直接下载，默认 true */
    download?: boolean;
    /** 图片缩放比例，默认 2 */
    scale?: number;
}

/**
 * 从 PrintOptions 获取实际的页面尺寸和边距
 */
function getPageDimensions(options: PrintOptions) {
    const { pageSettings } = options;
    
    if (pageSettings) {
        // 从 pageSettings 计算
        const widthMm = pageSettings.orientation === 'landscape' 
            ? Math.max(pageSettings.width, pageSettings.height)
            : Math.min(pageSettings.width, pageSettings.height);
        const heightMm = pageSettings.orientation === 'landscape'
            ? Math.min(pageSettings.width, pageSettings.height)
            : Math.max(pageSettings.width, pageSettings.height);
        
        // 使用 UnitConverter 进行单位转换
        return {
            pageWidth: Math.round(UnitConverter.toPx(widthMm, 'mm')),
            pageHeight: Math.round(UnitConverter.toPx(heightMm, 'mm')),
            pageMargins: {
                top: Math.round(UnitConverter.toPx(pageSettings.margins.top, 'mm')),
                bottom: Math.round(UnitConverter.toPx(pageSettings.margins.bottom, 'mm')),
                left: Math.round(UnitConverter.toPx(pageSettings.margins.left, 'mm')),
                right: Math.round(UnitConverter.toPx(pageSettings.margins.right, 'mm')),
            },
            paperWidthMm: widthMm,
            paperHeightMm: heightMm,
        };
    }
    
    // 使用直接传入的参数或默认值
    return {
        pageWidth: options.pageWidth ?? 794,
        pageHeight: options.pageHeight ?? 1123,
        pageMargins: options.pageMargins ?? { top: 40, bottom: 40, left: 40, right: 40 },
        paperWidthMm: 210,
        paperHeightMm: 297,
    };
}

/** 渲染结果 */
export interface RenderResult {
    /** HTML 字符串 */
    html: string;
    /** 总页数 */
    totalPages: number;
    /** 页面宽度(px) */
    pageWidth: number;
    /** 页面高度(px) */
    pageHeight: number;
    /** 纸张宽度(mm) */
    paperWidthMm: number;
    /** 纸张高度(mm) */
    paperHeightMm: number;
}

/**
 * 计算分页信息
 */
function calculatePagination(options: PrintOptions) {
    const {
        template,
        data,
        dataFields = [],
    } = options;
    
    const { pageHeight, pageMargins } = getPageDimensions(options);

    const headerBand = template.find(b => b.id === 'header');
    const detailBand = template.find(b => b.id === 'detail');
    const summaryBand = template.find(b => b.id === 'summary');
    const footerBand = template.find(b => b.id === 'footer');
    const detailDataKey = getDetailDataKey(dataFields) || 'products';

    if (!detailBand || !data?.[detailDataKey]) {
        return { rowsPerPage: 0, totalPages: 1, singleRowHeight: 0, minTopOffset: 0, detailDataKey, hasFooterOnlyPage: false };
    }

    const bandHeight = detailBand.actualBottom - detailBand.top;
    const visibleObjects = detailBand.objects?.filter(obj =>
        obj.y >= detailBand.top && obj.y < detailBand.actualBottom
    ) || [];
    const minTopOffset = visibleObjects.length > 0
        ? Math.min(...visibleObjects.map(obj => obj.y - detailBand.top))
        : 0;
    const singleRowHeight = bandHeight - minTopOffset;
    const usableHeight = pageHeight - pageMargins.top - pageMargins.bottom;

    // 计算固定带区总高度（每页都要显示的）
    let fixedBandsHeight = 0;
    if (headerBand) fixedBandsHeight += headerBand.actualBottom - headerBand.top;

    const summaryDisplayMode = summaryBand?.summaryDisplayMode || 'atEnd';
    if (summaryBand && summaryDisplayMode === 'perPage') {
        fixedBandsHeight += summaryBand.actualBottom - summaryBand.top;
    }

    const availableDetailHeight = usableHeight - fixedBandsHeight;
    const rowsPerPage = Math.max(1, Math.floor(availableDetailHeight / singleRowHeight));
    const detailItems = data[detailDataKey] as any[];
    const totalProducts = detailItems.length;

    // 计算初始总页数
    let totalPages = Math.max(1, Math.ceil(totalProducts / rowsPerPage));
    let hasFooterOnlyPage = false;

    // 计算汇总带和脚注带的高度
    const summaryHeight = (summaryBand && summaryDisplayMode === 'atEnd') 
        ? summaryBand.actualBottom - summaryBand.top : 0;
    const footerHeight = footerBand ? footerBand.actualBottom - footerBand.top : 0;

    if (footerHeight > 0 && totalProducts > 0) {
        // 计算最后一页明细显示完后的剩余空间
        const lastPageStartIndex = (totalPages - 1) * rowsPerPage;
        const lastPageRowCount = totalProducts - lastPageStartIndex;
        const lastPageDetailHeight = lastPageRowCount * singleRowHeight;
        const lastPageRemainingHeight = usableHeight - fixedBandsHeight - lastPageDetailHeight;

        // 检查剩余空间是否能放下汇总带+脚注带
        const totalExtraHeight = summaryHeight + footerHeight;

        if (lastPageRemainingHeight < totalExtraHeight) {
            // 放不下所有内容，检查是否能放下汇总带
            if (lastPageRemainingHeight >= summaryHeight && summaryHeight > 0) {
                // 能放下汇总带，但放不下脚注带，新增一页放脚注
                totalPages = totalPages + 1;
                hasFooterOnlyPage = true;
            } else if (lastPageRemainingHeight < summaryHeight && summaryHeight > 0) {
                // 连汇总带都放不下，新增一页放汇总+脚注
                totalPages = totalPages + 1;
                hasFooterOnlyPage = false;
            } else {
                // 没有汇总带，只有脚注带放不下
                totalPages = totalPages + 1;
                hasFooterOnlyPage = true;
            }
        }
    }

    return { rowsPerPage, totalPages, singleRowHeight, minTopOffset, detailDataKey, hasFooterOnlyPage };
}

/**
 * 转换样式对象为 CSS 字符串
 */
function styleToString(style: Record<string, any>): string {
    return Object.entries(style)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            // 数字值需要加 px（除了 zIndex, opacity, lineHeight 等）
            const needsPx = typeof value === 'number' && !['z-index', 'opacity', 'line-height', 'font-weight'].includes(cssKey);
            return `${cssKey}:${value}${needsPx ? 'px' : ''}`;
        })
        .join(';');
}

/**
 * 渲染线条为 HTML
 */
function renderLine(obj: ControlObject, bandTop: number, minTopOffset: number): string {
    const lineObj = obj as any;
    const x1 = lineObj.x1 ?? obj.x;
    const y1 = (lineObj.y1 ?? obj.y) - bandTop - minTopOffset;
    const x2 = lineObj.x2 ?? (obj.x + obj.width);
    const y2 = (lineObj.y2 ?? obj.y) - bandTop - minTopOffset;
    const strokeColor = lineObj.color || '#000000';
    const strokeWidth = lineObj.strokeWidth || 1;
    const lineStyle = lineObj.lineStyle || 'solid';

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const borderStyle = lineStyle === 'dashed' ? 'dashed' : lineStyle === 'dotted' ? 'dotted' : 'solid';

    return `<div style="position:absolute;left:${x1}px;top:${y1}px;width:${length}px;height:0;border-top:${strokeWidth}px ${borderStyle} ${strokeColor};transform-origin:0 0;transform:rotate(${angle}deg);z-index:${(obj.zIndex ?? 1) + 100}"></div>`;
}

/**
 * 渲染对象为 HTML
 */
function renderObject(
    obj: ControlObject,
    content: string,
    bandTop: number,
    minTopOffset: number,
): string {
    const baseStyle = getBaseObjectStyle(obj, { isPreview: true });
    const isTextElement = ['text', 'multiline_text', 'field', 'calculated', 'page_number', 'current_date'].includes(obj.type);
    const objTop = obj.y - bandTop - minTopOffset;

    // 构建样式
    const style: Record<string, any> = {
        position: 'absolute',
        left: obj.x,
        top: objTop,
        width: obj.width,
        height: obj.height,
        zIndex: (obj.zIndex ?? 1) + 100,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...baseStyle,
    };

    // 文本元素添加 flex 布局
    if (isTextElement) {
        const verticalAlign = (obj as ControlObjectAll).textVerticalAlign || 'middle';
        const textAlign = (obj as ControlObjectAll).textAlign || 'left';
        style.display = 'flex';
        style.flexDirection = 'column';
        style.justifyContent = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
        style.alignItems = textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';
    }

    const styleStr = styleToString(style);

    // 图片类型
    if (obj.type === 'image') {
        const imgObj = obj as ControlObjectAll;
        const src = imgObj.src || imgObj.imageUrl;
        if (src) {
            if (imgObj.objectFit === 'repeat') {
                return `<div style="${styleStr}"><div style="width:100%;height:100%;background-image:url(${src});background-repeat:repeat;background-size:auto"></div></div>`;
            }
            return `<div style="${styleStr}"><img src="${src}" alt="${imgObj.alt || '图片'}" style="width:100%;height:100%;object-fit:${imgObj.objectFit || 'contain'}"/></div>`;
        }
        return `<div style="${styleStr}"><span style="color:#999;font-size:12px">[图片]</span></div>`;
    }

    // 条码 - 使用 JsBarcode 生成 SVG
    if (obj.type === 'barcode') {
        const barcodeObj = obj as ControlObjectAll;
        const barcodeType = barcodeObj.barcodeType || 'CODE128';
        const showText = barcodeObj.showText !== false;
        const background = barcodeObj.background || '#FFFFFF';
        const lineColor = barcodeObj.lineColor || '#000000';
        
        if (!content) {
            return `<div style="${styleStr}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${background};color:#999;font-size:12px">[条码]</div></div>`;
        }
        
        try {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            JsBarcode(svg, content, {
                format: barcodeType as any,
                width: 2,
                height: showText ? Math.max(obj.height - 20, 20) : obj.height,
                displayValue: showText,
                background,
                lineColor,
                margin: 2,
                fontSize: 12,
                textMargin: 2,
            });
            // 设置 SVG 宽高100%
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('preserveAspectRatio', 'none');
            return `<div style="${styleStr}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden">${svg.outerHTML}</div></div>`;
        } catch (err) {
            console.error('条码生成失败:', err);
            return `<div style="${styleStr}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#f00;font-size:12px">[条码错误]</div></div>`;
        }
    }
    
    // 二维码 - 同步生成 SVG
    if (obj.type === 'qrcode') {
        const qrObj = obj as ControlObjectAll;
        const background = qrObj.background || '#FFFFFF';
        const foreground = qrObj.foreground || '#000000';
        const errorLevel = qrObj.errorLevel || 'M';
        
        if (!content) {
            return `<div style="${styleStr}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${background};color:#999;font-size:12px">[二维码]</div></div>`;
        }
        
        try {
            // 使用 qrcode 库的 create 方法同步生成二维码数据
            const qr = QRCode.create(content, {
                errorCorrectionLevel: errorLevel as any,
            });
            
            const modules = qr.modules;
            const size = modules.size;
            const margin = 1;
            const cellSize = 10; // 每个单元格的大小
            const totalSize = (size + margin * 2) * cellSize;
            
            // 生成 SVG 路径
            let pathData = '';
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (modules.get(row, col)) {
                        const x = (col + margin) * cellSize;
                        const y = (row + margin) * cellSize;
                        pathData += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
                    }
                }
            }
            
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"><rect width="100%" height="100%" fill="${background}"/><path d="${pathData}" fill="${foreground}"/></svg>`;
            
            return `<div style="${styleStr}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${background}">${svg}</div></div>`;
        } catch (err) {
            console.error('二维码生成失败:', err);
            return `<div style="${styleStr}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#f00;font-size:12px">[二维码错误]</div></div>`;
        }
    }

    // 文本类型 - 处理多行文本的 HTML
    if (obj.type === 'multiline_text') {
        return `<div style="${styleStr}"><div style="width:100%;word-break:break-word;white-space:normal">${content}</div></div>`;
    }

    // 普通文本
    const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

    return `<div style="${styleStr}"><span style="white-space:nowrap">${escapedContent}</span></div>`;
}

/**
 * 渲染带区对象
 */
function renderBandObjects(
    band: Band,
    options: {
        data: any;
        currentPage: number;
        totalPages: number;
        startIndex?: number;
        rowIndex?: number;
        pageSize?: number;
        minTopOffset?: number;
        dataFields?: DataField[];
    }
): string {
    const { data, currentPage, totalPages, startIndex = 0, rowIndex = 0, pageSize = 0, minTopOffset = 0, dataFields = [] } = options;
    let html = '';

    band.objects
        .filter(obj => obj.printVisible !== false && !((obj as ControlObjectAll).floating === true && obj.type === 'image'))
        .forEach(obj => {
            if (obj.type === 'line') {
                html += renderLine(obj, band.top, minTopOffset);
            } else {
                const content = getObjectContent(obj, {
                    data,
                    currentPage,
                    totalPages,
                    startIndex,
                    rowIndex,
                    pageSize,
                    dataFields,
                });
                html += renderObject(obj, content, band.top, minTopOffset);
            }
        });

    return html;
}

/**
 * 渲染单页 HTML
 */
function renderPage(
    options: PrintOptions,
    pageNum: number,
    pagination: ReturnType<typeof calculatePagination>
): string {
    const {
        template,
        data,
        dataFields = [],
    } = options;
    
    const { pageWidth, pageHeight, pageMargins } = getPageDimensions(options);

    const { rowsPerPage, totalPages, singleRowHeight, minTopOffset, detailDataKey, hasFooterOnlyPage } = pagination;

    const headerBand = template.find(b => b.id === 'header');
    const detailBand = template.find(b => b.id === 'detail');
    const summaryBand = template.find(b => b.id === 'summary');
    const footerBand = template.find(b => b.id === 'footer');

    const contentWidth = pageWidth - pageMargins.left - pageMargins.right;
    let currentY = pageMargins.top;
    let pageContent = '';
    
    const isLastPage = pageNum === totalPages;
    const isFooterOnlyPage = hasFooterOnlyPage && isLastPage;

    // 如果是脚注专用页，只渲染脚注带（不显示表头）
    if (isFooterOnlyPage) {
        if (footerBand) {
            const bandHeight = footerBand.actualBottom - footerBand.top;
            const bgStyle = footerBand.backgroundColor ? `background-color:${footerBand.backgroundColor};` : '';
            pageContent += `<div style="position:absolute;top:${currentY}px;left:${pageMargins.left}px;width:${contentWidth}px;height:${bandHeight}px;overflow:hidden;${bgStyle}">`;
            pageContent += renderBandObjects(footerBand, { 
                data, 
                currentPage: pageNum, 
                totalPages, 
                dataFields 
            });
            pageContent += '</div>';
        }
        return `<div class="print-page" style="position:relative;width:${pageWidth}px;height:${pageHeight}px;background:#fff;box-sizing:border-box;page-break-after:always">${pageContent}</div>`;
    }

    // 处理正常页面
    const detailItems = data?.[detailDataKey!] as any[] | undefined;
    const pagesWithDetail = hasFooterOnlyPage ? totalPages - 1 : totalPages;
    const startIndex = (pageNum - 1) * rowsPerPage;
    const pageItems = (pageNum <= pagesWithDetail && detailItems)
        ? detailItems.slice(startIndex, startIndex + rowsPerPage)
        : [];

    // 头部带区
    if (headerBand) {
        const bandHeight = headerBand.actualBottom - headerBand.top;
        const bgStyle = headerBand.backgroundColor ? `background-color:${headerBand.backgroundColor};` : '';
        pageContent += `<div style="position:absolute;top:${currentY}px;left:${pageMargins.left}px;width:${contentWidth}px;height:${bandHeight}px;overflow:hidden;${bgStyle}">`;
        pageContent += renderBandObjects(headerBand, { data, currentPage: pageNum, totalPages, dataFields });
        pageContent += '</div>';
        currentY += bandHeight;
    }

    // 明细带区
    if (detailBand && pageItems.length > 0) {
        const detailHeight = pageItems.length * singleRowHeight;
        pageContent += `<div style="position:absolute;top:${currentY}px;left:${pageMargins.left}px;width:${contentWidth}px;height:${detailHeight}px;overflow:hidden">`;

        pageItems.forEach((_, rowIndex) => {
            const globalRowIndex = startIndex + rowIndex;
            
            // 行背景色
            let rowBgColor = '';
            if (detailBand.backgroundColorFormula) {
                const result = evaluateFormula(detailBand.backgroundColorFormula, {
                    data,
                    currentPage: pageNum,
                    totalPages,
                    rowIndex: globalRowIndex,
                }, {});
                if (result && !result.includes('错误')) {
                    rowBgColor = result.replace(/^["']|["']$/g, '');
                }
            } else if (detailBand.backgroundColor) {
                rowBgColor = detailBand.backgroundColor;
            }

            const rowStyle = `position:absolute;top:${rowIndex * singleRowHeight}px;left:0;width:100%;height:${singleRowHeight}px;overflow:hidden;${rowBgColor ? `background-color:${rowBgColor};` : ''}`;
            pageContent += `<div style="${rowStyle}">`;
            pageContent += renderBandObjects(detailBand, {
                data,
                currentPage: pageNum,
                totalPages,
                startIndex,
                rowIndex,
                pageSize: rowsPerPage,
                minTopOffset,
                dataFields,
            });
            pageContent += '</div>';
        });

        pageContent += '</div>';
        currentY += detailHeight;
    }

    // 汇总带区
    const summaryDisplayMode = summaryBand?.summaryDisplayMode || 'atEnd';
    // 如果有脚注专用页，汇总应该在倒数第二页显示
    const showSummaryOnThisPage = summaryDisplayMode === 'perPage' || 
        (summaryDisplayMode === 'atEnd' && (hasFooterOnlyPage ? pageNum === totalPages - 1 : isLastPage));
    if (summaryBand && showSummaryOnThisPage) {
        const bandHeight = summaryBand.actualBottom - summaryBand.top;
        const bgStyle = summaryBand.backgroundColor ? `background-color:${summaryBand.backgroundColor};` : '';
        pageContent += `<div style="position:absolute;top:${currentY}px;left:${pageMargins.left}px;width:${contentWidth}px;height:${bandHeight}px;overflow:hidden;${bgStyle}">`;
        // 传递 startIndex 和 pageSize，以便 PAGESUM 等函数计算当前页数据
        pageContent += renderBandObjects(summaryBand, { 
            data, 
            currentPage: pageNum, 
            totalPages, 
            startIndex,
            pageSize: pageItems.length,
            dataFields 
        });
        pageContent += '</div>';
        currentY += bandHeight;
    }

    // 页脚带区（只在最后一页显示，且不是脚注专用页时）
    if (footerBand && isLastPage && !hasFooterOnlyPage) {
        const bandHeight = footerBand.actualBottom - footerBand.top;
        const bgStyle = footerBand.backgroundColor ? `background-color:${footerBand.backgroundColor};` : '';
        pageContent += `<div style="position:absolute;top:${currentY}px;left:${pageMargins.left}px;width:${contentWidth}px;height:${bandHeight}px;overflow:hidden;${bgStyle}">`;
        pageContent += renderBandObjects(footerBand, { 
            data, 
            currentPage: pageNum, 
            totalPages, 
            startIndex,
            pageSize: pageItems.length,
            dataFields 
        });
        pageContent += '</div>';
    }

    return `<div class="print-page" style="position:relative;width:${pageWidth}px;height:${pageHeight}px;background:#fff;box-sizing:border-box;page-break-after:always">${pageContent}</div>`;
}

/**
 * 渲染为 HTML 字符串
 * @param options 打印配置
 * @returns 渲染结果，包含 HTML 字符串和分页信息
 */
export function renderToHtml(options: PrintOptions): RenderResult {
    const { pageWidth, pageHeight, paperWidthMm, paperHeightMm } = getPageDimensions(options);

    const pagination = calculatePagination(options);
    const { totalPages } = pagination;

    let html = '';
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        html += renderPage(options, pageNum, pagination);
    }

    return {
        html,
        totalPages,
        pageWidth,
        pageHeight,
        paperWidthMm,
        paperHeightMm,
    };
}

/**
 * 创建用于渲染的 DOM 容器，并处理二维码渲染
 */
async function createRenderContainer(html: string, pageWidth: number): Promise<HTMLDivElement> {
    const container = document.createElement('div');
    container.style.cssText = `position:absolute;left:-9999px;top:0;width:${pageWidth}px;`;
    container.innerHTML = html;
    document.body.appendChild(container);
    
    // 处理二维码渲染
    const qrcodeElements = container.querySelectorAll('[data-qrcode="true"]');
    const qrPromises: Promise<void>[] = [];
    
    qrcodeElements.forEach(el => {
        const value = decodeURIComponent(el.getAttribute('data-value') || '');
        const bg = el.getAttribute('data-bg') || '#FFFFFF';
        const fg = el.getAttribute('data-fg') || '#000000';
        const level = el.getAttribute('data-level') || 'M';
        const size = parseInt(el.getAttribute('data-size') || '100', 10);
        const canvas = el.querySelector('canvas') as HTMLCanvasElement;
        
        if (canvas && value) {
            const promise = QRCode.toCanvas(canvas, value, {
                width: size,
                margin: 1,
                errorCorrectionLevel: level as any,
                color: { dark: fg, light: bg },
            }).catch(err => console.error('二维码生成失败:', err));
            qrPromises.push(promise as Promise<void>);
        }
    });
    
    // 等待所有二维码渲染完成
    await Promise.all(qrPromises);
    
    return container;
}

/**
 * 导出为 PDF
 * @param options PDF 导出配置
 * @returns Promise<Blob> 如果 download 为 false，返回 PDF Blob
 */
export async function exportToPdf(options: PdfExportOptions): Promise<Blob | void> {
    const {
        fileName = `报表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`,
        download = true,
        scale = 2,
    } = options;
    
    const { pageWidth, paperWidthMm, paperHeightMm } = getPageDimensions(options);

    // 先渲染为 HTML
    const { html } = renderToHtml(options);

    // 创建临时容器（异步处理二维码）
    const container = await createRenderContainer(html, pageWidth);

    try {
        // 创建 PDF
        const isLandscape = paperWidthMm > paperHeightMm;
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [Math.min(paperWidthMm, paperHeightMm), Math.max(paperWidthMm, paperHeightMm)]
        });

        const pdfWidth = paperWidthMm;
        const pdfHeight = paperHeightMm;

        // 获取所有页面元素
        const pageElements = container.querySelectorAll('.print-page');

        for (let i = 0; i < pageElements.length; i++) {
            const pageEl = pageElements[i] as HTMLElement;

            // 使用 html2canvas 转换为图片
            const canvas = await html2canvas(pageEl, {
                scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            if (i > 0) {
                pdf.addPage();
            }

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
        }

        if (download) {
            pdf.save(`${fileName}.pdf`);
        } else {
            return pdf.output('blob');
        }
    } finally {
        // 清理临时容器
        document.body.removeChild(container);
    }
}

/**
 * 获取可打印的 HTML（包含完整样式）
 * @param options 打印配置
 * @returns 完整的 HTML 文档字符串，可直接用于 window.print()
 */
export function getPrintableHtml(options: PrintOptions): string {
    const { html, pageWidth, pageHeight } = renderToHtml(options);

    // 与 PrintPreview.css 保持一致的打印样式
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>打印预览</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        }
        .print-page {
            width: ${pageWidth}px;
            height: ${pageHeight}px;
            position: relative;
            background: #fff;
            box-sizing: border-box;
            overflow: hidden;
        }
        @media screen {
            body {
                background: #e0e0e0;
                padding: 20px;
            }
            .print-page {
                margin: 0 auto 20px auto;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
        }
        @media print {
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .print-page { 
                box-shadow: none !important;
                margin: 0 !important;
                page-break-after: always;
            }
            .print-page:last-child { 
                page-break-after: auto; 
            }
        }
        /* 禁用系统打印边距 */
        @page {
            margin: 0;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
</head>
<body>
${html}
<script>
    // 渲染二维码
    document.querySelectorAll('[data-qrcode="true"]').forEach(function(el) {
        var value = decodeURIComponent(el.getAttribute('data-value') || '');
        var bg = el.getAttribute('data-bg') || '#FFFFFF';
        var fg = el.getAttribute('data-fg') || '#000000';
        var level = el.getAttribute('data-level') || 'M';
        var size = parseInt(el.getAttribute('data-size') || '100', 10);
        var canvas = el.querySelector('canvas');
        if (canvas && value && window.QRCode) {
            QRCode.toCanvas(canvas, value, {
                width: size,
                margin: 1,
                errorCorrectionLevel: level,
                color: { dark: fg, light: bg }
            });
        }
    });
</script>
</body>
</html>`;
}

/**
 * 在新窗口中打开打印预览
 * @param options 打印配置
 */
export function openPrintWindow(options: PrintOptions): void {
    const printHtml = getPrintableHtml(options);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        // 等待内容加载完成后打印
        printWindow.onload = () => {
            printWindow.print();
        };
    }
}
