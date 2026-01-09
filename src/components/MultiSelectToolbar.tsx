// MultiSelectToolbar.tsx - 多选工具条组件
import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { ControlObject, ControlObjectAll, Band, ControlType, DataField, ControlTypeConfig } from '../types/types';
import { controlTypes } from '../types/constants';
import ColorPicker from './ColorPicker';
import './MultiSelectToolbar.css';

interface MultiSelectToolbarProps {
    selectedObjectIds: string[];
    bands: Band[];
    onUpdateObjects: (updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }>) => void;
    onClearSelection: () => void;
    onDeleteObjects: () => void;  // 删除选中的对象
    // 撤销/恢复
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    // 保存和预览
    onSave: () => void;
    onPreview: () => void;
    // 显示控制
    showGrid: boolean;
    showRulers: boolean;
    showPageMargins: boolean;
    onToggleGrid: () => void;
    onToggleRulers: () => void;
    onTogglePageMargins: () => void;
    // 页面设置
    onPageSettings: () => void;
    // 添加控件
    onAddControl: (type: string, fieldName?: string) => void;
    // 批量添加数据字段
    onAddFields: (fields: DataField[], arrangement: 'horizontal' | 'vertical') => void;
    // 当前选中的带区ID
    selectedBandId: string | null;
    dataFields: DataField[];
}

// 对齐类型
type AlignType = 'left' | 'right' | 'top' | 'bottom' | 'horizontal-center' | 'vertical-center';
type DistributeType = 'horizontal' | 'vertical';

// 计算元素的实际显示尺寸（包含边框和 padding）
// 必须与 getBaseObjectStyle 和 DraggableObject 的逻辑一致
const getDisplaySize = (obj: ControlObject) => {
    const objAll = obj as ControlObjectAll;
    const padding = 2; // 与 DraggableObject.tsx 一致

    // 线条类型特殊处理
    if (obj.type === 'line') {
        const lineObj = obj as any;
        const x1 = lineObj.x1 ?? obj.x;
        const y1 = lineObj.y1 ?? obj.y;
        const x2 = lineObj.x2 ?? obj.x + obj.width;
        const y2 = lineObj.y2 ?? obj.y;
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        return {
            x: minX,
            y: minY,
            width: maxX - minX || 1,
            height: maxY - minY || 1,
            extra: 0,
            borderWidth: 0,
            padding: 0
        };
    }

    // 计算边框宽度，与 getBaseObjectStyle 逻辑一致
    let borderWidth = 0;

    if (objAll.border && objAll.border.style !== 'none' && objAll.border.width) {
        borderWidth = objAll.border.width;
    } else if (!objAll.border) {
        // 没有设置 border 时，某些类型有默认边框
        if (obj.type === 'field' || obj.type === 'rectangle') {
            borderWidth = 1; // 默认 1px 边框
        }
    }

    const totalExtra = borderWidth + padding;
    return {
        x: obj.x,
        y: obj.y,
        width: obj.width + totalExtra * 2,
        height: obj.height + totalExtra * 2,
        extra: totalExtra,
        borderWidth,
        padding
    };
};

