import React, { useState, useEffect, useCallback } from 'react';
import {
    ControlObject,
    ControlObjectAll,
    Band,
    BorderStyle,
    isTextStyleControl,
    isContainerStyleControl,
    hasBorderControl,
    DataField,
} from './../types/types';
import {
    textVerticalAlignOptions,
    dateFormatOptions,
    formatTypeOptions,
    imageObjectFitOptions,
    barcodeTypeOptions,
    qrcodeErrorLevelOptions,
    lineStyleOptions,
    borderStyles,
    fontWeightOptions,
    fontStyleOptions,
    controlTypes,
} from '../types/constants';
import FormulaEditor from './FormulaEditor';
import ColorPicker from './ColorPicker';
import RichTextEditor from './RichTextEditor';
import './ObjectPropertyPanel.css';

interface ObjectPropertyPanelProps {
    object: ControlObject;
    bandId: string;
    dataFields: DataField[];
    onUpdateBands: (updater: (prevBands: Band[]) => Band[]) => void;
    onClearSelection: () => void;
}

// 控件类型名称和图标映射（从 controlTypes 生成）
const controlTypeInfo: Record<string, { name: string; icon: string }> = controlTypes.reduce((acc, ct) => {
    acc[ct.id] = { name: ct.name, icon: ct.icon };
    return acc;
}, {} as Record<string, { name: string; icon: string }>);



