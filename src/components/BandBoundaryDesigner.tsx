// BandBoundaryDesigner.tsx
import React, { useRef, useCallback, useState, useEffect } from 'react';
import './BandBoundaryDesigner.css';
import { Band, BandBoundaryDesignerProps, ControlObject, DataField } from './../types/types';
import { useBandDesigner } from '../hooks/useBandDesigner';
import { controlTypes } from '../types/constants';
import CanvasArea from './CanvasArea';
import BandPropertyPanel from './BandPropertyPanel';
import ObjectPropertyPanel from './ObjectPropertyPanel';
import MultiSelectToolbar from './MultiSelectToolbar';
import FormulaEditor from './FormulaEditor';
import unitConverter from '../utils/unitConverter';
import PrintPreview from './PrintPreview';

const BandBoundaryDesigner: React.FC<BandBoundaryDesignerProps> = ({
    options = {},
    initialDesign,
    onDesignChange,
    onSave,
    data,
    dataFields
}) => {
    const {
        bands,
        setBands,
        state,
        updateState,
        designerOptions,
        selectBand,
        updateObjectPosition,
        deleteSelectedObject,
        handleSave,
        updateBands,
        A4_WIDTH,
        A4_HEIGHT,
        PAGE_MARGINS,
        // 撤销/恢复
        undo,
        redo,
        canUndo,
        canRedo,
    } = useBandDesigner({
        options,
        initialDesign,
        onDesignChange,
    });

    const draggingRef = useRef<{
        bandIndex: number;
        startY: number;
        originalBands: Band[]
    } | null>(null);

    // 添加预览状态
    const [showPreview, setShowPreview] = useState(false);
    // 添加多选状态
    const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
    // 焦点状态（只显示虚线框，不显示调整手柄）
    const [focusedObjectId, setFocusedObjectId] = useState<string | null>(null);
    // 记录最后点击的位置（用于添加新控件）
    const [lastClickPosition, setLastClickPosition] = useState<{ x: number; y: number } | null>(null);
    // 添加计算字段时的公式编辑器状态
    const [showAddCalculatedEditor, setShowAddCalculatedEditor] = useState(false);
    // 待添加的计算字段基础信息
    const [pendingCalculatedControl, setPendingCalculatedControl] = useState<any>(null);

    // 关闭预览
    const handleClosePreview = useCallback(() => {
        setShowPreview(false);
    }, []);

    // 处理点击位置（记录最后点击的位置，用于添加新控件）
    const handleClickPosition = useCallback((x: number, y: number, bandId: string) => {
        setLastClickPosition({ x, y });
    }, []);

    // 键盘快捷键支持
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 撤销: Ctrl+Z (Windows) / Cmd+Z (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) undo();
            }
            // 恢复: Ctrl+Shift+Z / Ctrl+Y (Windows) / Cmd+Shift+Z (Mac)
            if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
                e.preventDefault();
                if (canRedo) redo();
            }
            // 删除: Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // 避免在输入框中触发删除
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

                if (selectedObjectIds.length > 0) {
                    e.preventDefault();
                    // 直接删除，不弹确认框
                    const deleteMap = new Map<string, Set<string>>();
                    selectedObjectIds.forEach(key => {
                        const [bandId, objectId] = key.split('-');
                        if (!deleteMap.has(bandId)) {
                            deleteMap.set(bandId, new Set());
                        }
                        deleteMap.get(bandId)!.add(objectId);
                    });

                    setBands(prevBands => prevBands.map(band => {
                        const objectsToDelete = deleteMap.get(band.id);
                        if (!objectsToDelete) return band;
                        return {
                            ...band,
                            objects: band.objects.filter(
                                (obj: ControlObject) => !objectsToDelete.has(obj.id)
                            )
                        };
                    }));

                    // 清除选择
                    setSelectedObjectIds([]);
                    updateState({ selectedObject: null, selectedBand: null });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo, selectedObjectIds, setBands, updateState]);

    const handleBoundaryMouseDown = useCallback((bandId: string, e: React.MouseEvent) => {
        e.preventDefault();

        const bandIndex = bands.findIndex(b => b.id === bandId);
        if (bandIndex === -1) return;

        const originalBands = JSON.parse(JSON.stringify(bands));
        draggingRef.current = {
            bandIndex,
            startY: e.clientY,
            originalBands
        };

        updateState({ draggingBoundary: bandId });

        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingRef.current) return;

            const { bandIndex, startY, originalBands } = draggingRef.current;
            const delta = e.clientY - startY;
            if (Math.abs(delta) < 0.5) return;

            setBands(prev => {
                const originalBand = originalBands[bandIndex];
                const originalBottom = originalBand.actualBottom;
                let newBottom = originalBottom + delta;

                const minHeight = 0;
                newBottom = Math.max(originalBand.top + minHeight, newBottom);

                if (bandIndex > 0) {
                    const prevBand = prev[bandIndex - 1];
                    const minDistance = designerOptions.bandSpacing;
                    newBottom = Math.max(newBottom, prevBand.actualBottom + minDistance);
                }

                const heightChange = newBottom - originalBottom;

                // 使用 map 确保每个修改的 band 都是新的引用
                const newBands = prev.map((band, i) => {
                    if (i === bandIndex) {
                        // 当前拖动的带区
                        return {
                            ...band,
                            actualBottom: newBottom,
                            bottom: newBottom
                        };
                    } else if (i > bandIndex) {
                        // 后续带区需要移动
                        const originalBandToMove = originalBands[i];
                        const newTop = originalBandToMove.top + heightChange;
                        const newActualBottom = originalBandToMove.actualBottom + heightChange;

                        return {
                            ...band,
                            top: newTop,
                            actualBottom: newActualBottom,
                            bottom: newActualBottom,
                            objects: band.objects.map((obj: ControlObject, objIndex: number) => {
                                const originalObj = originalBandToMove.objects[objIndex];
                                if (originalObj) {
                                    // 线条类型需要同时更新 y1, y2
                                    if (obj.type === 'line') {
                                        const origLineObj = originalObj as any;
                                        return {
                                            ...obj,
                                            y: originalObj.y + heightChange,
                                            y1: (origLineObj.y1 ?? originalObj.y) + heightChange,
                                            y2: (origLineObj.y2 ?? originalObj.y) + heightChange,
                                        };
                                    }
                                    return {
                                        ...obj,
                                        y: originalObj.y + heightChange
                                    };
                                }
                                return obj;
                            })
                        };
                    }
                    return band;
                });

                draggingRef.current = {
                    bandIndex,
                    startY: e.clientY,
                    originalBands: JSON.parse(JSON.stringify(newBands))
                };

                return newBands;
            });
        };

        const handleMouseUp = () => {
            draggingRef.current = null;
            updateState({ draggingBoundary: null });
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [bands, designerOptions.bandSpacing, setBands, updateState]);

    // 处理多对象移动
    const handleMoveMultipleObjects = useCallback((moves: Array<{ objectId: string, bandId: string, deltaX: number, deltaY: number }>) => {
        setBands(prevBands => {
            // 使用 map 确保修改的 band 也是新的引用，React 才能正确检测变化
            return prevBands.map(band => {
                const movesForBand = moves.filter(m => m.bandId === band.id);
                if (movesForBand.length === 0) return band;

                return {
                    ...band,
                    objects: band.objects.map(obj => {
                        const move = movesForBand.find(m => m.objectId === obj.id);
                        if (!move) return obj;

                        // 线条类型需要更新 x1, y1, x2, y2
                        if (obj.type === 'line') {
                            const lineObj = obj as any;
                            return {
                                ...obj,
                                x: obj.x + move.deltaX,
                                y: obj.y + move.deltaY,
                                x1: (lineObj.x1 ?? obj.x) + move.deltaX,
                                y1: (lineObj.y1 ?? obj.y) + move.deltaY,
                                x2: (lineObj.x2 ?? obj.x + obj.width) + move.deltaX,
                                y2: (lineObj.y2 ?? obj.y) + move.deltaY,
                            };
                        }

                        return {
                            ...obj,
                            x: obj.x + move.deltaX,
                            y: obj.y + move.deltaY
                        };
                    })
                };
            });
        });
    }, [setBands]);

    // 处理多对象尺寸调整 (Ctrl + 方向键)
    const handleResizeMultipleObjects = useCallback((resizes: Array<{ objectId: string, bandId: string, deltaWidth: number, deltaHeight: number }>) => {
        setBands(prevBands => {
            return prevBands.map(band => {
                const resizesForBand = resizes.filter(r => r.bandId === band.id);
                if (resizesForBand.length === 0) return band;

                return {
                    ...band,
                    objects: band.objects.map(obj => {
                        const resize = resizesForBand.find(r => r.objectId === obj.id);
                        if (!resize) return obj;

                        // 线条类型调整终点位置
                        if (obj.type === 'line') {
                            const lineObj = obj as any;
                            return {
                                ...obj,
                                x2: (lineObj.x2 ?? obj.x + obj.width) + resize.deltaWidth,
                                y2: (lineObj.y2 ?? obj.y) + resize.deltaHeight,
                            };
                        }

                        return {
                            ...obj,
                            width: Math.max(20, obj.width + resize.deltaWidth),   // 最小宽度 20
                            height: Math.max(20, obj.height + resize.deltaHeight) // 最小高度 20
                        };
                    })
                };
            });
        });
    }, [setBands]);

    // 处理粘贴对象 (Ctrl + V)
    const handlePasteObjects = useCallback((objects: Array<{ object: ControlObject, bandId: string }>) => {
        if (objects.length === 0) return;

        // 生成新ID的函数
        const generateNewId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 按带区分组
        const objectsByBand = new Map<string, ControlObject[]>();
        objects.forEach(({ object, bandId }) => {
            if (!objectsByBand.has(bandId)) {
                objectsByBand.set(bandId, []);
            }
            // 创建新对象，生成新ID
            objectsByBand.get(bandId)!.push({
                ...object,
                id: generateNewId()
            });
        });

        // 添加到对应带区
        setBands(prevBands => prevBands.map(band => {
            const newObjects = objectsByBand.get(band.id);
            if (!newObjects) return band;
            return {
                ...band,
                objects: [...band.objects, ...newObjects]
            };
        }));

        // 选中新粘贴的对象
        const newSelectedIds: string[] = [];
        objectsByBand.forEach((objs, bandId) => {
            objs.forEach(obj => {
                newSelectedIds.push(`${bandId}-${obj.id}`);
            });
        });
        setSelectedObjectIds(newSelectedIds);

        console.log(`已粘贴 ${objects.length} 个对象`);
    }, [setBands]);

    // 处理对象选择（支持多选）
    const handleSelectObject = useCallback((
        objectId: string,
        bandId: string,
        isMultiSelect: boolean = false
    ) => {
        // console.log('handleSelectObject called:', { objectId, bandId, isMultiSelect });

        // 构建对象的唯一键
        const key = `${bandId}-${objectId}`;
        const isAlreadySelected = selectedObjectIds.includes(key);

        if (isMultiSelect) {
            // 多选模式：切换选择状态
            const newSelectedIds = isAlreadySelected
                ? selectedObjectIds.filter(id => id !== key)
                : [...selectedObjectIds, key];

            // console.log('Multi-select new IDs:', newSelectedIds);
            setSelectedObjectIds(newSelectedIds);

            // 根据选择数量更新状态
            if (newSelectedIds.length === 0) {
                updateState({
                    selectedObject: null,
                    selectedBand: null
                });
            } else if (newSelectedIds.length === 1) {
                const [selectedKey] = newSelectedIds;
                const [selectedBandId, selectedObjId] = selectedKey.split('-');
                updateState({
                    selectedObject: selectedObjId,
                    selectedBand: selectedBandId
                });
            } else {
                // 多选时不清空单个选择状态，但显示最后一个选中的
                const lastKey = newSelectedIds[newSelectedIds.length - 1];
                const [lastBandId, lastObjId] = lastKey.split('-');
                updateState({
                    selectedObject: lastObjId,
                    selectedBand: lastBandId
                });
            }
        } else {
            // 单选模式
            // 如果当前是多选状态，且点击的是已选中的元素，则取消该元素的选中
            console.log('单选模式:', { selectedCount: selectedObjectIds.length, isAlreadySelected, key });
            if (selectedObjectIds.length > 1 && isAlreadySelected) {
                console.log('取消选中:', key);
                const newSelectedIds = selectedObjectIds.filter(id => id !== key);
                setSelectedObjectIds(newSelectedIds);

                // 更新状态到最后一个选中的元素
                if (newSelectedIds.length === 1) {
                    const [lastKey] = newSelectedIds;
                    const [lastBandId, lastObjId] = lastKey.split('-');
                    updateState({
                        selectedObject: lastObjId,
                        selectedBand: lastBandId
                    });
                } else if (newSelectedIds.length > 1) {
                    const lastKey = newSelectedIds[newSelectedIds.length - 1];
                    const [lastBandId, lastObjId] = lastKey.split('-');
                    updateState({
                        selectedObject: lastObjId,
                        selectedBand: lastBandId
                    });
                }
            } else {
                // 正常单选：只选择这一个
                // console.log('Single select setting ID:', key);
                setSelectedObjectIds([key]);
                updateState({
                    selectedObject: objectId,
                    selectedBand: bandId
                });
            }
        }
    }, [selectedObjectIds, updateState]);

    // 修改 handleMultiSelect 函数
    const handleMultiSelect = useCallback((selectedKeys: string[]) => {
        // console.log('handleMultiSelect called with keys:', selectedKeys);

        if (selectedKeys.length === 0) {
            setSelectedObjectIds([]);
            updateState({
                selectedObject: null,
                selectedBand: null
            });
            return;
        }

        setSelectedObjectIds(selectedKeys);

        if (selectedKeys.length === 1) {
            const [key] = selectedKeys;
            const [bandId, objectId] = key.split('-');
            updateState({
                selectedObject: objectId,
                selectedBand: bandId
            });
        } else {
            // 多选时显示第一个选中的
            const [firstKey] = selectedKeys;
            const [bandId, objectId] = firstKey.split('-');
            updateState({
                selectedObject: objectId,
                selectedBand: bandId
            });
        }
    }, [updateState]);

    // 修改 clearSelection 函数 - 清空所有选择（包括带区）
    const clearSelection = useCallback(() => {
        // console.log('Clearing selection');
        setSelectedObjectIds([]);
        setFocusedObjectId(null); // 清空焦点状态
        updateState({
            selectedObject: null,
            selectedBand: null
        });
    }, [updateState]);

    // 只清空对象选择，保留带区选择
    const clearObjectSelection = useCallback(() => {
        setSelectedObjectIds([]);
        setFocusedObjectId(null); // 清空焦点状态
        updateState({
            selectedObject: null
            // 不清空 selectedBand
        });
    }, [updateState]);

    // 批量更新对象（供 MultiSelectToolbar 使用）
    const handleUpdateObjects = useCallback((
        updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObject> }>
    ) => {
        setBands(prevBands => {
            const newBands = prevBands.map(band => {
                const updatesForBand = updates.filter(u => u.bandId === band.id);
                if (updatesForBand.length === 0) return band;

                return {
                    ...band,
                    objects: band.objects.map((obj: ControlObject) => {
                        const update = updatesForBand.find(u => u.objectId === obj.id);
                        if (!update) return obj;
                        return {
                            ...obj,
                            ...update.changes
                        };
                    })
                };
            });
            return newBands;
        });
    }, [setBands]);

    const handleInternalSave = useCallback(() => {
        const designData = handleSave();
        if (onSave) {
            onSave(designData);
        } else {
            localStorage.setItem('bandDesignerData', JSON.stringify(designData));
            alert('设计已保存到本地存储');
        }
    }, [handleSave, onSave]);

    const handleDeleteObject = () => {
        // 删除所有选中的对象
        if (selectedObjectIds.length > 0) {
            if (window.confirm(`确定要删除选中的 ${selectedObjectIds.length} 个对象吗？`)) {
                // 将 selectedObjectIds 转换为 bandId -> objectIds 的映射
                const deleteMap = new Map<string, Set<string>>();
                selectedObjectIds.forEach(key => {
                    const [bandId, objectId] = key.split('-');
                    if (!deleteMap.has(bandId)) {
                        deleteMap.set(bandId, new Set());
                    }
                    deleteMap.get(bandId)!.add(objectId);
                });

                setBands(prevBands => prevBands.map(band => {
                    const objectsToDelete = deleteMap.get(band.id);
                    if (!objectsToDelete) return band;
                    return {
                        ...band,
                        objects: band.objects.filter(
                            (obj: ControlObject) => !objectsToDelete.has(obj.id)
                        )
                    };
                }));

                // 清除选择
                clearSelection();
            }
        } else {
            // 如果没有多选，使用原有的删除单个对象逻辑
            deleteSelectedObject();
        }
    };

    const handleAddControl = useCallback((type: string, fieldName?: string) => {
        const selectedBandId = state.selectedBand;
        if (!selectedBandId) {
            alert('请先选择一个带区');
            return;
        }

        const bandIndex = bands.findIndex(b => b.id === selectedBandId);
        if (bandIndex === -1) return;

        const band = bands[bandIndex];
        const controlType = controlTypes.find(ct => ct.id === type);

        if (!controlType) return;

        // 使用最后点击的位置，如果没有则使用默认位置
        const posX = lastClickPosition?.x ?? 20;
        const posY = (lastClickPosition?.y ?? 10) + band.top;

        // 计算当前带区最大zIndex，新控件置于最上层
        const maxZIndex = band.objects.reduce((max, obj) => {
            const z = obj.zIndex ?? 1;
            return z > max ? z : max;
        }, 0);
        const newZIndex = maxZIndex + 1;

        const newControl = {
            id: `${type}_${Date.now()}`,
            type: type as any,
            x: posX,
            y: posY,
            width: controlType.defaultWidth,
            height: controlType.defaultHeight,
            zIndex: newZIndex,
        };

        if (type === 'text') {
            Object.assign(newControl, {
                text: '文本',
                fontSize: 14,
                color: '#000000',
                textAlign: 'left',
            });
        } else if (type === 'field') {
            Object.assign(newControl, {
                fieldName: fieldName || 'field',
                color: '#000000',
                background: 'transparent',
            });
        } else if (type === 'calculated') {
            // 计算字段：先保存基础信息，弹出公式编辑器
            Object.assign(newControl, {
                formula: '',
                text: '[计算]',
                color: '#000000',
                background: 'transparent',
                formatType: 'number',
                decimalPlaces: 2,
            });
            // 保存待添加的控件信息，弹出公式编辑器
            setPendingCalculatedControl({ ...newControl, bandId: selectedBandId });
            setShowAddCalculatedEditor(true);
            return; // 不立即添加，等待公式确认后再添加
        } else if (type === 'page_number') {
            Object.assign(newControl, {
                text: '第1页/共1页',
                fontSize: 12,
                color: '#000000',
                textAlign: 'center',
            });
        } else if (type === 'current_date') {
            Object.assign(newControl, {
                text: new Date().toLocaleDateString(),
                fontSize: 12,
                color: '#000000',
                textAlign: 'right',
            });
        } else if (type === 'line') {
            Object.assign(newControl, {
                x1: posX,
                y1: posY,
                x2: posX + controlType.defaultWidth,
                y2: posY,
                strokeWidth: 1,
                color: '#000000',
                lineStyle: 'solid',
            });
            console.log('添加线条:', {
                bandId: selectedBandId,
                bandTop: band.top,
                bandBottom: band.actualBottom,
                posX, posY,
                x1: posX, y1: posY,
                x2: posX + controlType.defaultWidth, y2: posY,
                lastClickPosition,
            });
        } else if (type === 'rectangle') {
            Object.assign(newControl, {
                background: 'transparent',
            });
        }

        // 使用 map 确保修改的 band 也是新的引用
        setBands(prevBands => prevBands.map(band => {
            if (band.id !== selectedBandId) return band;
            return {
                ...band,
                objects: [...band.objects, newControl]
            };
        }));

        // 自动选中新创建的对象
        handleSelectObject(newControl.id, selectedBandId);
    }, [bands, state.selectedBand, lastClickPosition, setBands, handleSelectObject]);


    // 批量添加数据字段（从工具条添加）
    const handleAddFields = useCallback((fields: DataField[], arrangement: 'horizontal' | 'vertical') => {
        const selectedBandId = state.selectedBand;
        if (!selectedBandId) {
            alert('请先选择一个带区');
            return;
        }

        const bandIndex = bands.findIndex(b => b.id === selectedBandId);
        if (bandIndex === -1) return;

        const band = bands[bandIndex];

        // 使用最后点击的位置作为起始位置
        const startX = lastClickPosition?.x ?? 20;
        const startY = (lastClickPosition?.y ?? 10) + band.top;

        // 计算当前带区最大zIndex
        const maxZIndex = band.objects.reduce((max, obj) => {
            const z = obj.zIndex ?? 1;
            return z > max ? z : max;
        }, 0);

        // 默认字段尺寸
        const fieldWidth = 120;
        const fieldHeight = 25;
        const gap = 8; // 字段之间的间距

        const newControls: ControlObject[] = fields.map((field, index) => {
            let posX: number;
            let posY: number;

            if (arrangement === 'horizontal') {
                posX = startX + index * (fieldWidth + gap);
                posY = startY;
            } else {
                posX = startX;
                posY = startY + index * (fieldHeight + gap);
            }

            return {
                id: `field_${Date.now()}_${index}`,
                type: 'field' as const,
                fieldName: field.name,
                x: posX,
                y: posY,
                width: fieldWidth,
                height: fieldHeight,
                zIndex: maxZIndex + 1 + index,
                color: '#000000',
                background: 'transparent',
            };
        });

        // 添加到带区
        setBands(prevBands => prevBands.map(b => {
            if (b.id !== selectedBandId) return b;
            return {
                ...b,
                objects: [...b.objects, ...newControls]
            };
        }));

        // 选中新添加的字段
        const newSelectedIds = newControls.map(ctrl => `${selectedBandId}-${ctrl.id}`);
        setSelectedObjectIds(newSelectedIds);

        console.log(`已添加 ${fields.length} 个数据字段`);
    }, [bands, state.selectedBand, lastClickPosition, setBands]);

    // 确认添加计算字段（公式校验通过后）
    const handleConfirmAddCalculated = useCallback((formula: string) => {
        if (!pendingCalculatedControl) return;

        const { bandId, ...controlProps } = pendingCalculatedControl;
        const newControl = {
            ...controlProps,
            formula,
        };

        // 添加到带区
        setBands(prevBands => prevBands.map(band => {
            if (band.id !== bandId) return band;
            return {
                ...band,
                objects: [...band.objects, newControl]
            };
        }));

        // 自动选中新创建的对象
        handleSelectObject(newControl.id, bandId);

        // 清理状态
        setShowAddCalculatedEditor(false);
        setPendingCalculatedControl(null);
    }, [pendingCalculatedControl, setBands, handleSelectObject]);

    // 取消添加计算字段
    const handleCancelAddCalculated = useCallback(() => {
        setShowAddCalculatedEditor(false);
        setPendingCalculatedControl(null);
    }, []);

    const toggleRulers = () => {
        updateState({ showRulers: !state.showRulers });
    };

    const togglePageMargins = () => {
        updateState({ showPageMargins: !state.showPageMargins });
    };


    const selectedBand = state.selectedBand ? bands.find(b => b.id === state.selectedBand) : null;
    const selectedObject = state.selectedObject && selectedBand
        ? selectedBand.objects.find((obj: ControlObject) => obj.id === state.selectedObject)
        : null;

    // 处理预览
    const handlePreview = useCallback(() => {
        // console.log('=== 预览开始 ===');
        // console.log('当前bands状态:', bands);

        // 打印明细带区的详细信息
        // const detailBand = bands.find(b => b.id === 'detail');
        // if (detailBand) {
        //     console.log('明细带区:', {
        //         id: detailBand.id,
        //         top: detailBand.top,
        //         bottom: detailBand.bottom,
        //         actualBottom: detailBand.actualBottom,
        //         height: detailBand.actualBottom - detailBand.top,
        //         objectsCount: detailBand.objects.length,
        //         objects: detailBand.objects.map((obj: ControlObject) => ({
        //             id: obj.id,
        //             type: obj.type,
        //             x: obj.x,
        //             y: obj.y,
        //             width: obj.width,
        //             height: obj.height,
        //             fieldName: obj.fieldName
        //         }))
        //     });
        // }

        setShowPreview(true);
    }, []);

    // 键盘快捷键: Ctrl+S 保存, Ctrl+P 打印预览
    // 使用 useRef 存储回调函数引用，避免依赖数组大小变化
    const handleInternalSaveRef = useRef(handleInternalSave);
    const handlePreviewRef = useRef(handlePreview);
    handleInternalSaveRef.current = handleInternalSave;
    handlePreviewRef.current = handlePreview;

    useEffect(() => {
        const handleSavePreviewKeyDown = (e: KeyboardEvent) => {
            // 避免在输入框中触发
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            // 保存: Ctrl+S (Windows) / Cmd+S (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleInternalSaveRef.current();
            }
            // 打印预览: Ctrl+P (Windows) / Cmd+P (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                handlePreviewRef.current();
            }
        };

        window.addEventListener('keydown', handleSavePreviewKeyDown);
        return () => window.removeEventListener('keydown', handleSavePreviewKeyDown);
    }, []);

    return (
        <div className="react-band-designer">
            {/* 多选工具条 - 宽度100% */}
            <MultiSelectToolbar
                selectedObjectIds={selectedObjectIds}
                bands={bands}
                onUpdateObjects={handleUpdateObjects}
                onClearSelection={clearSelection}
                onDeleteObjects={handleDeleteObject}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onSave={handleInternalSave}
                onPreview={handlePreview}
                showGrid={state.showGrid}
                showRulers={state.showRulers}
                showPageMargins={state.showPageMargins}
                onToggleGrid={() => updateState({ showGrid: !state.showGrid })}
                onToggleRulers={toggleRulers}
                onTogglePageMargins={togglePageMargins}
                onAddControl={handleAddControl}
                onAddFields={handleAddFields}
                selectedBandId={state.selectedBand}
                dataFields={dataFields || []}
            />

            <div className="workspace">
                <div className="design-area">
                    <CanvasArea
                        bands={bands}
                        state={state}
                        designerOptions={designerOptions}
                        A4_WIDTH={unitConverter.toPx(A4_WIDTH)}
                        A4_HEIGHT={unitConverter.toPx(A4_HEIGHT)}
                        PAGE_MARGINS={unitConverter.convertMargins(PAGE_MARGINS)}
                        onSelectBand={(bandId, e) => {
                            selectBand(bandId);
                            // 切换带区时，如果没按住 Shift/Ctrl，清除对象选择
                            if (!e?.shiftKey && !e?.ctrlKey && !e?.metaKey) {
                                setSelectedObjectIds([]);
                            }
                        }}
                        onSelectObject={handleSelectObject}
                        onMultiSelect={handleMultiSelect} // 新增
                        onUpdateObjectPosition={updateObjectPosition}
                        onUpdateObject={(objectId, bandId, updates, skipHistory) => {
                            // 使用 map 确保修改的 band 也是新的引用
                            setBands(prevBands => prevBands.map(band => {
                                if (band.id !== bandId) return band;
                                return {
                                    ...band,
                                    objects: band.objects.map((o: ControlObject) =>
                                        o.id === objectId ? { ...o, ...updates } : o
                                    )
                                };
                            }), skipHistory);
                        }}
                        onBoundaryMouseDown={handleBoundaryMouseDown}
                        onMoveMultipleObjects={handleMoveMultipleObjects}
                        onResizeMultipleObjects={handleResizeMultipleObjects}
                        onPasteObjects={handlePasteObjects}
                        selectedObjectIds={selectedObjectIds}
                        focusedObjectId={focusedObjectId}
                        onClearSelection={clearObjectSelection}
                        onClickPosition={handleClickPosition}
                        // 上下文菜单相关props
                        onDeleteObjects={handleDeleteObject}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUpdateObjects={handleUpdateObjects}
                        dataFields={dataFields || []}
                    />
                </div>

                {selectedObject ? (
                    <ObjectPropertyPanel
                        object={selectedObject}
                        bandId={state.selectedBand!}
                        dataFields={dataFields || []}
                        onUpdateBands={updateBands}
                        onClearSelection={() => {
                            clearSelection();
                            updateState({ selectedObject: null });
                        }}
                    />
                ) : selectedBand ? (
                    <BandPropertyPanel
                        dataFields={dataFields || []}
                        band={selectedBand}
                        onUpdate={(updates) => {
                            updateBands(prev => prev.map(b =>
                                b.id === selectedBand.id ? { ...b, ...updates } : b
                            ));
                        }}
                        onFocusObject={(objectId, bandId) => {
                            // 设置焦点状态（只显示虚线框）
                            const key = `${bandId}-${objectId}`;
                            setFocusedObjectId(key);
                            // 清除选中状态
                            setSelectedObjectIds([]);
                            updateState({ selectedObject: null });
                            // 滚动到可视区域
                            const element = document.querySelector(`[data-object-id="${key}"]`);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }}
                        onSelectObject={(objectId, bandId) => {
                            // 选中对象（显示调整手柄）
                            const key = `${bandId}-${objectId}`;
                            setSelectedObjectIds([key]);
                            setFocusedObjectId(null); // 清除焦点状态
                            updateState({ selectedBand: bandId, selectedObject: objectId });
                        }}
                        selectedObjectIds={selectedObjectIds}
                        focusedObjectId={focusedObjectId}
                        onDeleteObject={(objectId, bandId) => {
                            // 删除单个控件
                            setBands(prevBands => prevBands.map(band => {
                                if (band.id !== bandId) return band;
                                return {
                                    ...band,
                                    objects: band.objects.filter((o: ControlObject) => o.id !== objectId)
                                };
                            }));
                            // 清除选中状态
                            setSelectedObjectIds(prev => prev.filter(k => k !== `${bandId}-${objectId}`));
                            setFocusedObjectId(null);
                        }}
                    />
                ) : (
                    <div className="property-panel">
                        <h3>属性</h3>
                        <div className="empty-state">
                            <p>{selectedObjectIds.length > 0
                                ? `已选中 ${selectedObjectIds.length} 个对象`
                                : '请选择一个对象或带区'}</p>
                            {selectedObjectIds.length > 0 && (
                                <div className="multi-selection-info">
                                    <p>按住Shift/Ctrl点击可多选</p>
                                    <p>使用方向键微调位置</p>
                                    <button
                                        className="btn btn-small"
                                        onClick={clearSelection}
                                    >
                                        清除选择
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="status-bar">
                <div className="status-item">
                    <span>提示:</span> 拖动带区边界线定义区域高度
                </div>
                <div className="status-item">
                    <span>带区数:</span> {bands.length}
                </div>
                <div className="status-item">
                    <span>控件总数:</span> {bands.reduce((sum, band) => sum + band.objects.length, 0)}
                </div>
                <div className="status-item">
                    <span>选中对象:</span> {selectedObjectIds.length} 个
                </div>
            </div>

            {showPreview && (
                <PrintPreview
                    bands={bands}
                    dataFields={dataFields || []}
                    pageWidth={unitConverter.toPx(A4_WIDTH)}
                    pageHeight={unitConverter.toPx(A4_HEIGHT)}
                    pageMargins={unitConverter.convertMargins(PAGE_MARGINS as { top: number; bottom: number; left: number; right: number })}
                    data={data} // 使用你的数据源
                    onClose={handleClosePreview}
                />
            )}

            {/* 添加计算字段时的公式编辑器 */}
            {showAddCalculatedEditor && (
                <FormulaEditor
                    dataFields={dataFields || []}
                    value=""
                    onConfirm={handleConfirmAddCalculated}
                    onCancel={handleCancelAddCalculated}
                />
            )}
        </div>
    );
};

export default BandBoundaryDesigner;