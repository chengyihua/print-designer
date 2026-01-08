// ContextMenu.tsx - 设计区右键上下文菜单组件
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ControlObject, ControlObjectAll, Band } from '../types/types';
import './ContextMenu.css';

interface ContextMenuProps {
    visible: boolean;
    x: number;
    y: number;
    selectedObjectIds: string[];
    bands: Band[];
    onClose: () => void;
    onUpdateObjects: (updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }>) => void;
    onDeleteObjects: () => void;
    onClearSelection: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onCopy?: () => void;
    onPaste?: () => void;
    canPaste?: boolean;
}

// 对齐类型
type AlignType = 'left' | 'right' | 'top' | 'bottom' | 'horizontal-center' | 'vertical-center';
type DistributeType = 'horizontal' | 'vertical';

// 计算元素的实际显示尺寸
const getDisplaySize = (obj: ControlObject) => {
    const objAll = obj as ControlObjectAll;
    const padding = 2;

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
        };
    }

    let borderWidth = 0;
    if (objAll.border && objAll.border.style !== 'none' && objAll.border.width) {
        borderWidth = objAll.border.width;
    } else if (!objAll.border) {
        if (obj.type === 'field' || obj.type === 'rectangle') {
            borderWidth = 1;
        }
    }

    const totalExtra = borderWidth + padding;
    return {
        x: obj.x,
        y: obj.y,
        width: obj.width + totalExtra * 2,
        height: obj.height + totalExtra * 2,
        extra: totalExtra,
    };
};

