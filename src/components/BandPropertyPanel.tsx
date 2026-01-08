import React, { useState, useEffect, useRef } from 'react';
import { Band, ControlObject, ControlObjectAll, DataField } from './../types/types';
import { controlTypes } from '../types/constants';
import FormulaEditor from './FormulaEditor';
import ColorPicker from './ColorPicker';
import './BandPropertyPanel.css';

interface BandPropertyPanelProps {
    band: Band;
    dataFields: DataField[];
    onUpdate: (updates: Partial<Band>) => void;
    onSelectObject?: (objectId: string, bandId: string) => void;
    /** 点击控件列表时只聚焦，不选中 */
    onFocusObject?: (objectId: string, bandId: string) => void;
    selectedObjectIds?: string[];
    focusedObjectId?: string | null;
    onDeleteObject?: (objectId: string, bandId: string) => void;
}

// 获取控件类型图标（使用constants中的定义）
const getTypeIcon = (type: string) => {
    const config = controlTypes.find(ct => ct.id === type);
    return config?.icon || '●';
};

// 控件类型名称映射
const getTypeName = (type: string) => {
    switch (type) {
        case 'text': return '文本';
        case 'multiline_text': return '多行文本';
        case 'field': return '数据字段';
        case 'calculated': return '计算字段';
        case 'image': return '图片';
        case 'line': return '线条';
        case 'rectangle': return '矩形';
        case 'page_number': return '页码';
        case 'current_date': return '日期时间';
        default: return type;
    }
};