const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
    selectedObjectIds,
    bands,
    onUpdateObjects,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onSave,
    onPreview,
    showGrid,
    showRulers,
    showPageMargins,
    onToggleGrid,
    onToggleRulers,
    onTogglePageMargins,
    onPageSettings,
    onAddControl,
    onAddFields,
    selectedBandId,
    dataFields
}) => {
    // 控件列表下拉状态
    const [showControlDropdown, setShowControlDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const controlDropdownRef = useRef<HTMLDivElement>(null);
    const controlBtnRef = useRef<HTMLButtonElement>(null);
    
    // 数据字段弹窗状态
    const [showFieldModal, setShowFieldModal] = useState(false);
    const [selectedFields, setSelectedFields] = useState<DataField[]>([]);
    const [fieldArrangement, setFieldArrangement] = useState<'horizontal' | 'vertical'>('horizontal');

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (controlDropdownRef.current && !controlDropdownRef.current.contains(e.target as Node)) {
                setShowControlDropdown(false);
            }
        };
        if (showControlDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showControlDropdown]);

    // 切换下拉菜单并计算位置
    const toggleControlDropdown = useCallback(() => {
        if (!showControlDropdown && controlBtnRef.current) {
            const rect = controlBtnRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
            });
        }
        setShowControlDropdown(!showControlDropdown);
    }, [showControlDropdown]);

    // 按类别分组控件
    const controlsByCategory = useMemo(() => {
        const grouped: Record<string, ControlTypeConfig[]> = {
            basic: [],
            system: [],
            decorator: [],
        };
        controlTypes.forEach(ct => {
            // 将计算字段移到基础控件
            if (ct.id === 'calculated') {
                grouped.basic.push(ct);
            } else if (ct.category === 'field') {
                // 数据字段不放在控件列表，通过专门的字段按钮添加
                // 但其他字段类控件不排除
            } else if (grouped[ct.category]) {
                grouped[ct.category].push(ct);
            }
        });
        return grouped;
    }, []);

    // 按来源分组数据字段
    const fieldsBySource = useMemo(() => {
        const master = dataFields.filter(f => f.source === 'master');
        const detail = dataFields.filter(f => f.source === 'detail');
        return { master, detail };
    }, [dataFields]);

    // 处理添加控件
    const handleAddControlClick = useCallback((type: string) => {
        onAddControl(type);
        setShowControlDropdown(false);
    }, [onAddControl]);

    // 切换字段选中状态
    const toggleFieldSelection = useCallback((field: DataField) => {
        setSelectedFields(prev => {
            const exists = prev.find(f => f.name === field.name);
            if (exists) {
                return prev.filter(f => f.name !== field.name);
            }
            return [...prev, field];
        });
    }, []);

    // 确认添加字段
    const handleConfirmAddFields = useCallback(() => {
        if (selectedFields.length > 0) {
            onAddFields(selectedFields, fieldArrangement);
        }
        setShowFieldModal(false);
        setSelectedFields([]);
    }, [selectedFields, fieldArrangement, onAddFields]);

    // 取消添加字段
    const handleCancelFieldModal = useCallback(() => {
        setShowFieldModal(false);
        setSelectedFields([]);
    }, []);
    // 获取选中的对象
    const selectedObjects = useMemo(() => {
        const objects: Array<{ object: ControlObject; bandId: string }> = [];
        selectedObjectIds.forEach(key => {
            const [bandId, objectId] = key.split('-');
            const band = bands.find(b => b.id === bandId);
            const obj = band?.objects.find(o => o.id === objectId);
            if (obj && band) {
                objects.push({ object: obj, bandId });
            }
        });
        return objects;
    }, [selectedObjectIds, bands]);

    // // 分析选中对象的类型
    // const objectTypes = useMemo(() => {
    //     const types = new Set<ControlType>();
    //     selectedObjects.forEach(({ object }) => {
    //         types.add(object.type);
    //     });
    //     return Array.from(types);
    // }, [selectedObjects]);


    // 所有选中的都是文本类元素（不包括富文本，因为富文本自带格式化工具）
    const allTextElements = useMemo(() => {
        const textTypes: ControlType[] = ['text', 'field', 'calculated', 'page_number', 'current_date'];
        return selectedObjects.every(({ object }) => textTypes.includes(object.type));
    }, [selectedObjects]);

    // 获取公共属性值（如果所有对象属性相同则返回该值，否则返回 undefined）
    const getCommonValue = useCallback(<K extends keyof ControlObjectAll>(key: K): ControlObjectAll[K] | undefined => {
        if (selectedObjects.length === 0) return undefined;
        const firstObj = selectedObjects[0].object as ControlObjectAll;
        const firstValue = firstObj[key];
        const allSame = selectedObjects.every(({ object }) => (object as ControlObjectAll)[key] === firstValue);
        return allSame ? firstValue : undefined;
    }, [selectedObjects]);

    // 对齐操作 - 考虑实际显示尺寸
    const handleAlign = useCallback((type: AlignType) => {
        if (selectedObjects.length < 2) return;

        // 使用第一个选中的对象作为参照
        const reference = selectedObjects[0].object;
        const refDisplay = getDisplaySize(reference);
        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

        selectedObjects.slice(1).forEach(({ object, bandId }) => {
            const objDisplay = getDisplaySize(object);
            const changes: Partial<ControlObjectAll> = {};

            // 线条类型特殊处理
            if (object.type === 'line') {
                const lineObj = object as any;
                const x1 = lineObj.x1 ?? object.x;
                const y1 = lineObj.y1 ?? object.y;
                const x2 = lineObj.x2 ?? object.x + object.width;
                const y2 = lineObj.y2 ?? object.y;

                let deltaX = 0;
                let deltaY = 0;

                switch (type) {
                    case 'left':
                        deltaX = refDisplay.x - objDisplay.x;
                        break;
                    case 'right':
                        deltaX = (refDisplay.x + refDisplay.width) - (objDisplay.x + objDisplay.width);
                        break;
                    case 'top':
                        deltaY = refDisplay.y - objDisplay.y;
                        break;
                    case 'bottom':
                        deltaY = (refDisplay.y + refDisplay.height) - (objDisplay.y + objDisplay.height);
                        break;
                    case 'horizontal-center':
                        deltaX = (refDisplay.x + refDisplay.width / 2) - (objDisplay.x + objDisplay.width / 2);
                        break;
                    case 'vertical-center':
                        deltaY = (refDisplay.y + refDisplay.height / 2) - (objDisplay.y + objDisplay.height / 2);
                        break;
                }

                (changes as any).x1 = x1 + deltaX;
                (changes as any).y1 = y1 + deltaY;
                (changes as any).x2 = x2 + deltaX;
                (changes as any).y2 = y2 + deltaY;
                changes.x = object.x + deltaX;
                changes.y = object.y + deltaY;
            } else {
                // 使用 refDisplay 的坐标，这样当参照是线条时也能正确对齐
                switch (type) {
                    case 'left':
                        changes.x = refDisplay.x;
                        break;
                    case 'right':
                        changes.x = refDisplay.x + refDisplay.width - objDisplay.width;
                        break;
                    case 'top':
                        changes.y = refDisplay.y;
                        break;
                    case 'bottom':
                        changes.y = refDisplay.y + refDisplay.height - objDisplay.height;
                        break;
                    case 'horizontal-center':
                        changes.x = refDisplay.x + (refDisplay.width - objDisplay.width) / 2;
                        break;
                    case 'vertical-center':
                        changes.y = refDisplay.y + (refDisplay.height - objDisplay.height) / 2;
                        break;
                }
            }

            updates.push({ bandId, objectId: object.id, changes });
        });

        onUpdateObjects(updates);
    }, [selectedObjects, onUpdateObjects]);

    // 分布操作 - 考虑实际显示尺寸
    const handleDistribute = useCallback((type: DistributeType) => {
        if (selectedObjects.length < 3) return;

        // 按位置排序
        const sorted = [...selectedObjects].sort((a, b) => {
            if (type === 'horizontal') {
                return a.object.x - b.object.x;
            } else {
                return a.object.y - b.object.y;
            }
        });

        const first = sorted[0].object;
        const last = sorted[sorted.length - 1].object;
        const lastDisplay = getDisplaySize(last);

        // 计算总间距
        let totalSpace: number;
        let objectsSpace = 0;

        if (type === 'horizontal') {
            totalSpace = (last.x + lastDisplay.width) - first.x;
            sorted.forEach(({ object }) => {
                objectsSpace += getDisplaySize(object).width;
            });
        } else {
            totalSpace = (last.y + lastDisplay.height) - first.y;
            sorted.forEach(({ object }) => {
                objectsSpace += getDisplaySize(object).height;
            });
        }

        const gap = (totalSpace - objectsSpace) / (sorted.length - 1);
        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

        let currentPosition = type === 'horizontal' ? first.x : first.y;

        sorted.forEach(({ object, bandId }, index) => {
            const objDisplay = getDisplaySize(object);
            if (index === 0) {
                currentPosition += type === 'horizontal' ? objDisplay.width : objDisplay.height;
                return;
            }

            const changes: Partial<ControlObjectAll> = {};
            if (type === 'horizontal') {
                changes.x = currentPosition + gap;
                currentPosition = changes.x + objDisplay.width;
            } else {
                changes.y = currentPosition + gap;
                currentPosition = changes.y + objDisplay.height;
            }

            updates.push({ bandId, objectId: object.id, changes });
        });

        onUpdateObjects(updates);
    }, [selectedObjects, onUpdateObjects]);

    // 设置相同尺寸 - 考虑边框和 padding，让视觉尺寸相同
    const handleSameSize = useCallback((dimension: 'width' | 'height' | 'both') => {
        if (selectedObjects.length < 2) return;

        const reference = selectedObjects[0].object;
        const refDisplay = getDisplaySize(reference);
        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

        // 检查参照对象是否是线条
        const refIsLine = reference.type === 'line';
        let refLineLength = 0;

        if (refIsLine) {
            const refLineObj = reference as any;
            const refX1 = refLineObj.x1 ?? reference.x;
            const refY1 = refLineObj.y1 ?? reference.y;
            const refX2 = refLineObj.x2 ?? reference.x + reference.width;
            const refY2 = refLineObj.y2 ?? reference.y;

            if (refX1 === refX2) {
                refLineLength = Math.abs(refY2 - refY1);
            } else if (refY1 === refY2) {
                refLineLength = Math.abs(refX2 - refX1);
            } else {
                refLineLength = Math.sqrt(Math.pow(refX2 - refX1, 2) + Math.pow(refY2 - refY1, 2));
            }
        }

        selectedObjects.slice(1).forEach(({ object, bandId }) => {
            const changes: Partial<ControlObjectAll> = {};

            // 线条类型特殊处理
            if (object.type === 'line') {
                const lineObj = object as any;
                const x1 = lineObj.x1 ?? object.x;
                const y1 = lineObj.y1 ?? object.y;
                const x2 = lineObj.x2 ?? object.x + object.width;
                const y2 = lineObj.y2 ?? object.y;

                // 判断当前线条类型
                const isVertical = x1 === x2;  // 竖线
                const isHorizontal = y1 === y2;  // 横线

                if (refIsLine) {
                    // 参照也是线条，设置相同长度
                    if (isVertical && (dimension === 'height' || dimension === 'both')) {
                        // 竖线调整高度
                        const currentLength = Math.abs(y2 - y1);
                        const delta = refLineLength - currentLength;
                        // 考虑线条方向：如果 y2 > y1，给 y2 加 delta；否则给 y2 减 delta
                        if (y2 >= y1) {
                            (changes as any).y2 = y2 + delta;
                        } else {
                            (changes as any).y2 = y2 - delta;
                        }
                    } else if (isHorizontal && (dimension === 'width' || dimension === 'both')) {
                        // 横线调整宽度
                        const currentLength = Math.abs(x2 - x1);
                        const delta = refLineLength - currentLength;
                        // 考虑线条方向：如果 x2 > x1，给 x2 加 delta；否则给 x2 减 delta
                        if (x2 >= x1) {
                            (changes as any).x2 = x2 + delta;
                        } else {
                            (changes as any).x2 = x2 - delta;
                        }
                    }
                } else {
                    // 参照是普通对象
                    if (isVertical && (dimension === 'height' || dimension === 'both')) {
                        // 竖线调整高度与参照对象相同
                        const delta = refDisplay.height - Math.abs(y2 - y1);
                        if (y2 >= y1) {
                            (changes as any).y2 = y2 + delta;
                        } else {
                            (changes as any).y2 = y2 - delta;
                        }
                    } else if (isHorizontal && (dimension === 'width' || dimension === 'both')) {
                        // 横线调整宽度与参照对象相同
                        const delta = refDisplay.width - Math.abs(x2 - x1);
                        if (x2 >= x1) {
                            (changes as any).x2 = x2 + delta;
                        } else {
                            (changes as any).x2 = x2 - delta;
                        }
                    }
                }

                if (Object.keys(changes).length > 0) {
                    updates.push({ bandId, objectId: object.id, changes });
                }
                return;
            }

            // 普通对象处理
            const objDisplay = getDisplaySize(object);

            if (dimension === 'width' || dimension === 'both') {
                // 目标对象的 width = 参照视觉宽度 - 当前对象的边框和padding
                // 使用 refDisplay.width 而不是 reference.width，这样当参照是线条时也能正确处理
                changes.width = refDisplay.width - objDisplay.extra * 2;
            }
            if (dimension === 'height' || dimension === 'both') {
                // 目标对象的 height = 参照视觉高度 - 当前对象的边框和padding
                changes.height = refDisplay.height - objDisplay.extra * 2;
            }

            updates.push({ bandId, objectId: object.id, changes });
        });

        if (updates.length > 0) {
            onUpdateObjects(updates);
        }
    }, [selectedObjects, onUpdateObjects]);

    // 批量设置样式
    const handleStyleChange = useCallback((key: keyof ControlObjectAll, value: any) => {
        const updates = selectedObjects.map(({ object, bandId }) => ({
            bandId,
            objectId: object.id,
            changes: { [key]: value }
        }));
        onUpdateObjects(updates);
    }, [selectedObjects, onUpdateObjects]);

    // 批量设置边框
    const handleBorderChange = useCallback((borderKey: string, value: any) => {
        const updates = selectedObjects.map(({ object, bandId }) => {
            const objAll = object as ControlObjectAll;
            return {
                bandId,
                objectId: object.id,
                changes: {
                    border: {
                        ...objAll.border,
                        [borderKey]: value
                    }
                }
            };
        });
        onUpdateObjects(updates);
    }, [selectedObjects, onUpdateObjects]);

    // 如果没有选中多个对象，禁用对齐功能
    const canAlign = selectedObjectIds.length >= 2;
    const canDistribute = selectedObjectIds.length >= 3;
    const hasSelection = selectedObjectIds.length >= 1;

    const commonFontSize = getCommonValue('fontSize');
    const commonColor = getCommonValue('color');
    const commonBackground = getCommonValue('background');
    const commonTextAlign = getCommonValue('textAlign');

    return (
        <div className="multi-select-toolbar">
            {/* 保存/预览 */}
            <div className="toolbar-section">
                <div className="toolbar-buttons">
                    <button
                        className="toolbar-btn btn-primary"
                        onClick={onSave}
                        title="保存 (Ctrl+S)"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={onPreview}
                        title="打印预览 (Ctrl+P)"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 撤销/恢复 */}
            <div className="toolbar-section">
                <div className="toolbar-buttons">
                    <button
                        className="toolbar-btn"
                        onClick={onUndo}
                        title="撤销 (Ctrl+Z)"
                        disabled={!canUndo}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={onRedo}
                        title="恢复 (Ctrl+Shift+Z)"
                        disabled={!canRedo}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 控件列表下拉 */}
            <div className="toolbar-section" ref={controlDropdownRef}>
                <div className="toolbar-buttons">
                    <button
                        ref={controlBtnRef}
                        className={`toolbar-btn toolbar-dropdown-btn ${showControlDropdown ? 'active' : ''}`}
                        onClick={toggleControlDropdown}
                        title="添加控件"
                        disabled={!selectedBandId}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        <span className="dropdown-arrow">▼</span>
                    </button>
                </div>
                {showControlDropdown && (
                    <div 
                        className="toolbar-dropdown-menu control-dropdown"
                        style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                    >
                        <div className="dropdown-category">
                            <div className="category-title">基础控件</div>
                            {controlsByCategory.basic.map(ct => (
                                <div
                                    key={ct.id}
                                    className="dropdown-item"
                                    onClick={() => handleAddControlClick(ct.id)}
                                >
                                    <span className="item-icon">{ct.icon}</span>
                                    <span className="item-name">{ct.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="dropdown-divider" />
                        <div className="dropdown-category">
                            <div className="category-title">系统控件</div>
                            {controlsByCategory.system.map(ct => (
                                <div
                                    key={ct.id}
                                    className="dropdown-item"
                                    onClick={() => handleAddControlClick(ct.id)}
                                >
                                    <span className="item-icon">{ct.icon}</span>
                                    <span className="item-name">{ct.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="dropdown-divider" />
                        <div className="dropdown-category">
                            <div className="category-title">装饰控件</div>
                            {controlsByCategory.decorator.map(ct => (
                                <div
                                    key={ct.id}
                                    className="dropdown-item"
                                    onClick={() => handleAddControlClick(ct.id)}
                                >
                                    <span className="item-icon">{ct.icon}</span>
                                    <span className="item-name">{ct.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 数据字段按钮 */}
            <div className="toolbar-section">
                <div className="toolbar-buttons">
                    <button
                        className="toolbar-btn"
                        onClick={() => setShowFieldModal(true)}
                        title="插入数据字段"
                        disabled={!selectedBandId}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2zm0-6V3.5L18.5 9H13z" />
                        </svg>
                        <span style={{ marginLeft: 4, fontSize: 11 }}>字段</span>
                    </button>
                </div>
            </div>

            {/* 对齐工具 */}
            <div className="toolbar-section">
                <span className="section-title">对齐</span>
                <div className="toolbar-buttons">
                    <button
                        className="toolbar-btn"
                        onClick={() => handleAlign('left')}
                        title="左对齐（以第一个选中的对象为参照）"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M4 22V2h2v20H4zm4-17v4h12V5H8zm0 14h8v-4H8v4z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleAlign('horizontal-center')}
                        title="水平居中对齐"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M11 2h2v5h6v4h-6v2h4v4h-4v5h-2v-5H7v-4h4v-2H5V7h6V2z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleAlign('right')}
                        title="右对齐"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M18 22V2h2v20h-2zM4 5v4h12V5H4zm4 14h8v-4H8v4z" />
                        </svg>
                    </button>
                    <span className="separator" />
                    <button
                        className="toolbar-btn"
                        onClick={() => handleAlign('top')}
                        title="顶部对齐"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M2 4h20v2H2V4zm3 4h4v12H5V8zm10 0h4v8h-4V8z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleAlign('vertical-center')}
                        title="垂直居中对齐"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M2 11h5V5h4v6h2V7h4v4h5v2h-5v4h-4v-4h-2v6H7v-6H2v-2z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleAlign('bottom')}
                        title="底部对齐"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M2 18h20v2H2v-2zM5 4h4v12H5V4zm10 4h4v8h-4V8z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 分布工具 */}
            <div className="toolbar-section">
                <span className="section-title">分布</span>
                <div className="toolbar-buttons">
                    <button
                        className="toolbar-btn"
                        onClick={() => handleDistribute('horizontal')}
                        title="水平均匀分布"
                        disabled={!canDistribute}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M4 5v14h2V5H4zm14 0v14h2V5h-2zM9 7h2v10H9V7zm4 2h2v6h-2V9z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleDistribute('vertical')}
                        title="垂直均匀分布"
                        disabled={!canDistribute}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M5 4h14v2H5V4zm0 14h14v2H5v-2zm2-11h10v2H7V7zm2 4h6v2H9v-2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 尺寸工具 */}
            <div className="toolbar-section">
                <span className="section-title">尺寸</span>
                <div className="toolbar-buttons">
                    <button
                        className="toolbar-btn"
                        onClick={() => handleSameSize('width')}
                        title="相同宽度"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M4 9h16v2H4V9zm0 4h16v2H4v-2z" />
                            <path fill="currentColor" d="M7 6l-3 3 3 3V6zm10 0v6l3-3-3-3z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleSameSize('height')}
                        title="相同高度"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M9 4v16h2V4H9zm4 0v16h2V4h-2z" />
                            <path fill="currentColor" d="M6 7l3-3 3 3H6zm0 10h6l-3 3-3-3z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => handleSameSize('both')}
                        title="相同尺寸"
                        disabled={!canAlign}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path fill="currentColor" d="M8 11h8v2H8z" />
                            <path fill="currentColor" d="M11 8v8h2V8z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 文本样式 */}
            <div className="toolbar-section">
                <span className="section-title">文本</span>
                <div className="toolbar-controls">
                    <label className="toolbar-control-item" title="字体大小">
                        <span>大小</span>
                        <input
                            type="number"
                            value={commonFontSize ?? ''}
                            placeholder="-"
                            min={8}
                            max={72}
                            onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 12)}
                            disabled={!hasSelection || !allTextElements}
                        />
                    </label>
                    <div className="toolbar-control-item" title="文字颜色">
                        <span>颜色</span>
                        <ColorPicker
                            value={commonColor || ''}
                            onChange={(color) => handleStyleChange('color', color)}
                            disabled={!hasSelection || !allTextElements}
                        />
                    </div>
                    <div className="toolbar-control-item" title="背景颜色">
                        <span>背景</span>
                        <ColorPicker
                            value={commonBackground || ''}
                            onChange={(color) => handleStyleChange('background', color)}
                            disabled={!hasSelection || !allTextElements}
                        />
                    </div>
                </div>
                <div className="toolbar-buttons">
                    <button
                        className={`toolbar-btn ${commonTextAlign === 'left' ? 'active' : ''}`}
                        onClick={() => handleStyleChange('textAlign', 'left')}
                        title="左对齐"
                        disabled={!hasSelection || !allTextElements}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect x="2" y="2" width="8" height="3" fill="currentColor" />
                            <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                            <rect x="2" y="12" width="10" height="2" fill="currentColor" />
                        </svg>
                    </button>
                    <button
                        className={`toolbar-btn ${commonTextAlign === 'center' ? 'active' : ''}`}
                        onClick={() => handleStyleChange('textAlign', 'center')}
                        title="居中"
                        disabled={!hasSelection || !allTextElements}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect x="4" y="2" width="8" height="3" fill="currentColor" />
                            <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                            <rect x="3" y="12" width="10" height="2" fill="currentColor" />
                        </svg>
                    </button>
                    <button
                        className={`toolbar-btn ${commonTextAlign === 'right' ? 'active' : ''}`}
                        onClick={() => handleStyleChange('textAlign', 'right')}
                        title="右对齐"
                        disabled={!hasSelection || !allTextElements}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect x="6" y="2" width="8" height="3" fill="currentColor" />
                            <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                            <rect x="4" y="12" width="10" height="2" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 边框样式 */}
            <div className="toolbar-section">
                <span className="section-title">边框</span>
                <div className="toolbar-controls">
                    <label className="toolbar-control-item" title="边框宽度">
                        <span>宽度</span>
                        <select
                            value={(selectedObjects[0]?.object as ControlObjectAll)?.border?.width ?? 0}
                            onChange={(e) => handleBorderChange('width', parseInt(e.target.value))}
                            disabled={!hasSelection}
                        >
                            <option value={0}>无</option>
                            <option value={1}>1px</option>
                            <option value={2}>2px</option>
                            <option value={3}>3px</option>
                        </select>
                    </label>
                    <label className="toolbar-control-item" title="边框样式">
                        <span>样式</span>
                        <select
                            value={(selectedObjects[0]?.object as ControlObjectAll)?.border?.style ?? 'solid'}
                            onChange={(e) => handleBorderChange('style', e.target.value)}
                            disabled={!hasSelection}
                        >
                            <option value="solid">实线</option>
                            <option value="dashed">虚线</option>
                            <option value="dotted">点线</option>
                        </select>
                    </label>
                    <div className="toolbar-control-item" title="边框颜色">
                        <span>颜色</span>
                        <ColorPicker
                            value={(selectedObjects[0]?.object as ControlObjectAll)?.border?.color || ''}
                            onChange={(color) => handleBorderChange('color', color)}
                            disabled={!hasSelection}
                        />
                    </div>
                </div>
            </div>

            {/* 显示控制 */}
            <div className="toolbar-section">
                <span className="section-title">显示</span>
                <div className="toolbar-buttons">
                    <button
                        className={`toolbar-btn ${showGrid ? 'active' : ''}`}
                        onClick={onToggleGrid}
                        title="显示网格"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />
                        </svg>
                    </button>
                    <button
                        className={`toolbar-btn ${showRulers ? 'active' : ''}`}
                        onClick={onToggleRulers}
                        title="显示标尺"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z" />
                        </svg>
                    </button>
                    <button
                        className={`toolbar-btn ${showPageMargins ? 'active' : ''}`}
                        onClick={onTogglePageMargins}
                        title="显示边距"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 3h18v18H3z" />
                            <path fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" d="M6 6h12v12H6z" />
                        </svg>
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={onPageSettings}
                        title="页面设置"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 快捷操作 */}
            {/* <div className="toolbar-section toolbar-actions">
                <button
                    className="toolbar-btn btn-delete"
                    onClick={onDeleteObjects}
                    title="删除选中的对象 (Delete)"
                    disabled={!hasSelection}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                </button>
                <button
                    className="toolbar-btn btn-clear"
                    onClick={onClearSelection}
                    title="取消选择"
                    disabled={!hasSelection}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M7 7l10 10M17 7L7 17" />
                    </svg>
                </button>
            </div> */}

            {/* 数据字段选择弹窗 */}
            {showFieldModal && (
                <div className="field-modal-overlay" onClick={handleCancelFieldModal}>
                    <div className="field-modal" onClick={e => e.stopPropagation()}>
                        <div className="field-modal-header">
                            <h3>选择数据字段</h3>
                            <button className="modal-close-btn" onClick={handleCancelFieldModal}>×</button>
                        </div>
                        <div className="field-modal-body">
                            <div className="field-group">
                                <div className="field-group-title">主表字段</div>
                                <div className="field-list">
                                    {fieldsBySource.master.map(field => (
                                        <label
                                            key={field.name}
                                            className={`field-item ${selectedFields.find(f => f.name === field.name) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!selectedFields.find(f => f.name === field.name)}
                                                onChange={() => toggleFieldSelection(field)}
                                            />
                                            <span className="field-label">{field.label}</span>
                                            <span className="field-name">{field.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="field-group">
                                <div className="field-group-title">明细字段</div>
                                <div className="field-list">
                                    {fieldsBySource.detail.map(field => (
                                        <label
                                            key={field.name}
                                            className={`field-item ${selectedFields.find(f => f.name === field.name) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!selectedFields.find(f => f.name === field.name)}
                                                onChange={() => toggleFieldSelection(field)}
                                            />
                                            <span className="field-label">{field.label}</span>
                                            <span className="field-name">{field.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="field-modal-footer">
                            <div className="arrangement-options">
                                <span>排列方式：</span>
                                <label>
                                    <input
                                        type="radio"
                                        name="arrangement"
                                        checked={fieldArrangement === 'horizontal'}
                                        onChange={() => setFieldArrangement('horizontal')}
                                    />
                                    横向
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="arrangement"
                                        checked={fieldArrangement === 'vertical'}
                                        onChange={() => setFieldArrangement('vertical')}
                                    />
                                    纵向
                                </label>
                            </div>
                            <div className="modal-buttons">
                                <button className="btn btn-cancel" onClick={handleCancelFieldModal}>取消</button>
                                <button
                                    className="btn btn-confirm"
                                    onClick={handleConfirmAddFields}
                                    disabled={selectedFields.length === 0}
                                >
                                    插入 ({selectedFields.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectToolbar;