const ObjectPropertyPanel: React.FC<ObjectPropertyPanelProps> = ({
    object,
    bandId,
    dataFields,
    onUpdateBands,
    onClearSelection,
}) => {
    const [properties, setProperties] = useState<Partial<ControlObjectAll>>(object as ControlObjectAll);
    const [showFormulaEditor, setShowFormulaEditor] = useState(false);
    // 折叠状态管理
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setProperties(object as ControlObjectAll);
    }, [object]);

    // 切换分组折叠状态
    const toggleGroup = useCallback((groupId: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    }, []);

    const handleChange = (key: keyof ControlObjectAll, value: any) => {
        const updated = { ...properties, [key]: value };
        setProperties(updated);

        onUpdateBands(prevBands => prevBands.map(band => {
            if (band.id !== bandId) return band;
            return {
                ...band,
                objects: band.objects.map(obj =>
                    obj.id === object.id ? { ...obj, [key]: value } : obj
                )
            };
        }));
    };

    const handleBorderChange = (borderKey: keyof BorderStyle, value: any) => {
        const updatedBorder = {
            ...properties.border,
            [borderKey]: value
        };
        const updated = { ...properties, border: updatedBorder };
        setProperties(updated);

        onUpdateBands(prevBands => prevBands.map(band => {
            if (band.id !== bandId) return band;
            return {
                ...band,
                objects: band.objects.map(obj =>
                    obj.id === object.id ? { ...obj, border: updatedBorder } : obj
                )
            };
        }));
    };

    const getBorderValue = (key: keyof BorderStyle): any => {
        return properties.border?.[key] || '';
    };

    const handleDelete = () => {
        if (window.confirm('确定要删除这个对象吗？')) {
            onUpdateBands(prevBands => prevBands.map(band => {
                if (band.id !== bandId) return band;
                return {
                    ...band,
                    objects: band.objects.filter(obj => obj.id !== object.id)
                };
            }));
            onClearSelection();
        }
    };

    // 使用类型守卫判断属性分组
    const showTextStyle = isTextStyleControl(object);
    const showContainerStyle = isContainerStyleControl(object);
    const showBorder = hasBorderControl(object);

    // 渲染颜色输入组件
    const renderColorInput = (
        label: string,
        value: string | undefined,
        defaultValue: string,
        onChange: (value: string) => void
    ) => (
        <div className="property-row">
            <label>{label}:</label>
            <ColorPicker
                value={value || ''}
                onChange={onChange}
            />
        </div>
    );

    // 渲染可折叠的属性分组
    const renderPropertyGroup = (
        groupId: string,
        title: string,
        children: React.ReactNode
    ) => (
        <div className="property-group">
            <div
                className="property-group-header"
                onClick={() => toggleGroup(groupId)}
            >
                <h4>{title}</h4>
                <span className={`collapse-icon ${collapsedGroups[groupId] ? 'collapsed' : ''}`}>
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path fill="currentColor" d="M3 5l5 6 5-6z" />
                    </svg>
                </span>
            </div>
            <div className={`property-group-content ${collapsedGroups[groupId] ? 'collapsed' : ''}`}>
                {children}
            </div>
        </div>
    );

    // 获取控件类型信息
    const typeInfo = controlTypeInfo[object.type] || { name: object.type, icon: '?' };

    return (
        <div className="property-panel">
            {/* 面板头部 */}
            <div className="property-panel-header">
                <div className="type-icon">{typeInfo.icon}</div>
                <div className="type-info">
                    <div className="type-name">{typeInfo.name}</div>
                    <div className="type-id">ID: {object.id}</div>
                </div>
            </div>

            <div className="property-editor">
                {/* ==================== 基础属性（所有控件） ==================== */}
                {renderPropertyGroup('basic', '基础属性', <>
                    {/* 线条显示x1y1x2y2，其他控件显示位置XY */}
                    {object.type === 'line' ? (
                        <>
                            <div className="property-row">
                                <label>起点 X:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.x1 ?? properties.x ?? 0)}
                                    onChange={(e) => handleChange('x1', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="property-row">
                                <label>起点 Y:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.y1 ?? properties.y ?? 0)}
                                    onChange={(e) => handleChange('y1', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="property-row">
                                <label>终点 X:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.x2 ?? ((properties.x || 0) + (properties.width || 200)))}
                                    onChange={(e) => handleChange('x2', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="property-row">
                                <label>终点 Y:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.y2 ?? properties.y ?? 0)}
                                    onChange={(e) => handleChange('y2', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="property-row">
                                <label>位置 X:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.x || 0)}
                                    onChange={(e) => handleChange('x', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="property-row">
                                <label>位置 Y:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.y || 0)}
                                    onChange={(e) => handleChange('y', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </>
                    )}
                    {/* 线条不显示宽高，只显示粗细 */}
                    {object.type !== 'line' && (
                        <>
                            <div className="property-row">
                                <label>宽度:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.width || 0)}
                                    onChange={(e) => handleChange('width', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="property-row">
                                <label>高度:</label>
                                <input
                                    type="number"
                                    value={Math.round(properties.height || 0)}
                                    onChange={(e) => handleChange('height', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </>
                    )}
                    <div className="property-row">
                        <label>层级:</label>
                        <input
                            type="number"
                            value={properties.zIndex ?? 1}
                            onChange={(e) => handleChange('zIndex', parseInt(e.target.value) || 1)}
                            min={1}
                        />
                    </div>
                    <div className="property-row">
                        <label>打印可见:</label>
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                checked={properties.printVisible !== false}
                                onChange={(e) => handleChange('printVisible', e.target.checked)}
                            />
                            <span className="checkbox-label">
                                {(properties.printVisible !== false) ? '打印时显示' : '打印时隐藏'}
                            </span>
                        </div>
                    </div>
                </>)}

                {/* ==================== 文本内容（text, page_number, current_date） ==================== */}
                {object.type === 'text' && renderPropertyGroup('textContent', '文本内容', <>
                    <div className="property-row">
                        <label>内容:</label>
                        <input
                            type="text"
                            value={properties.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="请输入文本内容"
                        />
                    </div>
                </>)}

                {/* ==================== 多行文本内容（富文本编辑器） ==================== */}
                {object.type === 'multiline_text' && renderPropertyGroup('multilineContent', '富文本内容', <>
                    <div className="property-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <RichTextEditor
                            value={properties.text || ''}
                            onChange={(html) => handleChange('text', html)}
                            placeholder="请输入富文本内容..."
                            minHeight={150}
                        />
                    </div>
                </>)}

                {object.type === 'page_number' && renderPropertyGroup('pageNumberFormat', '页码格式', <>
                    <div className="property-row">
                        <label>格式:</label>
                        <input
                            type="text"
                            value={properties.text || '第 {page} 页 / 共 {total} 页'}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="第 {page} 页 / 共 {total} 页"
                        />
                    </div>
                </>)}

                {object.type === 'current_date' && renderPropertyGroup('dateFormat', '日期时间格式', <>
                    <div className="property-row">
                        <label>格式:</label>
                        <select
                            value={properties.text || 'yyyy-MM-dd'}
                            onChange={(e) => handleChange('text', e.target.value)}
                        >
                            {dateFormatOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </>)}

                {/* ==================== 数据字段属性（field） ==================== */}
                {object.type === 'field' && renderPropertyGroup('fieldData', '数据字段', <>
                    <div className="property-row">
                        <label>字段名:</label>
                        <input
                            type="text"
                            value={properties.fieldName || ''}
                            readOnly
                            disabled
                            title="数据字段名不可修改"
                        />
                    </div>
                    <div className="property-row">
                        <label>默认文本:</label>
                        <input
                            type="text"
                            value={properties.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="无数据时显示的文本"
                        />
                    </div>
                    <div className="property-row">
                        <label>格式化:</label>
                        <select
                            value={properties.formatType || 'text'}
                            onChange={(e) => handleChange('formatType', e.target.value)}
                        >
                            {formatTypeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {(properties.formatType === 'number' || properties.formatType === 'currency' || properties.formatType === 'percent') && (
                        <div className="property-row">
                            <label>小数位:</label>
                            <input
                                type="number"
                                value={properties.decimalPlaces ?? 2}
                                onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value) || 0)}
                                min={0}
                                max={10}
                            />
                        </div>
                    )}
                </>)}

                {/* ==================== 计算字段属性（calculated） ==================== */}
                {object.type === 'calculated' && renderPropertyGroup('calculatedField', '计算字段', <>
                    <div className="property-row">
                        <label>计算公式:</label>
                        <div className="formula-input-wrapper">
                            <input
                                type="text"
                                value={properties.formula || ''}
                                readOnly
                                placeholder="点击编辑按钮设置公式"
                                title={properties.formula || '未设置公式'}
                            />
                            <button
                                type="button"
                                className="btn-edit-formula"
                                onClick={() => setShowFormulaEditor(true)}
                            >
                                编辑
                            </button>
                        </div>
                    </div>
                    <div className="property-row">
                        <label>默认文本:</label>
                        <input
                            type="text"
                            value={properties.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="计算失败时显示的文本"
                        />
                    </div>
                    <div className="property-row">
                        <label>格式化:</label>
                        <select
                            value={properties.formatType || 'number'}
                            onChange={(e) => handleChange('formatType', e.target.value)}
                        >
                            {formatTypeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {(properties.formatType === 'number' || properties.formatType === 'currency' || properties.formatType === 'percent' || !properties.formatType) && (
                        <div className="property-row">
                            <label>小数位:</label>
                            <input
                                type="number"
                                value={properties.decimalPlaces ?? 2}
                                onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value) || 0)}
                                min={0}
                                max={10}
                            />
                        </div>
                    )}
                </>)}

                {/* 公式编辑器弹窗 */}
                {showFormulaEditor && (
                    <FormulaEditor
                        dataFields={dataFields}
                        value={properties.formula || ''}
                        onConfirm={(formula) => {
                            handleChange('formula', formula);
                            setShowFormulaEditor(false);
                        }}
                        onCancel={() => setShowFormulaEditor(false)}
                    />
                )}

                {/* ==================== 字段绑定属性（barcode） ==================== */}
                {object.type === 'barcode' && renderPropertyGroup('barcodeBinding', '字段绑定', <>
                    <div className="property-row">
                        <label>绑定字段:</label>
                        <select
                            value={properties.fieldName || ''}
                            onChange={(e) => handleChange('fieldName', e.target.value)}
                        >
                            <option value="">不绑定（使用静态内容）</option>
                            <optgroup label="主表字段">
                                {dataFields.filter(f => f.source === 'master').map(f => (
                                    <option key={f.name} value={f.name}>{f.label}</option>
                                ))}
                            </optgroup>
                            <optgroup label="明细字段">
                                {dataFields.filter(f => f.source === 'detail').map(f => (
                                    <option key={f.name} value={f.name}>{f.label}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </>)}


                {/* ==================== 图片特有属性 ==================== */}
                {object.type === 'image' && renderPropertyGroup('imageSettings', '图片设置', <>
                    <div className="property-row">
                        <label>本地图片:</label>
                        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                id={`image-upload-${object.id}`}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const base64 = event.target?.result as string;
                                            handleChange('src', base64);
                                            handleChange('imageUrl', base64);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <label
                                htmlFor={`image-upload-${object.id}`}
                                style={{
                                    padding: '4px 12px',
                                    border: '1px solid #1890ff',
                                    borderRadius: '4px',
                                    background: '#1890ff',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                选择图片
                            </label>
                            {(properties.src || properties.imageUrl) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleChange('src', '');
                                        handleChange('imageUrl', '');
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        border: '1px solid #ff4d4f',
                                        borderRadius: '4px',
                                        background: '#fff',
                                        color: '#ff4d4f',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    清除
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="property-row">
                        <label>图片地址:</label>
                        <input
                            type="text"
                            value={(properties.src || properties.imageUrl || '').slice(0, 50) + ((properties.src || properties.imageUrl || '').length > 50 ? '...' : '')}
                            onChange={(e) => {
                                handleChange('src', e.target.value);
                                handleChange('imageUrl', e.target.value);
                            }}
                            placeholder="输入URL或选择本地图片"
                            title={properties.src || properties.imageUrl || ''}
                        />
                    </div>
                    {(properties.src || properties.imageUrl) && (
                        <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <label>预览:</label>
                            <div style={{
                                width: '100%',
                                height: '80px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f5f5f5',
                            }}>
                                <img
                                    src={properties.src || properties.imageUrl}
                                    alt="预览"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    <div className="property-row">
                        <label>替代文本:</label>
                        <input
                            type="text"
                            value={properties.alt || ''}
                            onChange={(e) => handleChange('alt', e.target.value)}
                            placeholder="图片加载失败时显示"
                        />
                    </div>
                    <div className="property-row">
                        <label>显示方式:</label>
                        <select
                            value={properties.objectFit || 'contain'}
                            onChange={(e) => handleChange('objectFit', e.target.value)}
                        >
                            {imageObjectFitOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="property-row">
                        <label>内边距:</label>
                        <div className="padding-inputs">
                            <div className="padding-input-item">
                                <span className="padding-label">上</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.top ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, top: val });
                                        } else {
                                            handleChange('padding', { top: val, right: val, bottom: val, left: val });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="padding-input-item">
                                <span className="padding-label">右</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.right ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, right: val });
                                        } else {
                                            handleChange('padding', { top: properties.padding || 0, right: val, bottom: properties.padding || 0, left: properties.padding || 0 });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="padding-input-item">
                                <span className="padding-label">下</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.bottom ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, bottom: val });
                                        } else {
                                            handleChange('padding', { top: properties.padding || 0, right: properties.padding || 0, bottom: val, left: properties.padding || 0 });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="padding-input-item">
                                <span className="padding-label">左</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.left ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, left: val });
                                        } else {
                                            handleChange('padding', { top: properties.padding || 0, right: properties.padding || 0, bottom: properties.padding || 0, left: val });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="property-row">
                        <label>浮动图片:</label>
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                checked={properties.floating === true}
                                onChange={(e) => handleChange('floating', e.target.checked)}
                            />
                            <span className="checkbox-label">
                                {(properties.floating) ? '以页面为基准定位' : '以带区为基准定位'}
                            </span>
                        </div>
                    </div>
                </>)}

                {/* ==================== 条码特有属性 ==================== */}
                {object.type === 'barcode' && renderPropertyGroup('barcodeSettings', '条码设置', <>
                    <div className="property-row">
                        <label>条码内容:</label>
                        <input
                            type="text"
                            value={properties.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="输入条码内容"
                        />
                    </div>
                    <div className="property-row">
                        <label>条码类型:</label>
                        <select
                            value={properties.barcodeType || 'CODE128'}
                            onChange={(e) => handleChange('barcodeType', e.target.value)}
                        >
                            {barcodeTypeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="property-row">
                        <label>显示文字:</label>
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                checked={properties.showText !== false}
                                onChange={(e) => handleChange('showText', e.target.checked)}
                            />
                            <span className="checkbox-label">
                                {properties.showText !== false ? '显示' : '隐藏'}
                            </span>
                        </div>
                    </div>
                    {renderColorInput('条码颜色', properties.lineColor, '#000000', (v) => handleChange('lineColor', v))}
                    {renderColorInput('背景色', properties.background, '#FFFFFF', (v) => handleChange('background', v))}
                </>)}

                {/* ==================== 二维码特有属性 ==================== */}
                {object.type === 'qrcode' && renderPropertyGroup('qrcodeSettings', '二维码设置', <>
                    <div className="property-row">
                        <label>二维码内容:</label>
                        <input
                            type="text"
                            value={properties.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="输入二维码内容"
                        />
                    </div>
                    <div className="property-row">
                        <label>容错级别:</label>
                        <select
                            value={properties.errorLevel || 'M'}
                            onChange={(e) => handleChange('errorLevel', e.target.value)}
                        >
                            {qrcodeErrorLevelOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {renderColorInput('前景色', properties.foreground, '#000000', (v) => handleChange('foreground', v))}
                    {renderColorInput('背景色', properties.background, '#FFFFFF', (v) => handleChange('background', v))}
                </>)}

                {/* ==================== 线条特有属性 ==================== */}
                {object.type === 'line' && renderPropertyGroup('lineStyle', '线条样式', <>
                    <div className="property-row">
                        <label>粗细:</label>
                        <input
                            type="number"
                            value={properties.strokeWidth || 1}
                            onChange={(e) => handleChange('strokeWidth', Math.max(1, parseInt(e.target.value) || 1))}
                            min={1}
                            max={20}
                        />
                    </div>
                    <div className="property-row">
                        <label>线段样式:</label>
                        <select
                            value={properties.lineStyle || 'solid'}
                            onChange={(e) => handleChange('lineStyle', e.target.value)}
                        >
                            {lineStyleOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {renderColorInput('线条颜色', properties.color, '#000000', (v) => handleChange('color', v))}
                </>)}

                {/* ==================== 文本样式属性（text, field, page_number, current_date） ==================== */}
                {showTextStyle && renderPropertyGroup('textStyle', '外观样式', <>
                    <div className="property-row">
                        <label>字体大小:</label>
                        <input
                            type="number"
                            value={properties.fontSize || 12}
                            onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 12)}
                            min={8}
                            max={72}
                        />
                    </div>
                    {renderColorInput('文字颜色', properties.color, '#000000', (v) => handleChange('color', v))}
                    {renderColorInput('背景色', properties.background, '#ffffff', (v) => handleChange('background', v))}
                    <div className="property-row">
                        <label>字体粗细:</label>
                        <select
                            value={properties.fontWeight || 'normal'}
                            onChange={(e) => handleChange('fontWeight', e.target.value)}
                        >
                            {fontWeightOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="property-row">
                        <label>字体样式:</label>
                        <select
                            value={properties.fontStyle || 'normal'}
                            onChange={(e) => handleChange('fontStyle', e.target.value)}
                        >
                            {fontStyleOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="property-row">
                        <label>行高:</label>
                        <input
                            type="number"
                            value={properties.lineHeight || 1.2}
                            onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value) || 1.2)}
                            step={0.1}
                            min={0.5}
                            max={3}
                        />
                    </div>
                </>)}

                {/* ==================== 文本对齐属性（文本类控件） ==================== */}
                {showTextStyle && renderPropertyGroup('alignment', '对齐方式', <>
                    <div className="property-row">
                        <label>水平对齐:</label>
                        <div className="alignment-buttons">
                            <button
                                type="button"
                                className={`alignment-btn ${properties.textAlign === 'left' || !properties.textAlign ? 'active' : ''}`}
                                onClick={() => handleChange('textAlign', 'left')}
                                title="左对齐"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <rect x="2" y="2" width="8" height="3" fill="currentColor" />
                                    <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                                    <rect x="2" y="12" width="10" height="2" fill="currentColor" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className={`alignment-btn ${properties.textAlign === 'center' ? 'active' : ''}`}
                                onClick={() => handleChange('textAlign', 'center')}
                                title="居中对齐"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <rect x="4" y="2" width="8" height="3" fill="currentColor" />
                                    <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                                    <rect x="3" y="12" width="10" height="2" fill="currentColor" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className={`alignment-btn ${properties.textAlign === 'right' ? 'active' : ''}`}
                                onClick={() => handleChange('textAlign', 'right')}
                                title="右对齐"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <rect x="6" y="2" width="8" height="3" fill="currentColor" />
                                    <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                                    <rect x="4" y="12" width="10" height="2" fill="currentColor" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="property-row">
                        <label>垂直对齐:</label>
                        <select
                            value={properties.textVerticalAlign || 'top'}
                            onChange={(e) => handleChange('textVerticalAlign', e.target.value as 'top' | 'middle' | 'bottom')}
                        >
                            {textVerticalAlignOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </>)}

                {/* ==================== 容器样式属性（仅矩形、椰圆等形状控件，文本类已在外观样式中处理） ==================== */}
                {showContainerStyle && !showTextStyle && renderPropertyGroup('background', '外观样式', <>
                    {renderColorInput('背景色', properties.background, '#ffffff', (v) => handleChange('background', v))}
                </>)}

                {/* ==================== 边框属性（支持边框的控件，线条除外） ==================== */}
                {showBorder && object.type !== 'line' && renderPropertyGroup('border', '边框边距', <>
                    <div className="property-row">
                        <label>边框宽度:</label>
                        <input
                            type="number"
                            value={getBorderValue('width') || 0}
                            onChange={(e) => handleBorderChange('width', parseInt(e.target.value) || 0)}
                            min={0}
                            max={10}
                        />
                    </div>
                    <div className="property-row">
                        <label>边框样式:</label>
                        <select
                            value={getBorderValue('style') || 'solid'}
                            onChange={(e) => handleBorderChange('style', e.target.value)}
                        >
                            {borderStyles.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="property-row">
                        <label>边框颜色:</label>
                        <ColorPicker
                            value={getBorderValue('color') || ''}
                            onChange={(color) => handleBorderChange('color', color)}
                        />
                    </div>
                    <div className="property-row">
                        <label>内边距:</label>
                        <div className="padding-inputs">
                            <div className="padding-input-item">
                                <span className="padding-label">上</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.top ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, top: val });
                                        } else {
                                            handleChange('padding', { top: val, right: val, bottom: val, left: val });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="padding-input-item">
                                <span className="padding-label">右</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.right ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, right: val });
                                        } else {
                                            handleChange('padding', { top: properties.padding || 0, right: val, bottom: properties.padding || 0, left: properties.padding || 0 });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="padding-input-item">
                                <span className="padding-label">下</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.bottom ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, bottom: val });
                                        } else {
                                            handleChange('padding', { top: properties.padding || 0, right: properties.padding || 0, bottom: val, left: properties.padding || 0 });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="padding-input-item">
                                <span className="padding-label">左</span>
                                <input
                                    type="number"
                                    value={typeof properties.padding === 'object' ? (properties.padding?.left ?? 0) : (properties.padding || 0)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (typeof properties.padding === 'object') {
                                            handleChange('padding', { ...properties.padding, left: val });
                                        } else {
                                            handleChange('padding', { top: properties.padding || 0, right: properties.padding || 0, bottom: properties.padding || 0, left: val });
                                        }
                                    }}
                                    min={0}
                                    max={50}
                                />
                            </div>
                        </div>
                    </div>
                </>)}

                {/* ==================== 矩形专属属性（圆角、阴影） ==================== */}
                {object.type === 'rectangle' && renderPropertyGroup('rectangleStyle', '矩形样式', <>
                    <div className="property-row">
                        <label>圆角:</label>
                        <input
                            type="number"
                            value={properties.borderRadius || 0}
                            onChange={(e) => handleChange('borderRadius', parseInt(e.target.value) || 0)}
                            min={0}
                            max={100}
                        />
                    </div>
                </>)}

                {/* ==================== 删除操作 ==================== */}
                <div className="property-actions">
                    <button className="btn btn-danger" onClick={handleDelete}>
                        删除对象
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ObjectPropertyPanel;
