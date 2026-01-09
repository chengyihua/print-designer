// CanvasArea.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Band, DesignerState, DesignerOptions, ControlObject, ControlObjectAll, DataField } from './../types/types';
import HorizontalRuler from './HorizontalRuler';
import VerticalRuler from './VerticalRuler';
import PageBoundary from './PageBoundary';
import DraggableObject from './DraggableObject';
import DraggableLine from './DraggableLine';
import ContextMenu from './ContextMenu';
import { getBandObjectsRenderData, getObjectCompleteStyle } from '../utils/renderUtils';
import { SelectionManager, SelectionBounds } from '../utils/selectionManager';
import './CanvasArea.css';

interface CanvasAreaProps {
    bands: Band[];
    state: DesignerState;
    designerOptions: DesignerOptions;
    PAGE_WIDTH: number;
    PAGE_HEIGHT: number;
    PAGE_MARGINS: { top: number; bottom: number; left: number; right: number };
    onSelectBand: (bandId: string, e?: React.MouseEvent | MouseEvent) => void;
    onSelectObject: (objectId: string, bandId: string, isMultiSelect?: boolean) => void;
    onUpdateObjectPosition: (objectId: string, x: number, y: number) => void;
    onUpdateObject: (objectId: string, bandId: string, updates: Partial<ControlObject>, skipHistory?: boolean) => void;
    onMoveMultipleObjects: (moves: Array<{ objectId: string, bandId: string, deltaX: number, deltaY: number }>, skipHistory?: boolean) => void;
    onResizeMultipleObjects?: (resizes: Array<{ objectId: string, bandId: string, deltaWidth: number, deltaHeight: number }>) => void;
    onPasteObjects?: (objects: Array<{ object: ControlObject, bandId: string }>) => void;
    onBoundaryMouseDown: (bandId: string, e: React.MouseEvent) => void;
    selectedObjectIds?: string[];
    focusedObjectId?: string | null;
    onClearSelection?: () => void;
    onMultiSelect?: (selectedKeys: string[]) => void;
    onClickPosition?: (x: number, y: number, bandId: string) => void;
    // 上下文菜单相关
    onDeleteObjects?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onCopy?: () => void;
    onPaste?: () => void;
    canPaste?: boolean;
    onUpdateObjects?: (updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }>) => void;
    dataFields?: DataField[];
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
    bands,
    state,
    designerOptions,
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_MARGINS,
    onSelectBand,
    onSelectObject,
    onUpdateObjectPosition,
    onUpdateObject,
    onMoveMultipleObjects,
    onResizeMultipleObjects,
    onPasteObjects,
    onBoundaryMouseDown,
    selectedObjectIds,
    focusedObjectId,
    onClearSelection,
    onMultiSelect,
    onClickPosition,
    // 上下文菜单相关
    onDeleteObjects,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    onCopy,
    onPaste,
    canPaste = false,
    onUpdateObjects,
    dataFields = [],
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [selectionManager] = useState(() => new SelectionManager());
    const [selectionRect, setSelectionRect] = useState<SelectionBounds | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    
    // 上下文菜单状态
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });

    // 关闭上下文菜单
    const closeContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0 });
    }, []);

    // 处理右键点击事件
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 获取点击位置
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY
        });
    }, []);

    // 记录是否刚刚完成了框选操作（用于阻止后续的 click 事件清除选择）
    const justFinishedSelectingRef = useRef<boolean>(false);

    // 使用 ref 存储框选起始坐标，避免 React state 异步更新问题
    const selectionStartRef = useRef<{ x: number; y: number } | null>(null);


    const getCanvasPositionFromEvent = (e: MouseEvent | React.MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const canvasContainer = canvasRef.current;
        const rect = canvasContainer.getBoundingClientRect();

        // 转换为相对于画布容器的坐标，并考虑缩放
        // getBoundingClientRect() 返回的是缩放后的边界，需要除以 zoomLevel 得到逻辑坐标
        const zoomLevel = state.zoomLevel || 1;
        const canvasX = (e.clientX - rect.left) / zoomLevel;
        const canvasY = (e.clientY - rect.top) / zoomLevel;

        return { x: canvasX, y: canvasY };
    };


    const handleMouseDown = (e: React.MouseEvent) => {
        // 如果点击的是边界线或其他特殊元素，不处理
        if ((e.target as HTMLElement).closest('.boundary-line')) {
            return;
        }

        // 如果点击的是对象，不处理框选（对象有自己的点击事件）
        if ((e.target as HTMLElement).closest('.design-object') ||
            (e.target as HTMLElement).closest('.react-draggable') ||
            (e.target as HTMLElement).closest('.react-rnd')) {
            return;
        }

        const { x: canvasX, y: canvasY } = getCanvasPositionFromEvent(e.nativeEvent);

        // 检查是否按下了Shift或Ctrl键
        const isShiftPressed = e.shiftKey;
        const isCtrlPressed = e.ctrlKey || e.metaKey;

        // 开始框选
        setIsSelecting(true);

        // 直接使用 canvas-container 坐标系（不减去 PAGE_MARGINS）
        // 这样框选矩形和对象都在同一坐标系中
        const contentX = canvasX;
        const contentY = canvasY;

        // 保存起始坐标到 ref（避免 React state 异步更新问题）
        selectionStartRef.current = { x: contentX, y: contentY };

        // 立即创建一个初始矩形（尺寸为0）
        const initialRect: SelectionBounds = {
            x: contentX,
            y: contentY,
            width: 0,
            height: 0
        };

        // 设置初始框选矩形
        setSelectionRect(initialRect);

        // 同时更新 SelectionManager
        if (bands && Array.isArray(bands)) {
            selectionManager.handleMouseDown(
                contentX,
                contentY,
                isShiftPressed,
                isCtrlPressed,
                bands,
                (selectedIds) => {
                    // 框选过程中选中的对象
                }
            );
        }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting || !canvasRef.current) return;
        if (!selectionStartRef.current) return;  // 使用 ref 而不是 state

        const { x: canvasX, y: canvasY } = getCanvasPositionFromEvent(e.nativeEvent);

        // 直接使用 canvas-container 坐标系
        const currentX = canvasX;
        const currentY = canvasY;

        // 使用 ref 中的起始坐标计算新的矩形尺寸
        const startX = selectionStartRef.current.x;
        const startY = selectionStartRef.current.y;

        const newRect: SelectionBounds = {
            x: startX,
            y: startY,
            width: currentX - startX,
            height: currentY - startY
        };

        // 更新框选矩形
        setSelectionRect(newRect);

        // 同时更新 SelectionManager
        if (bands && Array.isArray(bands)) {
            selectionManager.handleMouseMove(
                currentX,
                currentY,
                e.shiftKey,
                e.ctrlKey || e.metaKey,
                bands,
                PAGE_MARGINS,
                (selectedIds: string[]) => {
                    if (onMultiSelect) {
                        onMultiSelect(selectedIds);
                    }
                }
            );
        }
    };

    // 修改 handleMouseUp 函数
    const handleMouseUp = useCallback((e?: React.MouseEvent) => {
        if (!isSelecting) return;

        setIsSelecting(false);

        // 清除起始坐标 ref
        selectionStartRef.current = null;

        // 只有真正进行了框选（拖动了距离）才标记 justFinished
        // 判断框选矩形是否有实际尺寸
        const hasActualSelection = selectionRect && (Math.abs(selectionRect.width) > 3 || Math.abs(selectionRect.height) > 3);
        justFinishedSelectingRef.current = hasActualSelection || false;

        // 获取框选结果
        const selectedObjects = selectionManager.handleMouseUp(e?.shiftKey || false, e?.ctrlKey || e?.metaKey || false, undefined);

        setSelectionRect(null);

        if (selectedObjects.length > 0) {
            // 将结果转换为父组件需要的格式
            const selectedKeys = selectedObjects.map(({ object, bandId }) =>
                `${bandId}-${object.id}`
            );


            // 如果有多个对象被选中，使用新的多选回调
            if (selectedKeys.length > 0 && onMultiSelect) {
                onMultiSelect(selectedKeys);
            }
        }
        // 如果框选没有选中任何对象，不清空，保留上次选择

        setSelectionRect(null);
    }, [isSelecting, selectionRect, selectionManager, onMultiSelect]);

    // 修改 handleObjectClick 函数
    const handleObjectClick = (objectId: string, bandId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // 右键点击时，如果对象已经在多选中，保持选择状态不变
        if (e.button === 2) {
            const key = `${bandId}-${objectId}`;
            if (selectedObjectIds?.includes(key)) {
                // 对象已经被选中，不改变选择状态
                return;
            }
        }

        // 检查是否按下了Shift或Ctrl键（多选）
        const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;

        // 找到点击的对象
        const band = bands.find(b => b.id === bandId);
        const obj = band?.objects.find(o => o.id === objectId);

        if (obj && band) {
            // 激活对象所在的带区
            onSelectBand(bandId, e);

            // 记录点击位置（使用对象的位置作为参考）
            if (onClickPosition) {
                onClickPosition(obj.x, obj.y - band.top, bandId);
            }

            // 通知父组件选中对象
            onSelectObject(objectId, bandId, isMultiSelect);
        }
    };

    // 修改 handleCanvasClick 函数
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (isSelecting) return;

        // 如果刚刚完成框选操作，忽略这个 click 事件
        if (justFinishedSelectingRef.current) {
            justFinishedSelectingRef.current = false;
            return;
        }

        // 计算点击位置相对于画布的坐标
        const canvasContainer = e.currentTarget as HTMLElement;
        const rect = canvasContainer.getBoundingClientRect();
        const zoomLevel = state.zoomLevel || 1;
        const clickX = (e.clientX - rect.left) / zoomLevel;
        const clickY = (e.clientY - rect.top) / zoomLevel;

        // 计算在内容区域的位置（减去边距）
        const contentClickX = clickX - PAGE_MARGINS.left;
        const contentClickY = clickY - PAGE_MARGINS.top;

        // 如果点击的是边界线，获取对应带区并选中
        const boundaryLine = (e.target as HTMLElement).closest('.boundary-line');
        if (boundaryLine) {
            const bandId = boundaryLine.getAttribute('data-band-id');
            if (bandId) {
                onSelectBand(bandId, e);
                // 记录点击位置
                if (onClickPosition) {
                    const band = bands.find(b => b.id === bandId);
                    if (band) {
                        onClickPosition(contentClickX, contentClickY - band.top, bandId);
                    }
                }
            }
            return;
        }

        // 如果点击的是对象，不处理（对象有自己的点击事件）
        if ((e.target as HTMLElement).closest('.design-object') ||
            (e.target as HTMLElement).closest('.react-draggable') ||
            (e.target as HTMLElement).closest('.react-rnd')) {
            return;
        }

        // 如果点击在边距区域内，清空元素选择但保留带区选择
        if (contentClickX < 0 ||
            contentClickX > (PAGE_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right) ||
            contentClickY < 0 ||
            contentClickY > (PAGE_HEIGHT - PAGE_MARGINS.top - PAGE_MARGINS.bottom)) {
            // 清空元素选择，但保留带区
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                selectionManager.clearSelection();
                if (onClearSelection) {
                    onClearSelection();
                }
            }
            return;
        }

        // 查找点击位置所在的带区
        let clickedBand: Band | null = null;

        for (const band of bands) {
            const bandTop = band.top;
            const bandBottom = band.actualBottom;

            if (contentClickY >= bandTop && contentClickY <= bandBottom) {
                clickedBand = band;
                break;
            }
        }

        // 如果找到了带区，选中它并记录位置
        if (clickedBand) {
            // 如果没有按下Shift或Ctrl键，清除对象选择
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                selectionManager.clearSelection();
                if (onClearSelection) {
                    onClearSelection();
                }
            }
            // 激活带区
            onSelectBand(clickedBand.id, e);
            // 记录点击位置（相对于带区的位置）
            if (onClickPosition) {
                onClickPosition(contentClickX, contentClickY - clickedBand.top, clickedBand.id);
            }
        } else {
            // 点击在带区间隙，清空元素选择但保留带区
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                selectionManager.clearSelection();
                if (onClearSelection) {
                    onClearSelection();
                }
            }
        }
    };

    // // 在组件中添加调试样式
    // useEffect(() => {
    //     console.log('CanvasArea 状态:', {
    //         selectionRect,
    //         selectedObjects: selectionManager.getSelectedObjects(),
    //         isSelecting
    //     });
    // }, [selectionRect, isSelecting, selectionManager]);


    useEffect(() => {
        const handleGlobalMouseUp = (e: MouseEvent) => {
            if (isSelecting) {
                // console.log('全局 mouseup，结束框选');
                // 传递事件对象给 handleMouseUp
                handleMouseUp(e as unknown as React.MouseEvent);
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleMouseUp, isSelecting]);


    // 使用 ref 来存储最新的 selectedObjectIds，避免闭包问题
    const selectedObjectIdsRef = useRef<string[]>(selectedObjectIds || []);
    useEffect(() => {
        selectedObjectIdsRef.current = selectedObjectIds || [];
    }, [selectedObjectIds]);

    useEffect(() => {
        // 同步父组件的选择状态到 SelectionManager
        // 注意：在框选过程中不应该执行同步，因为这会干扰框选状态
        if (isSelecting) {
            return;
        }

        // 使用 ref 获取最新的 selectedObjectIds
        const currentSelectedIds = selectedObjectIdsRef.current;

        if (currentSelectedIds && currentSelectedIds.length > 0) {
            // 清除当前选择
            selectionManager.clearSelection();

            // 根据 selectedObjectIds 设置选择
            currentSelectedIds.forEach(key => {
                const [bandId, objectId] = key.split('-');
                const band = bands.find(b => b.id === bandId);
                const obj = band?.objects.find(o => o.id === objectId);

                if (obj && band) {
                    selectionManager.selectObject(obj, bandId, true);
                }
            });
        }
    }, [selectedObjectIds, bands, selectionManager, isSelecting]);

    const renderSelectionRect = () => {
        // 如果正在框选且有矩形数据，就显示
        if (!isSelecting || !selectionRect) {
            return null;
        }

        // 计算实际显示的矩形（确保宽度和高度为正）
        const displayRect = {
            x: selectionRect.width >= 0 ? selectionRect.x : selectionRect.x + selectionRect.width,
            y: selectionRect.height >= 0 ? selectionRect.y : selectionRect.y + selectionRect.height,
            width: Math.abs(selectionRect.width),
            height: Math.abs(selectionRect.height)
        };

        // 如果矩形太小，不显示
        if (displayRect.width < 2 || displayRect.height < 2) {
            return null;
        }

        // 框选矩形已经是 canvas-container 坐标系，直接使用
        return (
            <div
                className="selection-rect"
                style={{
                    position: 'absolute',
                    left: `${displayRect.x}px`,
                    top: `${displayRect.y}px`,
                    width: `${displayRect.width}px`,
                    height: `${displayRect.height}px`,
                    backgroundColor: 'rgba(77, 144, 254, 0.1)',
                    border: '1px solid #4d90fe',
                    pointerEvents: 'none',
                    zIndex: 2000,
                    boxShadow: '0 0 0 1px rgba(77, 144, 254, 0.3)',
                }}
            />
        );
    };


    // 渲染带区背景（激活状态高亮）
    const renderBandBackgrounds = () => {
        return bands.map((band) => {
            const height = Math.max(0, band.actualBottom - band.top);
            const isActive = state.selectedBand === band.id;
            
            return (
                <div
                    key={`band-bg-${band.id}`}
                    style={{
                        position: 'absolute',
                        top: `${band.top}px`,
                        left: 0,
                        right: 0,
                        height: `${height}px`,
                        backgroundColor: isActive ? 'rgba(24, 144, 255, 0.06)' : 'transparent',
                        borderLeft: isActive ? '3px solid #1890ff' : '3px solid transparent',
                        pointerEvents: 'none',
                        transition: 'background-color 0.15s, border-color 0.15s',
                    }}
                />
            );
        });
    };

    // 渲染带区边界线
    const renderBoundaryLines = () => {
        return bands.map((band) => {
            const height = Math.max(0, band.actualBottom - band.top);
            const isDragging = state.draggingBoundary === band.id;
            const boundaryTop = band.top + height;

            return (
                <div
                    key={`boundary-${band.id}`}
                    className={`boundary-line ${isDragging ? 'dragging' : ''}`}
                    data-band-id={band.id}
                    style={{
                        position: 'absolute',
                        top: `${boundaryTop}px`,
                        left: 0,
                        right: 0,
                        height: '20px',
                        cursor: 'ns-resize',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDragging ? '#666' : '#f3f3f3',
                        border: '1px solid #aeadad'
                    }}
                    onMouseDown={(e) => onBoundaryMouseDown(band.id, e)}
                    title={`拖动调整${band.name}高度 (当前: ${height.toFixed(1)}px)`}
                >
                    <div className="boundary-label" style={{
                        position: 'absolute',
                        top: '50%',
                        left: '0%',
                        transform: 'translate(0, -50%)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#c3c3c3',
                        whiteSpace: 'nowrap',
                        background: 'transparent',
                    }}>
                        ↑{band.name}
                    </div>
                </div>
            );
        });
    };

    // 初始化键盘和鼠标事件监听
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 获取当前激活的带区信息
            const activeBand = state.selectedBand 
                ? bands.find(b => b.id === state.selectedBand) 
                : null;
            
            selectionManager.handleKeyDown(
                e, 
                onMoveMultipleObjects, 
                onResizeMultipleObjects,
                // 粘贴回调
                (objects) => {
                    if (onPasteObjects) {
                        onPasteObjects(objects.map(info => ({
                            object: info.object,
                            bandId: info.bandId
                        })));
                    }
                },
                // 传递激活的带区信息
                activeBand ? { id: activeBand.id, top: activeBand.top, actualBottom: activeBand.actualBottom } : null
            );
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            selectionManager.handleKeyUp(e);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onMoveMultipleObjects, onResizeMultipleObjects, onPasteObjects, selectionManager, state.selectedBand, bands]);

    // 渲染对象
    const renderObjects = () => {
        return bands.flatMap(band => {
            const renderData = getBandObjectsRenderData(band, {
                isPreview: false,
                selectedObjectId: '',
                includeClipPath: true,
                dataFields,
            });

            return renderData
                .filter(({ obj }) => {
                    if (obj.type === 'image' && (obj as any).floating === true) {
                        return true;
                    }
                    if (obj.type === 'line') {
                        const lineObj = obj as any;
                        const minY = Math.min(lineObj.y1 || obj.y, lineObj.y2 || obj.y);
                        const maxY = Math.max(lineObj.y1 || obj.y, lineObj.y2 || obj.y);
                        return maxY >= band.top && minY < band.actualBottom;
                    }
                    return obj.y >= band.top && obj.y < band.actualBottom;
                })
                .map(({ obj, renderData, isSelected }) => {
                    const key = `${band.id}-${obj.id}`;
                    const isMultiSelected = selectedObjectIds?.includes(key) || false;
                    const isActuallySelected = isMultiSelected;
                    const isFocused = focusedObjectId === key;

                    if (obj.type === 'line') {
                        const lineObj = obj as any;
                        return (
                            <DraggableLine
                                key={obj.id}
                                object={{
                                    id: obj.id,
                                    type: 'line',
                                    x1: lineObj.x1 ?? obj.x,
                                    y1: lineObj.y1 ?? obj.y,
                                    x2: lineObj.x2 ?? (obj.x + obj.width),
                                    y2: lineObj.y2 ?? obj.y,
                                    color: lineObj.color,
                                    strokeWidth: lineObj.strokeWidth,
                                    lineStyle: lineObj.lineStyle,
                                    zIndex: obj.zIndex,
                                }}
                                band={band}
                                isSelected={isActuallySelected}
                                isFocused={isFocused}
                                selectedObjectIds={selectedObjectIds}
                                onSelect={(e: React.MouseEvent) => handleObjectClick(obj.id, band.id, e)}
                                onUpdate={(objectId, updates, skipHistory) => {
                                    onUpdateObject(objectId, band.id, updates, skipHistory);
                                }}
                                onDragMultiple={(deltaX, deltaY, skipHistory) => {
                                    const moves = selectedObjectIds?.map(k => {
                                        const [bandId, objectId] = k.split('-');
                                        return { objectId, bandId, deltaX, deltaY };
                                    }) || [];
                                    if (moves.length > 0) {
                                        onMoveMultipleObjects(moves, skipHistory);
                                    }
                                }}
                            />
                        );
                    }

                    const isTextElement = ['text', 'multiline_text', 'field', 'calculated', 'page_number', 'current_date'].includes(obj.type);

                    return (
                        <DraggableObject
                            key={obj.id}
                            object={obj}
                            band={band}
                            style={getObjectCompleteStyle(obj, renderData.style, isTextElement)}
                            content={renderData.content}
                            wrappedContent={renderData.wrappedContent}
                            isSelected={isActuallySelected}
                            isFocused={isFocused}
                            selectedObjectIds={selectedObjectIds}
                            onSelect={(e: React.MouseEvent) => handleObjectClick(obj.id, band.id, e)}
                            onUpdatePosition={onUpdateObjectPosition}
                            onUpdate={(objectId, updates) => {
                                onUpdateObject(objectId, band.id, updates);
                            }}
                            onDragMultiple={(deltaX, deltaY, skipHistory) => {
                                const moves = selectedObjectIds?.map(k => {
                                    const [bandId, objectId] = k.split('-');
                                    return { objectId, bandId, deltaX, deltaY };
                                }) || [];
                                if (moves.length > 0) {
                                    onMoveMultipleObjects(moves, skipHistory);
                                }
                            }}
                            minWidth={20}
                            minHeight={20}
                        />
                    );
                });
        }).filter(Boolean);
    };

    return (
        <>
            <div className="canvas-wrapper">
                <div
                    ref={canvasRef}
                    className="canvas-container"
                    style={{
                        marginTop: `${PAGE_MARGINS.top}px`,
                        marginBottom: `${PAGE_MARGINS.bottom}px`,
                        width: `${PAGE_WIDTH}px`,
                        minHeight: `${PAGE_HEIGHT}px`,
                        position: 'relative',
                        cursor: isSelecting ? 'crosshair' : 'default',
                    }}
                    onClick={handleCanvasClick} // 添加点击事件
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={handleContextMenu}
                >
                    {/* 框选矩形 */}
                    {renderSelectionRect()}

                    {/* 标尺 */}
                    {state.showRulers && (
                        <>
                            <HorizontalRuler
                                width={PAGE_WIDTH}
                                marginLeft={PAGE_MARGINS.left}
                                zoomLevel={state.zoomLevel}
                            />
                            <VerticalRuler
                                height={PAGE_HEIGHT}
                                marginTop={PAGE_MARGINS.top}
                                zoomLevel={state.zoomLevel}
                            />
                        </>
                    )}

                    {/* 纸张边界和边距 */}
                    {state.showPageMargins && (
                        <PageBoundary
                            width={PAGE_WIDTH}
                            height={PAGE_HEIGHT}
                            margins={PAGE_MARGINS}  // PAGE_MARGINS 已经是像素值，不需要再次转换
                            zoomLevel={state.zoomLevel}
                        />
                    )}

                    {/* 网格背景 */}
                    {state.showGrid && ((() => {
                        const contentWidth = PAGE_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right;
                        const contentHeight = PAGE_HEIGHT - PAGE_MARGINS.top - PAGE_MARGINS.bottom;
                        const baseGridSize = designerOptions.gridSize || 10;

                        // 计算能够平均分配的网格尺寸
                        const colCount = Math.round(contentWidth / baseGridSize);
                        const rowCount = Math.round(contentHeight / baseGridSize);
                        const actualGridWidth = contentWidth / colCount;
                        const actualGridHeight = contentHeight / rowCount;

                        return (
                            <div
                                className="grid-layer"
                                style={{
                                    position: 'absolute',
                                    top: `${PAGE_MARGINS.top}px`,
                                    left: `${PAGE_MARGINS.left}px`,
                                    width: `${contentWidth}px`,
                                    height: `${contentHeight}px`,
                                    backgroundSize: `${actualGridWidth}px ${actualGridHeight}px`,
                                    backgroundImage: `
                                        linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px),
                                        linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px)
                                    `,
                                    pointerEvents: 'none',
                                }}
                            />
                        );
                    })())}

                    {/* 页边距区域 */}
                    {state.showPageMargins && (
                        <div className="page-margins">
                            <div className="margin-top" style={{
                                position: 'absolute', top: 0, left: 0, right: 0,
                                height: `${PAGE_MARGINS.top}px`, borderBottom: '1px dashed #ddd'
                            }} />
                            <div className="margin-bottom" style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                height: `${PAGE_MARGINS.bottom}px`, borderTop: '1px dashed #ddd'
                            }} />
                            <div className="margin-left" style={{
                                position: 'absolute', top: 0, bottom: 0, left: 0,
                                width: `${PAGE_MARGINS.left}px`, borderRight: '1px dashed #ddd'
                            }} />
                            <div className="margin-right" style={{
                                position: 'absolute', top: 0, bottom: 0, right: 0,
                                width: `${PAGE_MARGINS.right}px`, borderLeft: '1px dashed #ddd'
                            }} />
                        </div>
                    )}

                    {/* 带区边界线 */}
                    <div className="boundary-layer" style={{
                        position: 'absolute',
                        top: `${PAGE_MARGINS.top}px`,
                        left: `${PAGE_MARGINS.left}px`,
                        width: `${PAGE_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right}px`,
                        height: `${PAGE_HEIGHT - PAGE_MARGINS.top - PAGE_MARGINS.bottom}px`,
                    }}>
                        {renderBandBackgrounds()}
                        {renderBoundaryLines()}
                    </div>

                    {/* 对象 */}
                    <div className="object-layer" style={{
                        position: 'absolute',
                        top: `${PAGE_MARGINS.top}px`,
                        left: `${PAGE_MARGINS.left}px`,
                        width: `${PAGE_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right}px`,
                        height: `${PAGE_HEIGHT - PAGE_MARGINS.top - PAGE_MARGINS.bottom}px`,
                    }}>
                        {renderObjects()}
                    </div>
                    {/* {renderSelectionHint()} */}
                    {/* 纸张信息 */}
                    <div className="page-info" style={{
                        position: 'absolute',
                        bottom: '5px',
                        right: '5px',
                        fontSize: '11px',
                        color: '#666',
                        background: 'rgba(255, 255, 255, 0.8)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        border: '1px solid #ddd',
                        zIndex: 100,
                    }}>
                        A4 (210mm × 297mm) - 比例: {state.zoomLevel.toFixed(2)}x
                    </div>
                </div>
            </div>

            {/* 上下文菜单 */}
            {onUpdateObjects && onDeleteObjects && onUndo && onRedo && (
                <ContextMenu
                    visible={contextMenu.visible}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    selectedObjectIds={selectedObjectIds || []}
                    bands={bands}
                    onClose={closeContextMenu}
                    onUpdateObjects={onUpdateObjects}
                    onDeleteObjects={() => {
                        onDeleteObjects();
                        closeContextMenu();
                    }}
                    onClearSelection={() => {
                        if (onClearSelection) {
                            onClearSelection();
                        }
                        closeContextMenu();
                    }}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onCopy={onCopy}
                    onPaste={onPaste}
                    canPaste={canPaste}
                    pageWidth={PAGE_WIDTH}
                    pageMargins={{ left: PAGE_MARGINS.left, right: PAGE_MARGINS.right }}
                />
            )}
        </>
    );
};

export default CanvasArea;