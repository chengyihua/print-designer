import React, { useState, useEffect } from 'react';
import { PageSettings } from '../types/types';
import { pageSizePresets, marginPresets, orientationOptions } from '../types/constants';
import './PageSettingsPanel.css';

interface PageSettingsPanelProps {
    pageSettings: PageSettings;
    onSettingsChange: (settings: PageSettings) => void;
    onClose: () => void;
}

const PageSettingsPanel: React.FC<PageSettingsPanelProps> = ({
    pageSettings,
    onSettingsChange,
    onClose,
}) => {
    const [localSettings, setLocalSettings] = useState<PageSettings>({ ...pageSettings });
    const [marginPreset, setMarginPreset] = useState<string>('custom');

    // 检测当前边距是否匹配预设
    useEffect(() => {
        const { margins } = localSettings;
        for (const [key, preset] of Object.entries(marginPresets)) {
            if (key !== 'custom' && 
                margins.top === preset.top &&
                margins.bottom === preset.bottom &&
                margins.left === preset.left &&
                margins.right === preset.right) {
                setMarginPreset(key);
                return;
            }
        }
        setMarginPreset('custom');
    }, [localSettings]);

    // 处理纸张类型变更
    const handlePaperSizeChange = (paperSize: string) => {
        if (paperSize === 'Custom') {
            setLocalSettings(prev => ({
                ...prev,
                paperSize: 'Custom',
            }));
        } else {
            const preset = pageSizePresets[paperSize as keyof typeof pageSizePresets];
            if (preset) {
                setLocalSettings(prev => ({
                    ...prev,
                    paperSize: paperSize as PageSettings['paperSize'],
                    width: preset.width,
                    height: preset.height,
                    unit: preset.unit as 'mm' | 'in',
                }));
            }
        }
    };

    // 处理边距预设变更
    const handleMarginPresetChange = (presetKey: string) => {
        setMarginPreset(presetKey);
        if (presetKey !== 'custom') {
            const preset = marginPresets[presetKey as keyof typeof marginPresets];
            setLocalSettings(prev => ({
                ...prev,
                margins: {
                    top: preset.top,
                    bottom: preset.bottom,
                    left: preset.left,
                    right: preset.right,
                },
            }));
        }
    };

    // 处理单个边距变更
    const handleMarginChange = (side: keyof PageSettings['margins'], value: number) => {
        setLocalSettings(prev => ({
            ...prev,
            margins: {
                ...prev.margins,
                [side]: value,
            },
        }));
    };

    // 处理方向变更
    const handleOrientationChange = (orientation: 'portrait' | 'landscape') => {
        setLocalSettings(prev => ({
            ...prev,
            orientation,
        }));
    };

    // 处理自定义尺寸变更
    const handleDimensionChange = (dimension: 'width' | 'height', value: number) => {
        setLocalSettings(prev => ({
            ...prev,
            paperSize: 'Custom',
            [dimension]: value,
        }));
    };

    // 应用设置
    const handleApply = () => {
        onSettingsChange(localSettings);
        onClose();
    };

    // 取消
    const handleCancel = () => {
        onClose();
    };

    // 获取显示的尺寸（考虑方向）
    const getDisplayDimensions = () => {
        const { width, height, orientation } = localSettings;
        if (orientation === 'landscape') {
            return { displayWidth: height, displayHeight: width };
        }
        return { displayWidth: width, displayHeight: height };
    };

    const { displayWidth, displayHeight } = getDisplayDimensions();

    return (
        <div className="page-settings-overlay">
            <div className="page-settings-panel">
                <div className="page-settings-header">
                    <h3>页面设置</h3>
                    <button className="close-btn" onClick={handleCancel}>×</button>
                </div>

                <div className="page-settings-content">
                    {/* 纸张大小 */}
                    <div className="settings-section">
                        <label className="section-label">纸张大小</label>
                        <select 
                            value={localSettings.paperSize}
                            onChange={(e) => handlePaperSizeChange(e.target.value)}
                            className="settings-select"
                        >
                            {Object.entries(pageSizePresets).map(([key, preset]) => (
                                <option key={key} value={key}>{preset.name}</option>
                            ))}
                            <option value="Custom">自定义</option>
                        </select>
                    </div>

                    {/* 自定义尺寸 */}
                    <div className="settings-section dimensions-section">
                        <div className="dimension-row">
                            <label>宽度</label>
                            <input
                                type="number"
                                value={localSettings.width}
                                onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 0)}
                                disabled={localSettings.paperSize !== 'Custom'}
                                step="0.1"
                            />
                            <span className="unit">{localSettings.unit}</span>
                        </div>
                        <div className="dimension-row">
                            <label>高度</label>
                            <input
                                type="number"
                                value={localSettings.height}
                                onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 0)}
                                disabled={localSettings.paperSize !== 'Custom'}
                                step="0.1"
                            />
                            <span className="unit">{localSettings.unit}</span>
                        </div>
                    </div>

                    {/* 纸张方向 */}
                    <div className="settings-section">
                        <label className="section-label">纸张方向</label>
                        <div className="orientation-options">
                            {orientationOptions.map((option) => (
                                <label key={option.value} className="orientation-option">
                                    <input
                                        type="radio"
                                        name="orientation"
                                        value={option.value}
                                        checked={localSettings.orientation === option.value}
                                        onChange={() => handleOrientationChange(option.value as 'portrait' | 'landscape')}
                                    />
                                    <span className={`orientation-icon ${option.value}`}>
                                        <svg viewBox="0 0 24 32" width="24" height="32">
                                            {option.value === 'portrait' ? (
                                                <rect x="2" y="2" width="20" height="28" fill="none" stroke="currentColor" strokeWidth="2" rx="2"/>
                                            ) : (
                                                <rect x="2" y="6" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" rx="2"/>
                                            )}
                                        </svg>
                                    </span>
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 边距设置 */}
                    <div className="settings-section">
                        <label className="section-label">页边距</label>
                        <select 
                            value={marginPreset}
                            onChange={(e) => handleMarginPresetChange(e.target.value)}
                            className="settings-select"
                        >
                            {Object.entries(marginPresets).map(([key, preset]) => (
                                <option key={key} value={key}>{preset.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 边距详细设置 */}
                    <div className="settings-section margins-section">
                        <div className="margins-grid">
                            <div className="margin-input">
                                <label>上</label>
                                <input
                                    type="number"
                                    value={localSettings.margins.top}
                                    onChange={(e) => handleMarginChange('top', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="1"
                                />
                                <span className="unit">mm</span>
                            </div>
                            <div className="margin-input">
                                <label>下</label>
                                <input
                                    type="number"
                                    value={localSettings.margins.bottom}
                                    onChange={(e) => handleMarginChange('bottom', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="1"
                                />
                                <span className="unit">mm</span>
                            </div>
                            <div className="margin-input">
                                <label>左</label>
                                <input
                                    type="number"
                                    value={localSettings.margins.left}
                                    onChange={(e) => handleMarginChange('left', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="1"
                                />
                                <span className="unit">mm</span>
                            </div>
                            <div className="margin-input">
                                <label>右</label>
                                <input
                                    type="number"
                                    value={localSettings.margins.right}
                                    onChange={(e) => handleMarginChange('right', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="1"
                                />
                                <span className="unit">mm</span>
                            </div>
                        </div>
                    </div>

                    {/* 预览 */}
                    <div className="settings-section preview-section">
                        <label className="section-label">预览</label>
                        <div className="page-preview-container">
                            <div 
                                className="page-preview"
                                style={{
                                    aspectRatio: `${displayWidth} / ${displayHeight}`,
                                }}
                            >
                                <div 
                                    className="page-preview-content"
                                    style={{
                                        top: `${(localSettings.margins.top / displayHeight) * 100}%`,
                                        bottom: `${(localSettings.margins.bottom / displayHeight) * 100}%`,
                                        left: `${(localSettings.margins.left / displayWidth) * 100}%`,
                                        right: `${(localSettings.margins.right / displayWidth) * 100}%`,
                                    }}
                                />
                            </div>
                            <div className="page-preview-info">
                                {displayWidth.toFixed(1)} × {displayHeight.toFixed(1)} {localSettings.unit}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="page-settings-footer">
                    <button className="btn btn-cancel" onClick={handleCancel}>取消</button>
                    <button className="btn btn-apply" onClick={handleApply}>应用</button>
                </div>
            </div>
        </div>
    );
};

export default PageSettingsPanel;