const BandPropertyPanel: React.FC<BandPropertyPanelProps> = ({
    band,
    dataFields,
    onUpdate,
    onSelectObject,
    onFocusObject,
    selectedObjectIds = [],
    focusedObjectId = null,
    onDeleteObject,
}) => {
    const [properties, setProperties] = useState<Partial<Band>>(band);
    const [showRowHeightFormulaEditor, setShowRowHeightFormulaEditor] = useState(false);
    const [showBgColorFormulaEditor, setShowBgColorFormulaEditor] = useState(false);
    
    // 拖动相关状态
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragRef = useRef<{ startIndex: number; currentIndex: number } | null>(null);

    // 是否是明细带或汇总带（支持公式设置）
    const supportsFormula = band.id === 'detail' || band.id === 'summary';

    useEffect(() => {
        setProperties(band);
    }, [band]);

    const handleChange = (key: keyof Band, value: any) => {
        const updated = { ...properties, [key]: value };
        setProperties(updated);
        onUpdate({ [key]: value });
    };

    const height = band.actualBottom - band.top;

    return (
        <div className="band-property-panel">
            <h3>{band.name} - 带区属性</h3>
            <div className="band-property-editor">
                <div className="band-property-group">
                    <h4>基本信息</h4>
                    <div className="band-property-row">
                        <label>类型:</label>
                        <span className="band-property-value">{band.type}</span>
                    </div>
                    <div className="band-property-row">
                        <label>高度:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => {
                                    const newHeight = parseInt(e.target.value) || 20;
                                    // 更新 actualBottom = band.top + newHeight
                                    onUpdate({ actualBottom: band.top + newHeight });
                                }}
                                min="20"
                                max="500"
                                style={{ width: '80px' }}
                            />
                            <span style={{ color: '#666', fontSize: '12px' }}>px</span>
                            {/* 明细带/汇总带支持行高公式 */}
                            {supportsFormula && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowRowHeightFormulaEditor(true)}
                                        style={{
                                            padding: '2px 6px',
                                            border: '1px solid #1890ff',
                                            borderRadius: '4px',
                                            background: band.rowHeightFormula ? '#1890ff' : 'white',
                                            color: band.rowHeightFormula ? 'white' : '#1890ff',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            flexShrink: 0
                                        }}
                                        title={band.rowHeightFormula || '设置行高公式'}
                                    >
                                        fx
                                    </button>
                                    {band.rowHeightFormula && (
                                        <button
                                            type="button"
                                            onClick={() => handleChange('rowHeightFormula', '')}
                                            style={{ padding: '2px 6px', fontSize: '12px', flexShrink: 0, border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                                            title="清除行高公式"
                                        >
                                            ×
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 背景色设置 */}
                <div className="band-property-group">
                    <h4>外观设置</h4>
                    <div className="band-property-row">
                        <label>背景色:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <ColorPicker
                                value={band.backgroundColor || ''}
                                onChange={(color) => handleChange('backgroundColor', color)}
                            />
                            {/* 明细带/汇总带支持背景色公式 */}
                            {supportsFormula && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowBgColorFormulaEditor(true)}
                                        style={{
                                            padding: '2px 6px',
                                            border: '1px solid #1890ff',
                                            borderRadius: '4px',
                                            background: band.backgroundColorFormula ? '#1890ff' : 'white',
                                            color: band.backgroundColorFormula ? 'white' : '#1890ff',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            flexShrink: 0
                                        }}
                                        title={band.backgroundColorFormula || '设置背景色公式'}
                                    >
                                        fx
                                    </button>
                                    {band.backgroundColorFormula && (
                                        <button
                                            type="button"
                                            onClick={() => handleChange('backgroundColorFormula', '')}
                                            style={{ padding: '2px 6px', fontSize: '12px', flexShrink: 0, border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                                            title="清除背景色公式"
                                        >
                                            ×
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 汇总带特有属性 */}
                {band.id === 'summary' && (
                    <div className="band-property-group">
                        <h4>汇总带设置</h4>
                        <div className="band-property-row">
                            <label>显示模式:</label>
                            <select
                                value={band.summaryDisplayMode || 'atEnd'}
                                onChange={(e) => handleChange('summaryDisplayMode', e.target.value)}
                            >
                                <option value="atEnd">在所有明细后显示</option>
                                <option value="perPage">每页底部显示</option>
                                <option value="perGroup">每组后显示</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="band-property-group control-list-group">
                    <h4>控件列表 ({band.objects.length})</h4>
                    <div className="object-list">
                        {band.objects.length === 0 ? (
                            <div style={{ padding: '8px', color: '#999', textAlign: 'center' }}>
                                无控件
                            </div>
                        ) : (
                            // 按zIndex倒序排序（层级高的在前面）
                            [...band.objects]
                                .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1))
                                .map((obj: ControlObject, index: number) => {
                                    const objKey = `${band.id}-${obj.id}`;
                                    const isSelected = selectedObjectIds.includes(objKey);
                                    const isFocused = focusedObjectId === objKey;
                                    const isDragging = draggedId === obj.id;
                                    const isDragOver = dragOverId === obj.id;
                                    // 检查是否完全超出带区范围
                                    let isOutOfBounds = false;
                                    let isAbove = false;
                                    
                                    if (obj.type === 'line') {
                                        const lineObj = obj as any;
                                        const minY = Math.min(lineObj.y1 ?? obj.y, lineObj.y2 ?? obj.y);
                                        const maxY = Math.max(lineObj.y1 ?? obj.y, lineObj.y2 ?? obj.y);
                                        isOutOfBounds = maxY <= band.top || minY >= band.actualBottom;
                                        isAbove = maxY <= band.top;
                                    } else {
                                        const objBottom = obj.y + obj.height;
                                        isOutOfBounds = objBottom <= band.top || obj.y >= band.actualBottom;
                                        isAbove = objBottom <= band.top;
                                    }

                                    return (
                                        <div
                                            key={obj.id}
                                            draggable
                                            onDragStart={(e) => {
                                                setDraggedId(obj.id);
                                                dragRef.current = { startIndex: index, currentIndex: index };
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                if (draggedId && draggedId !== obj.id) {
                                                    setDragOverId(obj.id);
                                                    if (dragRef.current) {
                                                        dragRef.current.currentIndex = index;
                                                    }
                                                }
                                            }}
                                            onDragLeave={() => {
                                                setDragOverId(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (draggedId && draggedId !== obj.id && dragRef.current) {
                                                    // 计算新的zIndex顺序
                                                    const sortedObjects = [...band.objects].sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));
                                                    const fromIndex = dragRef.current.startIndex;
                                                    const toIndex = index;
                                                    
                                                    // 重新分配zIndex
                                                    const [movedObj] = sortedObjects.splice(fromIndex, 1);
                                                    sortedObjects.splice(toIndex, 0, movedObj);
                                                    
                                                    // 从高到低分配zIndex
                                                    const maxZ = sortedObjects.length;
                                                    const updatedObjects = band.objects.map(o => {
                                                        const newIndex = sortedObjects.findIndex(so => so.id === o.id);
                                                        return { ...o, zIndex: maxZ - newIndex };
                                                    });
                                                    
                                                    onUpdate({ objects: updatedObjects });
                                                }
                                                setDraggedId(null);
                                                setDragOverId(null);
                                                dragRef.current = null;
                                            }}
                                            onDragEnd={() => {
                                                setDraggedId(null);
                                                setDragOverId(null);
                                                dragRef.current = null;
                                            }}
                                            onClick={() => onFocusObject?.(obj.id, band.id)}
                                            onDoubleClick={() => onSelectObject?.(obj.id, band.id)}
                                            title="拖动调整层级，单击聚焦，双击选中"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '6px 8px',
                                                cursor: 'grab',
                                                borderBottom: '1px solid #e8e8e8',
                                                backgroundColor: isDragging ? '#e6f7ff' : isDragOver ? '#f0f5ff' : isSelected ? '#e6f7ff' : isFocused ? '#f6ffed' : isOutOfBounds ? '#fff2f0' : 'transparent',
                                                opacity: isDragging ? 0.5 : 1,
                                                borderTop: isDragOver ? '2px solid #1890ff' : 'none',
                                                borderLeft: isFocused ? '3px solid #52c41a' : isSelected ? '3px solid #1890ff' : 'none',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected && !isFocused && !isOutOfBounds && !isDragging) e.currentTarget.style.backgroundColor = '#f5f5f5';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected && !isFocused && !isDragOver) e.currentTarget.style.backgroundColor = isOutOfBounds ? '#fff2f0' : 'transparent';
                                            }}
                                        >
                                            {/* 拖动手柄 */}
                                            <span style={{ marginRight: '6px', color: '#bbb', cursor: 'grab', fontSize: '12px' }}>≡</span>
                                            {/* 控件图标 */}
                                            <span style={{
                                                marginRight: '8px',
                                                fontSize: '14px',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#4d90fe',
                                                color: 'white',
                                                borderRadius: '4px',
                                                flexShrink: 0
                                            }}>
                                                {getTypeIcon(obj.type)}
                                            </span>
                                            {/* 控件名称 */}
                                            <span style={{
                                                flex: 1,
                                                fontSize: '12px',
                                                color: isOutOfBounds ? '#ff4d4f' : '#333',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {(obj as ControlObjectAll).text || (obj as ControlObjectAll).fieldName || obj.id}
                                            </span>
                                            {/* 层级标识 */}
                                            <span style={{
                                                fontSize: '10px',
                                                color: '#999',
                                                marginRight: '6px',
                                                backgroundColor: '#f0f0f0',
                                                padding: '1px 4px',
                                                borderRadius: '2px'
                                            }}>
                                                z:{obj.zIndex ?? 1}
                                            </span>
                                            {isOutOfBounds && (
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        color: '#ff4d4f',
                                                        marginRight: '4px',
                                                        padding: '1px 4px',
                                                        backgroundColor: '#fff2f0',
                                                        border: '1px solid #ffccc7',
                                                        borderRadius: '2px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="点击移回带区"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newY = band.top + 10;
                                                        const updatedObjects = band.objects.map(o => {
                                                            if (o.id !== obj.id) return o;
                                                            if (o.type === 'line') {
                                                                const lineObj = o as any;
                                                                const minY = Math.min(lineObj.y1 ?? o.y, lineObj.y2 ?? o.y);
                                                                const deltaY = newY - minY;
                                                                return {
                                                                    ...o,
                                                                    y: newY,
                                                                    y1: (lineObj.y1 ?? o.y) + deltaY,
                                                                    y2: (lineObj.y2 ?? o.y) + deltaY,
                                                                };
                                                            }
                                                            return { ...o, y: newY };
                                                        });
                                                        onUpdate({ objects: updatedObjects });
                                                    }}
                                                >
                                                    {isAbove ? '↑' : '↓'}
                                                </span>
                                            )}
                                            {/* 类型名称 */}
                                            <span style={{
                                                fontSize: '10px',
                                                color: '#999',
                                                marginRight: '6px'
                                            }}>
                                                {getTypeName(obj.type)}
                                            </span>
                                            {/* 删除按钮 */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onDeleteObject) {
                                                        onDeleteObject(obj.id, band.id);
                                                    } else {
                                                        // 直接从带区中删除
                                                        const updatedObjects = band.objects.filter(o => o.id !== obj.id);
                                                        onUpdate({ objects: updatedObjects });
                                                    }
                                                }}
                                                title="删除控件"
                                                style={{
                                                    padding: '2px 6px',
                                                    fontSize: '12px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: '#999',
                                                    cursor: 'pointer',
                                                    borderRadius: '2px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#ff4d4f';
                                                    e.currentTarget.style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = '#999';
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>

                {/* 行高公式编辑器弹窗 */}
                {showRowHeightFormulaEditor && (
                    <FormulaEditor
                    dataFields={dataFields}
                        value={band.rowHeightFormula || ''}
                        onConfirm={(formula) => {
                            handleChange('rowHeightFormula', formula);
                            setShowRowHeightFormulaEditor(false);
                        }}
                        onCancel={() => setShowRowHeightFormulaEditor(false)}
                    />
                )}

                {/* 背景色公式编辑器弹窗 */}
                {showBgColorFormulaEditor && (
                    <FormulaEditor
                    dataFields={dataFields}
                        value={band.backgroundColorFormula || ''}
                        onConfirm={(formula) => {
                            handleChange('backgroundColorFormula', formula);
                            setShowBgColorFormulaEditor(false);
                        }}
                        onCancel={() => setShowBgColorFormulaEditor(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default BandPropertyPanel;