const ContextMenu: React.FC<ContextMenuProps> = ({
    visible,
    x,
    y,
    selectedObjectIds,
    bands,
    onClose,
    onUpdateObjects,
    onDeleteObjects,
    onClearSelection,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onCopy,
    onPaste,
    canPaste = false,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

    // 调整菜单位置，防止超出视窗边界
    useEffect(() => {
        if (visible && menuRef.current) {
            const menu = menuRef.current;
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            // 如果菜单超出右边界，向左偏移
            if (x + rect.width > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 8;
            }

            // 如果菜单超出底部边界，向上偏移
            if (y + rect.height > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 8;
            }

            // 确保不超出左边界和顶部边界
            adjustedX = Math.max(8, adjustedX);
            adjustedY = Math.max(8, adjustedY);

            setAdjustedPosition({ x: adjustedX, y: adjustedY });
        }
    }, [visible, x, y]);

    // 获取选中的对象
    const selectedObjects = React.useMemo(() => {
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

    const hasSelection = selectedObjectIds.length >= 1;
    const canAlign = selectedObjectIds.length >= 2;
    const canDistribute = selectedObjectIds.length >= 3;

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('contextmenu', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('contextmenu', handleClickOutside);
        };
    }, [visible, onClose]);

    // ESC 关闭菜单
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [visible, onClose]);

    // 对齐操作
    const handleAlign = useCallback((type: AlignType) => {
        if (selectedObjects.length < 2) return;

        const reference = selectedObjects[0].object;
        const refDisplay = getDisplaySize(reference);
        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

        selectedObjects.slice(1).forEach(({ object, bandId }) => {
            const objDisplay = getDisplaySize(object);
            const changes: Partial<ControlObjectAll> = {};

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
        onClose();
    }, [selectedObjects, onUpdateObjects, onClose]);

    // 分布操作
    const handleDistribute = useCallback((type: DistributeType) => {
        if (selectedObjects.length < 3) return;

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
        onClose();
    }, [selectedObjects, onUpdateObjects, onClose]);

    // 设置相同尺寸
    const handleSameSize = useCallback((dimension: 'width' | 'height' | 'both') => {
        if (selectedObjects.length < 2) return;

        const reference = selectedObjects[0].object;
        const refDisplay = getDisplaySize(reference);
        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

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

            if (object.type === 'line') {
                const lineObj = object as any;
                const x1 = lineObj.x1 ?? object.x;
                const y1 = lineObj.y1 ?? object.y;
                const x2 = lineObj.x2 ?? object.x + object.width;
                const y2 = lineObj.y2 ?? object.y;

                const isVertical = x1 === x2;
                const isHorizontal = y1 === y2;

                if (refIsLine) {
                    if (isVertical && (dimension === 'height' || dimension === 'both')) {
                        const currentLength = Math.abs(y2 - y1);
                        const delta = refLineLength - currentLength;
                        (changes as any).y2 = y2 + delta;
                    } else if (isHorizontal && (dimension === 'width' || dimension === 'both')) {
                        const currentLength = Math.abs(x2 - x1);
                        const delta = refLineLength - currentLength;
                        (changes as any).x2 = x2 + delta;
                    }
                } else {
                    if (isVertical && (dimension === 'height' || dimension === 'both')) {
                        const delta = refDisplay.height - Math.abs(y2 - y1);
                        (changes as any).y2 = y2 + delta;
                    } else if (isHorizontal && (dimension === 'width' || dimension === 'both')) {
                        const delta = refDisplay.width - Math.abs(x2 - x1);
                        (changes as any).x2 = x2 + delta;
                    }
                }

                if (Object.keys(changes).length > 0) {
                    updates.push({ bandId, objectId: object.id, changes });
                }
                return;
            }

            const objDisplay = getDisplaySize(object);

            if (dimension === 'width' || dimension === 'both') {
                changes.width = refDisplay.width - objDisplay.extra * 2;
            }
            if (dimension === 'height' || dimension === 'both') {
                changes.height = refDisplay.height - objDisplay.extra * 2;
            }

            updates.push({ bandId, objectId: object.id, changes });
        });

        if (updates.length > 0) {
            onUpdateObjects(updates);
        }
        onClose();
    }, [selectedObjects, onUpdateObjects, onClose]);

    // 最小层级值（确保元素在画布基础层之上）
    const MIN_ZINDEX = 1;

    // 上移一层
    const handleMoveUp = useCallback(() => {
        if (selectedObjects.length === 0) return;

        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

        selectedObjects.forEach(({ object, bandId }) => {
            const currentZIndex = object.zIndex ?? MIN_ZINDEX;
            updates.push({
                bandId,
                objectId: object.id,
                changes: { zIndex: currentZIndex + 1 }
            });
        });

        onUpdateObjects(updates);
        onClose();
    }, [selectedObjects, onUpdateObjects, onClose]);

    // 下移一层
    const handleMoveDown = useCallback(() => {
        if (selectedObjects.length === 0) return;

        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];

        selectedObjects.forEach(({ object, bandId }) => {
            const currentZIndex = object.zIndex ?? MIN_ZINDEX;
            updates.push({
                bandId,
                objectId: object.id,
                changes: { zIndex: Math.max(MIN_ZINDEX, currentZIndex - 1) }
            });
        });

        onUpdateObjects(updates);
        onClose();
    }, [selectedObjects, onUpdateObjects, onClose]);

    // 置于顶层
    const handleBringToFront = useCallback(() => {
        if (selectedObjects.length === 0) return;

        // 找出当前带区中最大的zIndex
        let maxZIndex = 0;
        selectedObjects.forEach(({ bandId }) => {
            const band = bands.find(b => b.id === bandId);
            if (band) {
                band.objects.forEach(obj => {
                    const z = obj.zIndex ?? 0;
                    if (z > maxZIndex) maxZIndex = z;
                });
            }
        });

        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];
        selectedObjects.forEach(({ object, bandId }, index) => {
            updates.push({
                bandId,
                objectId: object.id,
                changes: { zIndex: maxZIndex + 1 + index }
            });
        });

        onUpdateObjects(updates);
        onClose();
    }, [selectedObjects, bands, onUpdateObjects, onClose]);

    // 置于底层
    const handleSendToBack = useCallback(() => {
        if (selectedObjects.length === 0) return;

        const updates: Array<{ bandId: string; objectId: string; changes: Partial<ControlObjectAll> }> = [];
        selectedObjects.forEach(({ object, bandId }) => {
            updates.push({
                bandId,
                objectId: object.id,
                changes: { zIndex: MIN_ZINDEX }
            });
        });

        onUpdateObjects(updates);
        onClose();
    }, [selectedObjects, onUpdateObjects, onClose]);

    // 包装操作并关闭菜单
    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    if (!visible) return null;

    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 10000,
    };

    return (
        <div ref={menuRef} className="context-menu" style={menuStyle}>
            {/* 撤销/恢复 */}
            <div className="context-menu-item" onClick={() => handleAction(onUndo)} data-disabled={!canUndo}>
                <span className="menu-icon">↩</span>
                <span className="menu-label">撤销</span>
                <span className="menu-shortcut">Ctrl+Z</span>
            </div>
            <div className="context-menu-item" onClick={() => handleAction(onRedo)} data-disabled={!canRedo}>
                <span className="menu-icon">↪</span>
                <span className="menu-label">恢复</span>
                <span className="menu-shortcut">Ctrl+Shift+Z</span>
            </div>

            <div className="context-menu-divider" />

            {/* 复制/粘贴 */}
            {onCopy && (
                <div className="context-menu-item" onClick={() => handleAction(onCopy)} data-disabled={!hasSelection}>
                    <span className="menu-icon">📋</span>
                    <span className="menu-label">复制</span>
                    <span className="menu-shortcut">Ctrl+C</span>
                </div>
            )}
            {onPaste && (
                <div className="context-menu-item" onClick={() => handleAction(onPaste)} data-disabled={!canPaste}>
                    <span className="menu-icon">📄</span>
                    <span className="menu-label">粘贴</span>
                    <span className="menu-shortcut">Ctrl+V</span>
                </div>
            )}

            {(onCopy || onPaste) && <div className="context-menu-divider" />}

            {/* 对齐子菜单 */}
            <div className="context-menu-item context-menu-submenu" data-disabled={!canAlign}>
                <span className="menu-icon">⬛</span>
                <span className="menu-label">对齐</span>
                <span className="menu-arrow">▸</span>
                <div className="context-submenu">
                    <div className="context-menu-item" onClick={() => handleAlign('left')}>
                        <span className="menu-label">左对齐</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleAlign('horizontal-center')}>
                        <span className="menu-label">水平居中</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleAlign('right')}>
                        <span className="menu-label">右对齐</span>
                    </div>
                    <div className="context-menu-divider" />
                    <div className="context-menu-item" onClick={() => handleAlign('top')}>
                        <span className="menu-label">顶部对齐</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleAlign('vertical-center')}>
                        <span className="menu-label">垂直居中</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleAlign('bottom')}>
                        <span className="menu-label">底部对齐</span>
                    </div>
                </div>
            </div>

            {/* 分布子菜单 */}
            <div className="context-menu-item context-menu-submenu" data-disabled={!canDistribute}>
                <span className="menu-icon">⋮⋮</span>
                <span className="menu-label">分布</span>
                <span className="menu-arrow">▸</span>
                <div className="context-submenu">
                    <div className="context-menu-item" onClick={() => handleDistribute('horizontal')}>
                        <span className="menu-label">水平均匀分布</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleDistribute('vertical')}>
                        <span className="menu-label">垂直均匀分布</span>
                    </div>
                </div>
            </div>

            {/* 尺寸子菜单 */}
            <div className="context-menu-item context-menu-submenu" data-disabled={!canAlign}>
                <span className="menu-icon">⬜</span>
                <span className="menu-label">尺寸</span>
                <span className="menu-arrow">▸</span>
                <div className="context-submenu">
                    <div className="context-menu-item" onClick={() => handleSameSize('width')}>
                        <span className="menu-label">相同宽度</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleSameSize('height')}>
                        <span className="menu-label">相同高度</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleSameSize('both')}>
                        <span className="menu-label">相同尺寸</span>
                    </div>
                </div>
            </div>

            {/* 层级子菜单 */}
            <div className="context-menu-item context-menu-submenu" data-disabled={!hasSelection}>
                <span className="menu-icon">◇</span>
                <span className="menu-label">层级</span>
                <span className="menu-arrow">▸</span>
                <div className="context-submenu">
                    <div className="context-menu-item" onClick={handleBringToFront}>
                        <span className="menu-label">置于顶层</span>
                    </div>
                    <div className="context-menu-item" onClick={handleMoveUp}>
                        <span className="menu-label">上移一层</span>
                    </div>
                    <div className="context-menu-item" onClick={handleMoveDown}>
                        <span className="menu-label">下移一层</span>
                    </div>
                    <div className="context-menu-item" onClick={handleSendToBack}>
                        <span className="menu-label">置于底层</span>
                    </div>
                </div>
            </div>

            <div className="context-menu-divider" />

            {/* 删除 */}
            <div className="context-menu-item delete" onClick={() => handleAction(onDeleteObjects)} data-disabled={!hasSelection}>
                <span className="menu-icon">🗑</span>
                <span className="menu-label">删除</span>
                <span className="menu-shortcut">Delete</span>
            </div>

            {/* 取消选择 */}
            <div className="context-menu-item" onClick={() => handleAction(onClearSelection)} data-disabled={!hasSelection}>
                <span className="menu-icon">✖</span>
                <span className="menu-label">取消选择</span>
                <span className="menu-shortcut">Esc</span>
            </div>
        </div>
    );
};

export default ContextMenu;
