
import React, { useCallback, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { ControlObject, Band } from './../types/types';
import { ControlObjectAll } from './../types/controlTypes';
import { BarcodeRenderer, QRCodeRenderer } from './BarcodeRenderer';

interface DraggableObjectProps {
    object: ControlObjectAll;
    band: Band;
    style: React.CSSProperties;
    content: string;
    wrappedContent?: React.ReactElement | string; // 包含 HTML 渲染的内容
    isSelected: boolean;
    isFocused?: boolean; // 焦点状态（只显示虚线框，不显示调整手柄）
    selectedObjectIds?: string[]; // 新增：所有选中的对象ID
    onSelect: (e: React.MouseEvent) => void;
    onUpdatePosition: (objectId: string, x: number, y: number) => void;
    onUpdateSize?: (objectId: string, width: number, height: number) => void;
    onUpdate?: (objectId: string, updates: Partial<ControlObject>) => void;
    onDragMultiple?: (deltaX: number, deltaY: number) => void; // 新增：多选拖动回调
    minWidth?: number;
    minHeight?: number;
}

const DraggableObject: React.FC<DraggableObjectProps> = ({
    object,
    band,
    style,
    content,
    wrappedContent,
    isSelected,
    isFocused = false,
    selectedObjectIds = [],
    onSelect,
    onUpdatePosition,
    onUpdateSize,
    onUpdate,
    onDragMultiple,
    minWidth = 20,
    minHeight = 20,
}) => {
    // 记录拖动开始位置
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    // 记录是否刚刚完成拖动，用于阻止拖动后的 click 事件触发选择变更
    const justDraggedRef = useRef(false);
    // 调整过程中的尺寸（用于实时更新手柄位置）
    const [resizingSize, setResizingSize] = useState<{ width: number; height: number } | null>(null);
    // 解析边框宽度
    const parseBorderWidth = (border: string | undefined): number => {
        if (!border || border === 'none') return 0;
        // 尝试从 "1px solid black" 这样的字符串中提取宽度
        const match = border.match(/(\d+)px/);
        return match ? parseInt(match[1]) : 0;
    };

    // 获取边框宽度
    const borderWidth = parseBorderWidth(style.border as string);
    // 线条和浮动图片不需要额外的内边距，其他控件也不需要（与打印预览保持一致）
    const isLine = object.type === 'line';
    const isFloatingImage = object.type === 'image' && object.floating;
    const padding = 0;  // 统一不添加额外的 padding

    // 总的外扩尺寸（边框 + 内边距）
    const totalExtra = (isLine || isFloatingImage) ? 0 : (borderWidth + padding);

    // 根据控件类型计算实际最小尺寸
    const getMinSize = () => {
        if (isLine) {
            // 线条：宽度最小20，高度最小1（粗细）
            return { minW: 20, minH: 1 };
        }
        // 其他控件使用传入的默认值
        return { minW: minWidth, minH: minHeight };
    };
    const { minW, minH } = getMinSize();

    const handleDragStop = useCallback((e: any, d: { x: number; y: number }) => {
        // 检查是否实际发生了移动
        const startPos = dragStartRef.current;
        const hasMoved = startPos && (Math.abs(d.x - startPos.x) > 1 || Math.abs(d.y - startPos.y) > 1);
        
        // 只有实际移动了才标记为刚完成拖动，阻止后续 click 事件
        if (hasMoved) {
            justDraggedRef.current = true;
            setTimeout(() => {
                justDraggedRef.current = false;
            }, 0);
        }
        
        dragStartRef.current = null;
        
        // 如果是多选拖动，在 onDrag 中已经处理了
        if (selectedObjectIds.length > 1 && isSelected) {
            return;
        }
        
        // 只有实际移动了才更新位置
        if (hasMoved) {
            onUpdatePosition(object.id, d.x, d.y);
        }
    }, [object.id, onUpdatePosition, selectedObjectIds.length, isSelected]);

    // 处理拖动开始
    const handleDragStart = useCallback((e: any, d: { x: number; y: number }) => {
        dragStartRef.current = { x: d.x, y: d.y };
    }, []);

    // 处理拖动过程
    const handleDrag = useCallback((e: any, d: { x: number; y: number }) => {
        // 多选拖动：当前对象被选中且有多个选中对象
        if (selectedObjectIds.length > 1 && isSelected && dragStartRef.current && onDragMultiple) {
            const deltaX = d.x - dragStartRef.current.x;
            const deltaY = d.y - dragStartRef.current.y;
            
            if (deltaX !== 0 || deltaY !== 0) {
                onDragMultiple(deltaX, deltaY);
                dragStartRef.current = { x: d.x, y: d.y };
            }
        }
    }, [selectedObjectIds.length, isSelected, onDragMultiple]);

    const handleResizeStop = useCallback((e: any, direction: any, ref: HTMLElement, delta: any, position: { x: number; y: number }) => {
        // 清除调整状态
        setResizingSize(null);
        // Rnd 返回的是包含所有样式（padding + border）后的实际尺寸
        const actualWidth = parseInt(ref.style.width);
        const actualHeight = parseInt(ref.style.height);

        // 计算内容区域的尺寸（减去边框和内边距）
        let contentWidth = actualWidth - (totalExtra * 2);
        let contentHeight = actualHeight - (totalExtra * 2);

        // 二维码保持正方形（取较大值）
        if (object.type === 'qrcode') {
            const size = Math.max(contentWidth, contentHeight);
            contentWidth = size;
            contentHeight = size;
        }

        if (onUpdate) {
            onUpdate(object.id, {
                x: position.x,
                y: position.y,
                width: contentWidth,
                height: contentHeight,
            });
        } else {
            onUpdatePosition(object.id, position.x, position.y);
            onUpdateSize && onUpdateSize(object.id, contentWidth, contentHeight);
        }
    }, [object.id, object.type, onUpdate, onUpdatePosition, onUpdateSize, totalExtra]);

    // 处理调整过程（实时更新手柄位置）
    const handleResize = useCallback((e: any, direction: any, ref: HTMLElement) => {
        const width = parseInt(ref.style.width);
        const height = parseInt(ref.style.height);
        setResizingSize({ width, height });
    }, []);

    // 计算Rnd的实际尺寸（内容尺寸 + 边框 + 内边距）
    const rndWidth = object.width + (totalExtra * 2);
    const rndHeight = object.height + (totalExtra * 2);
    // 手柄使用的尺寸（调整时使用实时尺寸，否则使用对象尺寸）
    const handleWidth = resizingSize?.width ?? rndWidth;
    const handleHeight = resizingSize?.height ?? rndHeight;

    // 内容区域样式（实际内容）
    const contentStyle: React.CSSProperties = {
        fontSize: style.fontSize,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textAlign: style.textAlign as any,
        lineHeight: style.lineHeight,
        padding: style.padding, // 使用原始的padding
        border: style.border, // 使用原始的border
        borderRadius: style.borderRadius, // 圆角
        clipPath: style.clipPath,
        display: style.display || 'block', // 使用原始的display或默认值
        alignItems: style.alignItems, // 使用原始的对齐方式
        justifyContent: style.justifyContent,
        width: '100%',
        height: '100%',
        overflow: style.overflow || 'hidden',
        boxSizing: 'border-box',
        // 添加更多可能的样式属性
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
        verticalAlign: style.verticalAlign,
        flexDirection: style.flexDirection,
        flexWrap: style.flexWrap,
    };

    // 计算最小尺寸（包含边框和内边距）
    const actualMinWidth = minW + (totalExtra * 2);
    const actualMinHeight = minH + (totalExtra * 2);

    return (
        <Rnd
            // 使用包含边框和内边距的尺寸
            size={{ width: rndWidth, height: rndHeight }}
            position={{ x: object.x, y: object.y }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            // 使用实际的最小尺寸
            minWidth={actualMinWidth}
            minHeight={actualMinHeight}
            // 二维码保持宽高比 1:1
            lockAspectRatio={object.type === 'qrcode'}
            bounds="parent"
            disableDragging={!isSelected}
            enableResizing={(isSelected && !isFocused) ? {
                bottom: true,
                bottomLeft: true,
                bottomRight: true,
                left: true,
                right: true,
                top: true,
                topLeft: true,
                topRight: true,
            } : false}
            // 隐藏默认的调整手柄样式，使用自定义圆形手柄
            resizeHandleStyles={{
                bottom: { opacity: 0, cursor: 'ns-resize' },
                bottomLeft: { opacity: 0, cursor: 'nesw-resize' },
                bottomRight: { opacity: 0, cursor: 'nwse-resize' },
                left: { opacity: 0, cursor: 'ew-resize' },
                right: { opacity: 0, cursor: 'ew-resize' },
                top: { opacity: 0, cursor: 'ns-resize' },
                topLeft: { opacity: 0, cursor: 'nwse-resize' },
                topRight: { opacity: 0, cursor: 'nesw-resize' },
            }}
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                // 如果刚完成拖动，不触发选择变更，保留当前选中状态
                if (justDraggedRef.current) {
                    return;
                }
                onSelect(e);
            }}
            style={{
                position: 'absolute',
                // 浮动图片作为背景，显示在所有元素之下
                // 浮动图片 zIndex: 1-10，普通元素 zIndex: 100+
                zIndex: object.type === 'image' && object.floating 
                    ? (isSelected ? 10 : 1)  // 浮动图片在底层
                    : (isSelected ? 1000 + (object.zIndex ?? 100) : (object.zIndex ?? 100)),
                // 选中状态：蓝色虚线框；焦点状态：绿色虚线框；默认：浅灰虚线框
                outline: isSelected || isFocused
                    ? '1px dashed #4d90fe' 
                        : '1px dashed rgb(221, 221, 221)',
                boxSizing: 'border-box',
                margin: 0,
                padding: 0,
                backgroundColor: isSelected 
                    ? 'rgba(77, 144, 254, 0.05)' 
                    : isFocused 
                        ? 'rgba(82, 196, 26, 0.03)' 
                        : 'transparent',
            }}
        >
            {/* 选中状态时显示圆形控制点手柄（类似线段的手柄样式） */}
            {isSelected && !isFocused && (
                <svg
                    style={{
                        position: 'absolute',
                        top: -5,
                        left: -5,
                        width: handleWidth + 10,
                        height: handleHeight + 10,
                        pointerEvents: 'none',
                        overflow: 'visible',
                        zIndex: 1,
                    }}
                >
                    {/* 四个角的控制点 */}
                    <circle cx={5} cy={5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    <circle cx={handleWidth + 5} cy={5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    <circle cx={5} cy={handleHeight + 5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    <circle cx={handleWidth + 5} cy={handleHeight + 5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    {/* 四个边中点的控制点 */}
                    <circle cx={handleWidth / 2 + 5} cy={5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    <circle cx={handleWidth / 2 + 5} cy={handleHeight + 5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    <circle cx={5} cy={handleHeight / 2 + 5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                    <circle cx={handleWidth + 5} cy={handleHeight / 2 + 5} r={3} fill="white" stroke="#4d90fe" strokeWidth={0.5} strokeDasharray="2 1" />
                </svg>
            )}
            <div
                className={`design-object ${object.type} `}
                style={contentStyle}
                data-object-id={`${band.id}-${object.id}`}
            >
                {/* 图片类型特殊处理 */}
                {object.type === 'image' ? (
                    object.src || object.imageUrl ? (
                        object.objectFit === 'repeat' ? (
                            // 平铺模式：使用背景图片平铺
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundImage: `url(${object.src || object.imageUrl})`,
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: 'auto',
                                    pointerEvents: 'none',  // 不拦截拖动事件
                                }}
                            />
                        ) : (
                            // 其他模式：使用 img 标签
                            <img
                                src={object.src || object.imageUrl}
                                alt={object.alt || '图片'}
                                draggable={false}  // 禁用浏览器默认拖拽
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: object.objectFit || 'contain',
                                    pointerEvents: 'none',  // 不拦截拖动事件
                                }}
                            />
                        )
                    ) : (
                        // 没有图片源时显示占位文本
                        <span style={{ color: '#999', fontSize: '12px' }}>[图片]</span>
                    )
                ) : object.type === 'barcode' ? (
                    // 条码渲染
                    <BarcodeRenderer
                        value={object.text || ''}
                        type={object.barcodeType || 'CODE128'}
                        width={object.width}
                        height={object.height}
                        showText={object.showText !== false}
                        background={object.background || '#FFFFFF'}
                        lineColor={object.lineColor || '#000000'}
                    />
                ) : object.type === 'qrcode' ? (
                    // 二维码渲染
                    <QRCodeRenderer
                        value={object.text || ''}
                        width={object.width}
                        height={object.height}
                        errorLevel={object.errorLevel || 'M'}
                        background={object.background || '#FFFFFF'}
                        foreground={object.foreground || '#000000'}
                    />
                ) : (
                    // 优先使用 wrappedContent（包含 HTML 渲染）
                    wrappedContent || content
                )}
            </div>
        </Rnd>
    );
};

export default DraggableObject;