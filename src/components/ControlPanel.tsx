import React from 'react';
import { DataField } from './../types/types';
import { controlTypes } from '../types/constants';

interface ControlPanelProps {
    dataFields: DataField[];
    selectedBand: string | null;
    onAddControl: (type: string, fieldName?: string) => void;
    onAddField: (fieldName: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    dataFields,
    selectedBand,
    onAddControl,
    onAddField,
}) => {
    const categories = ['basic', 'field', 'system', 'decorator'] as const;

    // 过滤掉“数据字段”控件，因为下方有单独的数据字段面板
    const filteredControlTypes = controlTypes.filter(ct => ct.id !== 'field');

    const handleAddControl = (type: string) => {
        if (!selectedBand) {
            alert('请先选择一个带区');
            return;
        }
        onAddControl(type);
    };

    const handleAddField = (fieldName: string) => {
        if (!selectedBand) {
            alert('请先选择一个带区');
            return;
        }
        onAddField(fieldName);
    };

    const categoryNames = {
        basic: '基本控件',
        field: '数据字段',
        system: '系统字段',
        decorator: '装饰控件',
    };

    return (
        <div className="control-panel">
            <h3>控件</h3>
            {categories.map(category => {
                const categoryControls = filteredControlTypes.filter(ct => ct.category === category);
                if (categoryControls.length === 0) return null;

                return (
                    <div key={category} className="control-group">
                        <h4>{categoryNames[category]}</h4>
                        <div className="control-list">
                            {categoryControls.map(control => (
                                <div
                                    key={control.id}
                                    className="control-item"
                                    onClick={() => handleAddControl(control.id)}
                                    title={control.name}
                                >
                                    <div className="control-icon">{control.icon}</div>
                                    <span>{control.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            <div className="data-fields-panel">
                <div className="panel-header">
                    <h4>数据字段</h4>
                </div>
                <div className="field-list">
                    {/* 主表字段 */}
                    <div className="field-group">
                        <div className="field-group-title">主表字段</div>
                        {dataFields.filter(f => f.source === 'master').map(field => (
                            <div
                                key={field.name}
                                className="field-item"
                                onClick={() => handleAddField(field.name)}
                                title={`${field.label} (${field.name})`}
                            >
                                {field.label}
                            </div>
                        ))}
                    </div>
                    {/* 明细字段 */}
                    <div className="field-group">
                        <div className="field-group-title">明细字段</div>
                        {dataFields.filter(f => f.source === 'detail').map(field => (
                            <div
                                key={field.name}
                                className="field-item detail-field"
                                onClick={() => handleAddField(field.name)}
                                title={`${field.label} (${field.name})`}
                            >
                                {field.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ControlPanel;