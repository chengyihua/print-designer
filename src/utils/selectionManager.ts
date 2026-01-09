// utils/selectionManager.ts
import { ControlObject, Band } from '../types/types';

export interface SelectionBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SelectedObjectInfo {
    object: ControlObject;
    bandId: string;
    originalX: number;
    originalY: number;
}

export class SelectionManager {
    private selectedObjects: Map<string, SelectedObjectInfo> = new Map();
    private selectionRect: SelectionBounds | null = null;
    private shiftKeyPressed: boolean = false;
    private ctrlKeyPressed: boolean = false;
    private isDraggingSelection: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;

    // 剪贴板 - 存储复制的对象
    private clipboard: SelectedObjectInfo[] = [];

    // 键盘微调相关
    private readonly MOVE_STEP = 1; // 像素移动步长
    private keyState: Record<string, boolean> = {};

    /**
     * 处理鼠标按下事件，开始框选
     */
    // 修改 handleMouseDown 方法
    handleMouseDown = (startX: number, startY: number, isShiftPressed: boolean, isCtrlPressed: boolean, bands: Band[], callback: (selectedIds: string[]) => void) => {

        // 更新修饰键状态
        this.shiftKeyPressed = isShiftPressed;
        this.ctrlKeyPressed = isCtrlPressed;

        // 清除之前的框选矩形
        this.selectionRect = null;

        // 记录拖拽起始位置
        this.dragStartX = startX;
        this.dragStartY = startY;
        this.isDraggingSelection = true;

        // 如果不是按下Shift或Ctrl键，清空当前选择
        if (!this.shiftKeyPressed && !this.ctrlKeyPressed) {
            this.selectedObjects.clear();
            if (callback) {
                callback(this.getSelectedObjectIds());
            }
        }

        // 创建框选矩形
        this.selectionRect = {
            x: this.dragStartX,
            y: this.dragStartY,
            width: 0,
            height: 0
        };
    };

    /**
     * 处理鼠标移动事件，更新框选矩形
     */
    handleMouseMove = (currentX: number, currentY: number, isShiftPressed: boolean, isCtrlPressed: boolean, bands: Band[], pageMargins: { left: number; top: number }, callback: (selectedIds: string[]) => void) => {
        if (!this.isDraggingSelection || !this.selectionRect) {
            return;
        }

        // 更新修饰键状态
        this.shiftKeyPressed = isShiftPressed;
        this.ctrlKeyPressed = isCtrlPressed;

        // 更新框选矩形尺寸
        this.selectionRect.width = currentX - this.dragStartX;
        this.selectionRect.height = currentY - this.dragStartY;

        // 计算归一化的矩形
        const normalizedRect = this.getNormalizedRect(this.selectionRect);

        // 查找在框选矩形内的对象（传递 pageMargins 以转换坐标系）
        const newlySelected = this.findObjectsInRect(normalizedRect, bands, pageMargins);

        // 记录之前的选中数量
        const previousCount = this.selectedObjects.size;

        if (this.shiftKeyPressed || this.ctrlKeyPressed) {
            // 添加模式
            newlySelected.forEach(obj => {
                const key = `${obj.bandId}-${obj.object.id}`;
                if (!this.selectedObjects.has(key)) {
                    this.selectedObjects.set(key, obj);
                }
            });
        } else {
            // 替换模式
            this.selectedObjects.clear();
            newlySelected.forEach(obj => {
                const key = `${obj.bandId}-${obj.object.id}`;
                this.selectedObjects.set(key, obj);
            });
        }

        // 只在选中对象变化时调用回调
        const currentCount = this.selectedObjects.size;
        if (previousCount !== currentCount) {
            callback(this.getSelectedObjectIds());
        }
    };

