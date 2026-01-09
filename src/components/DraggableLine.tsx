import React, { useRef } from 'react';
import { Band } from './../types/types';

interface LineObject {
    id: string;
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color?: string;
    strokeWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    zIndex?: number;
}

interface DraggableLineProps {
    object: LineObject;
    band: Band;
    isSelected: boolean;
    isFocused?: boolean;  // 焦点状态（只显示虚线框，不显示调整手柄）
    selectedObjectIds?: string[];  // 多选的对象ID列表
    onSelect: (e: React.MouseEvent) => void;
    onUpdate: (objectId: string, updates: Partial<LineObject>, skipHistory?: boolean) => void;
    onDragMultiple?: (deltaX: number, deltaY: number, skipHistory?: boolean) => void;  // 多选拖动回调
}

const DraggableLine: React.FC<DraggableLineProps> = ({
    object,
    band,
    isSelected,
    isFocused = false,
    selectedObjectIds,
    onSelect,
    onUpdate,
    onDragMultiple,
}) => {
    const draggingRef = useRef<'none' | 'line' | 'start' | 'end'>('none');
    const dragStartRef = useRef<{ x: number; y: number; x1: number; y1: number; x2: number; y2: number } | null>(null);
    // 保存拖动开始时的初始位置，用于在释放时记录历史
    const initialPosRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    // 记录是否刚刚完成拖动（用于阻止 click 事件清除选中）
    const justFinishedDraggingRef = useRef<boolean>(false);
    // 保存拖动开始时的容器位置，避免拖动过程中容器跳动
    // 保存四个边界，拖动过程中只扩展不收缩
    const containerPosRef = useRef<{ left: number; top: number; right: number; bottom: number } | null>(null);
    // 保存拖动开始时的鼠标位置，用于 Shift 锁定方向判断
    const initialMousePosRef = useRef<{ x: number; y: number } | null>(null);
    // Shift 键锁定方向：'x' 表示只能水平移动，'y' 表示只能垂直移动
    const lockDirectionRef = useRef<'x' | 'y' | null>(null);

    // 保存最新的 onUpdate 引用，避免闭包问题
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const objectRef = useRef(object);
    objectRef.current = object;

    // 计算裁剪后的线条坐标（未选中时只显示带区内的部分，选中时显示完整）
    const bandTop = band.top;
    const bandBottom = band.actualBottom;

    let clippedX1 = object.x1;
    let clippedY1 = object.y1;
    let clippedX2 = object.x2;
    let clippedY2 = object.y2;
    let isVisible = true;

    const minY = Math.min(object.y1, object.y2);
    const maxY = Math.max(object.y1, object.y2);

    // 选中时显示完整线条，未选中时裁剪
    if (!isSelected) {
        // 检查线条是否完全在带区外
        if (maxY <= bandTop || minY >= bandBottom) {
            isVisible = false;
        } else {
            // 对于部分超出的线条，计算与边界的交点
            if (object.y1 !== object.y2) {
                const dx = object.x2 - object.x1;
                const dy = object.y2 - object.y1;

                if (object.y1 < bandTop) {
                    clippedX1 = object.x1 + dx * (bandTop - object.y1) / dy;
                    clippedY1 = bandTop;
                } else if (object.y1 > bandBottom) {
                    clippedX1 = object.x1 + dx * (bandBottom - object.y1) / dy;
                    clippedY1 = bandBottom;
                }

                if (object.y2 < bandTop) {
                    clippedX2 = object.x2 + dx * (bandTop - object.y2) / dy;
                    clippedY2 = bandTop;
                } else if (object.y2 > bandBottom) {
                    clippedX2 = object.x2 + dx * (bandBottom - object.y2) / dy;
                    clippedY2 = bandBottom;
                }
            } else {
                // 横线：检查是否在带区范围内
                if (object.y1 < bandTop || object.y1 > bandBottom) {
                    isVisible = false;
                }
            }
        }
    }

    // 计算边界框 - 使用实际坐标，不依赖 min/max
    const actualX1 = clippedX1;
    const actualY1 = clippedY1;
    const actualX2 = clippedX2;
    const actualY2 = clippedY2;

    // SVG 容器位置
    // 如果正在拖动端点，使用固定的容器边界，避免容器跳动
    let containerLeft: number;
    let containerTop: number;
    let containerRight: number;
    let containerBottom: number;

    if (containerPosRef.current) {
        // 拖动过程中，使用固定边界
        containerLeft = containerPosRef.current.left;
        containerTop = containerPosRef.current.top;
        containerRight = containerPosRef.current.right;
        containerBottom = containerPosRef.current.bottom;
    } else {
        // 非拖动状态，使用紧凑容器
        containerLeft = Math.min(object.x1, object.x2);
        containerTop = Math.min(object.y1, object.y2);
        containerRight = Math.max(object.x1, object.x2);
        containerBottom = Math.max(object.y1, object.y2);
    }

    const width = (containerRight - containerLeft) || 1;
    const height = (containerBottom - containerTop) || 1;

    // 控制点半径
    const handleRadius = 3;
    const handleStroke = 0.5;

    // 线条样式
    const strokeColor = object.color || '#000000';
    const strokeWidth = object.strokeWidth || 1;
    const lineStyle = object.lineStyle || 'solid';

    // 计算虚线样式
    const getStrokeDasharray = () => {
        if (lineStyle === 'dashed') return `${strokeWidth * 4} ${strokeWidth * 2}`;
        if (lineStyle === 'dotted') return `${strokeWidth} ${strokeWidth * 2}`;
        return 'none';
    };

    // 处理线条点击
    const handleLineClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // 如果刚刚完成拖动，不触发选中逻辑
        if (justFinishedDraggingRef.current) {
            justFinishedDraggingRef.current = false;
            return;
        }
        onSelect(e);
    };

    // 处理线条拖动开始
    const handleLineMouseDown = (e: React.MouseEvent) => {
        // 右键点击时，触发 onSelect 以便保持多选状态
        if (e.button === 2) {
            e.stopPropagation();
            onSelect(e);
            return;
        }
        if (!isSelected) return;
        e.stopPropagation();
        draggingRef.current = 'line';
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            x1: object.x1,
            y1: object.y1,
            x2: object.x2,
            y2: object.y2,
        };
        // 保存初始位置用于历史记录
        initialPosRef.current = {
            x1: object.x1,
            y1: object.y1,
            x2: object.x2,
            y2: object.y2,
        };
        // 保存初始鼠标位置
        initialMousePosRef.current = { x: e.clientX, y: e.clientY };
        // 重置方向锁定
        lockDirectionRef.current = null;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // 处理起点控制点拖动
    const handleStartMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        draggingRef.current = 'start';
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            x1: object.x1,
            y1: object.y1,
            x2: object.x2,
            y2: object.y2,
        };
        // 保存初始位置用于历史记录
        initialPosRef.current = {
            x1: object.x1,
            y1: object.y1,
            x2: object.x2,
            y2: object.y2,
        };
        // 保存初始鼠标位置用于 Shift 锁定方向
        initialMousePosRef.current = { x: e.clientX, y: e.clientY };
        // 保存当前容器四个边界
        containerPosRef.current = {
            left: Math.min(object.x1, object.x2),
            top: Math.min(object.y1, object.y2),
            right: Math.max(object.x1, object.x2),
            bottom: Math.max(object.y1, object.y2),
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // 处理终点控制点拖动
    const handleEndMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        draggingRef.current = 'end';
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            x1: object.x1,
            y1: object.y1,
            x2: object.x2,
            y2: object.y2,
        };
        initialPosRef.current = {
            x1: object.x1,
            y1: object.y1,
            x2: object.x2,
            y2: object.y2,
        };
        initialMousePosRef.current = { x: e.clientX, y: e.clientY };
        containerPosRef.current = {
            left: Math.min(object.x1, object.x2),
            top: Math.min(object.y1, object.y2),
            right: Math.max(object.x1, object.x2),
            bottom: Math.max(object.y1, object.y2),
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // 处理鼠标移动
    const handleMouseMove = (e: MouseEvent) => {
        const dragging = draggingRef.current;
        if (!dragStartRef.current || dragging === 'none') return;

        // 计算从初始位置的总偏移量
        const totalDeltaX = e.clientX - initialMousePosRef.current!.x;
        const totalDeltaY = e.clientY - initialMousePosRef.current!.y;

        let adjustedDeltaX = totalDeltaX;
        let adjustedDeltaY = totalDeltaY;

        // Shift 键锁定方向（仅对起点/终点拖拽生效）
        if (e.shiftKey && (dragging === 'start' || dragging === 'end') && initialPosRef.current) {
            const initial = initialPosRef.current;
            const isHorizontal = Math.abs(initial.y1 - initial.y2) < 5;
            const isVertical = Math.abs(initial.x1 - initial.x2) < 5;

            if (isHorizontal) {
                // 横线：锁定 Y
                adjustedDeltaY = 0;
            } else if (isVertical) {
                // 竖线：锁定 X
                adjustedDeltaX = 0;
            } else {
                // 斜线：锁定角度，沿斜线方向拉伸
                let lineDx: number, lineDy: number;
                if (dragging === 'start') {
                    // 拖动起点，终点固定，方向是从终点到起点
                    lineDx = initial.x1 - initial.x2;
                    lineDy = initial.y1 - initial.y2;
                } else {
                    // 拖动终点，起点固定，方向是从起点到终点
                    lineDx = initial.x2 - initial.x1;
                    lineDy = initial.y2 - initial.y1;
                }

                const lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
                if (lineLength > 0) {
                    const unitX = lineDx / lineLength;
                    const unitY = lineDy / lineLength;
                    // 将鼠标移动投影到斜线方向
                    const projection = totalDeltaX * unitX + totalDeltaY * unitY;
                    adjustedDeltaX = projection * unitX;
                    adjustedDeltaY = projection * unitY;
                }
            }
        }

        if (dragging === 'line') {
            // 检查是否是选中状态（单选或多选）
            const currentKey = `${band.id}-${object.id}`;
            const isInSelection = selectedObjectIds?.includes(currentKey);
            const hasSelection = isInSelection && selectedObjectIds && selectedObjectIds.length >= 1;

            if (hasSelection && onDragMultiple) {
                // 选中拖动（单选或多选）
                let deltaX = e.clientX - dragStartRef.current.x;
                let deltaY = e.clientY - dragStartRef.current.y;
                
                // Shift 键方向锁定
                if (e.shiftKey && initialMousePosRef.current) {
                    const totalDeltaX = e.clientX - initialMousePosRef.current.x;
                    const totalDeltaY = e.clientY - initialMousePosRef.current.y;
                    
                    // 如果方向未确定，根据移动距离判断
                    if (!lockDirectionRef.current) {
                        const threshold = 5; // 移动超过 5px 才确定方向
                        if (Math.abs(totalDeltaX) > threshold || Math.abs(totalDeltaY) > threshold) {
                            lockDirectionRef.current = Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? 'x' : 'y';
                        }
                    }
                    
                    // 应用方向锁定
                    if (lockDirectionRef.current === 'x') {
                        deltaY = 0;
                    } else if (lockDirectionRef.current === 'y') {
                        deltaX = 0;
                    }
                } else {
                    // 未按住 Shift，清除方向锁定
                    lockDirectionRef.current = null;
                }
                
                dragStartRef.current.x = e.clientX;
                dragStartRef.current.y = e.clientY;
                if (deltaX !== 0 || deltaY !== 0) {
                    onDragMultiple(deltaX, deltaY, true); // 拖动过程中跳过历史记录
                }
            } else {
                // 单选拖动整条线：使用初始位置 + 总偏移量
                const initial = initialPosRef.current!;
                onUpdateRef.current(objectRef.current.id, {
                    x1: initial.x1 + totalDeltaX,
                    y1: initial.y1 + totalDeltaY,
                    x2: initial.x2 + totalDeltaX,
                    y2: initial.y2 + totalDeltaY,
                }, true);
            }
        } else if (dragging === 'start') {
            // 拖动起点：只改变起点，终点保持初始值
            const initial = initialPosRef.current!;
            const newX1 = initial.x1 + adjustedDeltaX;
            const newY1 = initial.y1 + adjustedDeltaY;
            onUpdateRef.current(objectRef.current.id, {
                x1: newX1,
                y1: newY1,
                x2: initial.x2,
                y2: initial.y2,
            }, true);
        } else if (dragging === 'end') {
            // 拖动终点：只改变终点，起点保持初始值
            const initial = initialPosRef.current!;
            const newX2 = initial.x2 + adjustedDeltaX;
            const newY2 = initial.y2 + adjustedDeltaY;
            
            console.log('鼠标拖动终点:', {
                before: { x1: initial.x1, y1: initial.y1, x2: initial.x2, y2: initial.y2 },
                delta: { deltaX: adjustedDeltaX, deltaY: adjustedDeltaY },
                after: { x1: initial.x1, y1: initial.y1, x2: newX2, y2: newY2 }
            });
            
            onUpdateRef.current(objectRef.current.id, {
                x1: initial.x1,
                y1: initial.y1,
                x2: newX2,
                y2: newY2,
            }, true);
        }
    };

    // 处理鼠标释放
    const handleMouseUp = (e: MouseEvent) => {
        const dragging = draggingRef.current;

        // 检查是否是选中拖动（单选或多选）
        const currentKey = `${band.id}-${object.id}`;
        const isInSelection = selectedObjectIds?.includes(currentKey);
        const hasSelection = isInSelection && selectedObjectIds && selectedObjectIds.length >= 1;

        // 如果有拖动发生，在释放时记录历史
        if (dragging !== 'none' && initialPosRef.current) {
            const initial = initialPosRef.current;
            const currentObj = objectRef.current;
            // 检查是否有实际变化
            const hasChanged =
                initial.x1 !== currentObj.x1 ||
                initial.y1 !== currentObj.y1 ||
                initial.x2 !== currentObj.x2 ||
                initial.y2 !== currentObj.y2;

            if (hasChanged) {
                if (dragging === 'line' && hasSelection && onDragMultiple) {
                    // 选中拖动结束（单选或多选），保存历史
                    onDragMultiple(0, 0, false);
                } else {
                    // 单选拖动，记录最终状态到历史（不跳过历史）
                    onUpdateRef.current(currentObj.id, {
                        x1: currentObj.x1,
                        y1: currentObj.y1,
                        x2: currentObj.x2,
                        y2: currentObj.y2,
                    }, false);
                }

                // 只有实际移动了才设置标志位，阻止后续 click 事件清除选中状态
                justFinishedDraggingRef.current = true;
                e.stopPropagation();
                e.preventDefault();
            }
        }

        draggingRef.current = 'none';
        dragStartRef.current = null;
        initialPosRef.current = null;
        initialMousePosRef.current = null;
        lockDirectionRef.current = null;
        containerPosRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // SVG 容器需要足够大以容纳线条和控制点
    const padding = handleRadius + handleStroke;
    const svgWidth = width + padding * 2;
    const svgHeight = height + padding * 2;

    // 裁剪后的线条在 SVG 内的坐标
    const lineX1 = actualX1 - containerLeft + padding;
    const lineY1 = actualY1 - containerTop + padding;
    const lineX2 = actualX2 - containerLeft + padding;
    const lineY2 = actualY2 - containerTop + padding;

    // 原始端点坐标（相对于 SVG 容器）
    const endX1 = object.x1 - containerLeft + padding;
    const endY1 = object.y1 - containerTop + padding;
    const endX2 = object.x2 - containerLeft + padding;
    const endY2 = object.y2 - containerTop + padding;

    // 计算手柄位置：在端点外侧，这样手柄边缘正好在端点位置
    let handleX1 = endX1;
    let handleY1 = endY1;
    let handleX2 = endX2;
    let handleY2 = endY2;
    
    const dx = endX2 - endX1;
    const dy = endY2 - endY1;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    if (lineLength > 0) {
        const unitX = dx / lineLength;
        const unitY = dy / lineLength;
        // 起点手柄向外移动 handleRadius
        handleX1 = endX1 - unitX * handleRadius;
        handleY1 = endY1 - unitY * handleRadius;
        // 终点手柄向外移动 handleRadius
        handleX2 = endX2 + unitX * handleRadius;
        handleY2 = endY2 + unitY * handleRadius;
    }

    // 如果线条完全不可见，不渲染
    if (!isVisible) {
        return null;
    }

    return (
        <svg
            className="design-object design-line"
            width={svgWidth}
            height={svgHeight}
            style={{
                overflow: 'visible', pointerEvents: 'none', position: 'absolute',
                left: containerLeft - padding,
                top: containerTop - padding,
                width: svgWidth,
                height: svgHeight,
                zIndex: isSelected ? 1000 + (object.zIndex ?? 1) : (object.zIndex ?? 1),
                outline: 'none',
                border: 'none',
            }}
        >
            {/* 可点击区域（透明粗线，方便选择） */}
            <line
                x1={lineX1}
                y1={lineY1}
                x2={lineX2}
                y2={lineY2}
                stroke="transparent"
                strokeWidth={Math.max(strokeWidth + 10, 15)}
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
                onClick={handleLineClick}
                onMouseDown={handleLineMouseDown}
            />

            {/* 实际线条（裁剪后） */}
            <line
                x1={lineX1}
                y1={lineY1}
                x2={lineX2}
                y2={lineY2}
                stroke={isSelected ? '#4d90fe' : isFocused ? '#52c41a' : strokeColor}
                strokeWidth={isFocused ? strokeWidth + 1 : strokeWidth}
                strokeDasharray={isSelected ? '4 3' : isFocused ? '6 3' : getStrokeDasharray()}
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
            />

            {/* 选中状态且非焦点状态时显示控制点（手柄） */}
            {isSelected && !isFocused && (
                <>
                    {/* 起点控制点 */}
                    <circle
                        cx={handleX1}
                        cy={handleY1}
                        r={handleRadius}
                        fill="transparent"
                        stroke="#4d90fe"
                        strokeWidth={handleStroke}
                        strokeDasharray="2 1"
                        style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                        onMouseDown={handleStartMouseDown}
                    />
                    {/* 终点控制点 */}
                    <circle
                        cx={handleX2}
                        cy={handleY2}
                        r={handleRadius}
                        fill="transparent"
                        stroke="#4d90fe"
                        strokeWidth={handleStroke}
                        strokeDasharray="2 1"
                        style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                        onMouseDown={handleEndMouseDown}
                    />
                </>
            )}
        </svg>
    );
};

export default DraggableLine;