    /**
     * 处理鼠标抬起事件，结束框选
     */
    // 修改 handleMouseUp 方法
    handleMouseUp = (isShiftPressed: boolean, isCtrlPressed: boolean, callback?: (selectedIds: string[]) => void): SelectedObjectInfo[] => {

        // 更新修饰键状态
        this.shiftKeyPressed = isShiftPressed;
        this.ctrlKeyPressed = isCtrlPressed;

        this.isDraggingSelection = false;
        const selectedObjects = this.getSelectedObjects();
        this.selectionRect = null;

        if (callback) {
            const selectedIds = this.getSelectedObjectIds();
            callback(selectedIds);
        }

        return selectedObjects;
    };
    /**
     * 处理键盘按下事件
     * Shift + 方向键: 快速移动 (10px)
     * Alt/Option + 方向键: 调整宽高
     * Ctrl/Cmd + C: 复制
     * Ctrl/Cmd + V: 粘贴
     */
    handleKeyDown = (
        e: KeyboardEvent, 
        onMoveObjects: (moves: Array<{ objectId: string, bandId: string, deltaX: number, deltaY: number }>) => void,
        onResizeObjects?: (resizes: Array<{ objectId: string, bandId: string, deltaWidth: number, deltaHeight: number }>) => void,
        onPasteObjects?: (objects: SelectedObjectInfo[]) => void,
        activeBand?: { id: string; top: number; actualBottom: number } | null  // 激活的带区信息
    ) => {
        // 如果焦点在输入框中，不处理键盘事件
        const activeElement = document.activeElement;
        const tagName = activeElement?.tagName?.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || 
            (activeElement as HTMLElement)?.isContentEditable) {
            return;
        }

        this.keyState[e.key.toLowerCase()] = true;

        // 记录修饰键状态
        this.shiftKeyPressed = e.shiftKey;
        this.ctrlKeyPressed = e.ctrlKey || e.metaKey;
        const altKeyPressed = e.altKey;

        // 处理方向键
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
            e.preventDefault(); // 防止页面滚动

            // 如果没有选中对象，不处理
            if (this.selectedObjects.size === 0) return;

            const step = this.shiftKeyPressed ? 10 : this.MOVE_STEP;

            // Alt/Option + 方向键: 调整宽高
            if (altKeyPressed && onResizeObjects) {
                let deltaWidth = 0;
                let deltaHeight = 0;

                switch (e.key.toLowerCase()) {
                    case 'arrowup':
                        deltaHeight = -step;
                        break;
                    case 'arrowdown':
                        deltaHeight = step;
                        break;
                    case 'arrowleft':
                        deltaWidth = -step;
                        break;
                    case 'arrowright':
                        deltaWidth = step;
                        break;
                }

                const resizes: Array<{ objectId: string, bandId: string, deltaWidth: number, deltaHeight: number }> = [];
                this.selectedObjects.forEach((info) => {
                    resizes.push({
                        objectId: info.object.id,
                        bandId: info.bandId,
                        deltaWidth,
                        deltaHeight
                    });
                });

                onResizeObjects(resizes);
            } else {
                // 正常移动
                let deltaX = 0;
                let deltaY = 0;

                switch (e.key.toLowerCase()) {
                    case 'arrowup':
                        deltaY = -step;
                        break;
                    case 'arrowdown':
                        deltaY = step;
                        break;
                    case 'arrowleft':
                        deltaX = -step;
                        break;
                    case 'arrowright':
                        deltaX = step;
                        break;
                }

                const moves: Array<{ objectId: string, bandId: string, deltaX: number, deltaY: number }> = [];
                this.selectedObjects.forEach((info) => {
                    moves.push({
                        objectId: info.object.id,
                        bandId: info.bandId,
                        deltaX,
                        deltaY
                    });
                });

                onMoveObjects(moves);
            }
        }

        // 其他快捷键
        switch (e.key.toLowerCase()) {
            case 'escape':
                this.selectedObjects.clear();
                break;
            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault(); // 全选快捷键
                    // 这里可以添加全选逻辑
                }
                break;
            case 'c':
                // Ctrl/Cmd + C: 复制
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.copySelectedObjects();
                }
                break;
            case 'v':
                // Ctrl/Cmd + V: 粘贴
                if ((e.ctrlKey || e.metaKey) && onPasteObjects) {
                    e.preventDefault();
                    // 如果有激活的带区，粘贴到该带区
                    const objectsToPaste = activeBand 
                        ? this.getClipboardObjects(activeBand.id, { top: activeBand.top, actualBottom: activeBand.actualBottom })
                        : this.getClipboardObjects();
                    if (objectsToPaste.length > 0) {
                        onPasteObjects(objectsToPaste);
                    }
                }
                break;
            case 'delete':
            case 'backspace':
                // 删除选中对象（由外部处理）
                break;
        }
    };

    /**
     * 处理键盘抬起事件
     */
    handleKeyUp = (e: KeyboardEvent) => {
        this.keyState[e.key.toLowerCase()] = false;

        // 更新修饰键状态
        this.shiftKeyPressed = e.shiftKey;
        this.ctrlKeyPressed = e.ctrlKey || e.metaKey;
    };

    /**
     * 添加对象到选择
     */
    // 修改 selectObject 方法
    selectObject = (object: ControlObject, bandId: string, isMultiSelect: boolean = false) => {
        const key = `${bandId}-${object.id}`;

        if (isMultiSelect) {
            if (this.selectedObjects.has(key)) {
                this.selectedObjects.delete(key);
            } else {
                this.selectedObjects.set(key, {
                    object,
                    bandId,
                    originalX: object.x,
                    originalY: object.y
                });
            }
        } else {
            this.selectedObjects.clear();
            this.selectedObjects.set(key, {
                object,
                bandId,
                originalX: object.x,
                originalY: object.y
            });
        }

        const selectedIds = this.getSelectedObjectIds();
        return selectedIds;
    };

    /**
     * 获取当前框选矩形
     */
    getSelectionRect = (): SelectionBounds | null => {
        return this.selectionRect;
    };

    /**
     * 获取选中的对象ID列表
     */
    getSelectedObjectIds = (): string[] => {
        return Array.from(this.selectedObjects.keys());
    };

    /**
     * 获取选中的对象详细信息
     */
    getSelectedObjects = (): SelectedObjectInfo[] => {
        return Array.from(this.selectedObjects.values());
    };

    /**
     * 清除所有选择
     */
    clearSelection = () => {
        this.selectedObjects.clear();
        this.selectionRect = null;
    };

    /**
     * 检查对象是否被选中
     */
    isObjectSelected = (objectId: string, bandId: string): boolean => {
        return this.selectedObjects.has(`${bandId}-${objectId}`);
    };

    /**
     * 获取选中对象的边界框
     */
    getSelectionBounds = (): SelectionBounds | null => {
        if (this.selectedObjects.size === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.selectedObjects.forEach(info => {
            const obj = info.object;
            minX = Math.min(minX, obj.x);
            minY = Math.min(minY, obj.y);
            maxX = Math.max(maxX, obj.x + obj.width);
            maxY = Math.max(maxY, obj.y + obj.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    };

    /**
     * 复制选中的对象到剪贴板
     */
    copySelectedObjects = () => {
        this.clipboard = Array.from(this.selectedObjects.values()).map(info => ({
            ...info,
            object: { ...info.object }  // 深拷贝对象
        }));
        console.log(`已复制 ${this.clipboard.length} 个对象`);
    };

    /**
     * 获取剪贴板中的对象（位置向右下偏移5像素）
     * @param targetBandId 目标带区ID，如果提供则粘贴到该带区
     * @param targetBand 目标带区信息，用于调整Y坐标
     */
    getClipboardObjects = (targetBandId?: string, targetBand?: { top: number; actualBottom: number }): SelectedObjectInfo[] => {
        if (this.clipboard.length === 0) return [];
        
        // 返回剪贴板对象的副本，位置偏移5像素
        return this.clipboard.map(info => {
            const originalBandId = info.bandId;
            const newBandId = targetBandId || originalBandId;
            
            // 计算Y坐标偏移
            let yOffset = 5;  // 默认偏移5像素
            
            // 如果粘贴到不同的带区，需要调整Y坐标到目标带区范围内
            if (targetBandId && targetBand) {
                // 将对象放置在目标带区顶部偏移5像素的位置
                yOffset = targetBand.top + 5 - info.object.y;
            }
            
            const newObject = {
                ...info.object,
                x: info.object.x + 5,
                y: info.object.y + yOffset
            };
            
            // 线条类型还需要偏移 x1, y1, x2, y2
            if (info.object.type === 'line') {
                const lineObj = info.object as any;
                (newObject as any).x1 = (lineObj.x1 ?? info.object.x) + 5;
                (newObject as any).y1 = (lineObj.y1 ?? info.object.y) + yOffset;
                (newObject as any).x2 = (lineObj.x2 ?? info.object.x + info.object.width) + 5;
                (newObject as any).y2 = (lineObj.y2 ?? info.object.y) + yOffset;
            }
            
            return {
                ...info,
                bandId: newBandId,
                object: newObject,
                originalX: info.object.x + 5,
                originalY: info.object.y + yOffset
            };
        });
    };

    /**
     * 检查剪贴板是否有内容
     */
    hasClipboardContent = (): boolean => {
        return this.clipboard.length > 0;
    };

    // 私有方法
    private getNormalizedRect(rect: SelectionBounds): SelectionBounds {
        const x = Math.min(rect.x, rect.x + rect.width);
        const y = Math.min(rect.y, rect.y + rect.height);
        const width = Math.abs(rect.width);
        const height = Math.abs(rect.height);

        return { x, y, width, height };
    }

    // SelectionManager.ts

    // 修改方法：使用 canvas-container 坐标系检测
    private findObjectsInRect(rect: SelectionBounds, bands: Band[], pageMargins?: { left: number; top: number }): SelectedObjectInfo[] {
        const result: SelectedObjectInfo[] = [];
        
        // 检查 bands 是否有效
        if (!bands || !Array.isArray(bands)) {
            console.log('bands 无效，无法进行框选检测');
            return result;
        }

        // 获取页边距（用于将对象坐标转换为 canvas-container 坐标系）
        const marginLeft = pageMargins?.left || 0;
        const marginTop = pageMargins?.top || 0;

        // 使用 canvas-container 坐标系检测
        const normalizedRect = this.getNormalizedRect(rect);
        const rectLeft = normalizedRect.x;
        const rectTop = normalizedRect.y;
        const rectRight = rectLeft + normalizedRect.width;
        const rectBottom = rectTop + normalizedRect.height;

        // 遍历所有带区和对象
        for (const band of bands) {
            for (const obj of band.objects) {
                let objectLeft: number;
                let objectTop: number;
                let objectRight: number;
                let objectBottom: number;
                
                // 线条类型使用 x1, y1, x2, y2 计算边界
                if (obj.type === 'line') {
                    const lineObj = obj as any;
                    const x1 = lineObj.x1 ?? obj.x;
                    const y1 = lineObj.y1 ?? obj.y;
                    const x2 = lineObj.x2 ?? obj.x + obj.width;
                    const y2 = lineObj.y2 ?? obj.y;
                    
                    objectLeft = marginLeft + Math.min(x1, x2);
                    objectTop = marginTop + Math.min(y1, y2);
                    objectRight = marginLeft + Math.max(x1, x2);
                    objectBottom = marginTop + Math.max(y1, y2);
                    
                    // 线条需要较大的命中区域，特别是横线和竖线
                    const strokeWidth = lineObj.strokeWidth || 2;
                    const hitArea = Math.max(strokeWidth * 3, 12);  // 基础命中区域
                    
                    // 横线和竖线需要更大的命中区域
                    const isHorizontal = Math.abs(y2 - y1) < 2;  // 横线
                    const isVertical = Math.abs(x2 - x1) < 2;    // 竖线
                    
                    if (isHorizontal) {
                        // 横线：垂直方向需要更大的命中区域
                        objectTop -= hitArea;
                        objectBottom += hitArea;
                        objectLeft -= hitArea / 2;
                        objectRight += hitArea / 2;
                    } else if (isVertical) {
                        // 竖线：水平方向需要更大的命中区域
                        objectLeft -= hitArea;
                        objectRight += hitArea;
                        objectTop -= hitArea / 2;
                        objectBottom += hitArea / 2;
                    } else {
                        // 斜线：各方向适度扩展
                        objectLeft -= hitArea;
                        objectTop -= hitArea;
                        objectRight += hitArea;
                        objectBottom += hitArea;
                    }
                } else {
                    // 普通对象使用 x, y, width, height
                    const extraSize = 6; // DraggableObject 的额外 padding/border
                    objectLeft = marginLeft + obj.x;
                    objectTop = marginTop + obj.y;
                    objectRight = marginLeft + obj.x + obj.width + extraSize;
                    objectBottom = marginTop + obj.y + obj.height + extraSize;
                }

                // 检查是否有重叠
                const hasOverlap = !(
                    objectRight < rectLeft ||
                    objectLeft > rectRight ||
                    objectBottom < rectTop ||
                    objectTop > rectBottom
                );

                if (hasOverlap) {
                    result.push({
                        object: obj,
                        bandId: band.id,
                        originalX: obj.x,
                        originalY: obj.y
                    });
                }
            }
        }

        // console.log(`逻辑坐标检测结果: ${result.length} 个对象`);
        return result;
    }
}