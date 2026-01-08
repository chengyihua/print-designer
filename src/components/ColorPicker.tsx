// ColorPicker.tsx - 颜色选择组件
import React, { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';

interface ColorPickerProps {
    value?: string;
    onChange: (color: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

// 预设颜色
const presetColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF6600', '#FFCC00', '#FFFF00', '#99CC00', '#00CC00',
    '#00CCCC', '#0099FF', '#0066CC', '#0000FF', '#6600CC', '#CC00CC',
    '#FF99CC', '#FFCC99', '#FFFF99', '#CCFF99', '#99FFCC', '#99FFFF',
];

const ColorPicker: React.FC<ColorPickerProps> = ({
    value,
    onChange,
    disabled = false,
    placeholder = '选择颜色'
}) => {
    const [showPanel, setShowPanel] = useState(false);
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭面板
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowPanel(false);
            }
        };
        if (showPanel) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPanel]);

    // 计算面板位置
    useEffect(() => {
        if (showPanel && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const panelWidth = 206; // 面板宽度
            const panelHeight = 240; // 面板高度
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let left = 0;
            let top: number | 'auto' = '100%' as any;
            let bottom: number | 'auto' = 'auto';
            
            // 检查右边界
            if (rect.left + panelWidth > viewportWidth) {
                left = viewportWidth - rect.left - panelWidth - 8;
            }
            
            // 检查下边界，如果下方空间不足则向上弹出
            if (rect.bottom + panelHeight > viewportHeight) {
                top = 'auto';
                bottom = rect.height + 4;
            }
            
            setPanelStyle({
                left: left !== 0 ? left : undefined,
                top: top === 'auto' ? 'auto' : undefined,
                bottom: bottom !== 'auto' ? bottom : undefined,
            });
        }
    }, [showPanel]);

    // 处理颜色选择
    const handleColorSelect = (color: string) => {
        onChange(color);
        setShowPanel(false);
    };

    // 清除颜色
    const handleClear = () => {
        onChange('');
        setShowPanel(false);
    };

    // 打开系统颜色选择器
    const openColorPicker = () => {
        setShowPanel(false); // 先关闭面板
        setTimeout(() => {
            colorInputRef.current?.click();
        }, 50);
    };

    // 当前显示的颜色
    const displayColor = value || '';
    const hasColor = displayColor && displayColor !== 'transparent';

    return (
        <div className={`color-picker ${disabled ? 'disabled' : ''}`} ref={containerRef}>
            {/* 颜色预览按钮 */}
            <div
                className="color-preview-btn"
                onClick={() => !disabled && setShowPanel(!showPanel)}
                title={hasColor ? displayColor : placeholder}
            >
                <div
                    className="color-swatch"
                    style={{
                        backgroundColor: hasColor ? displayColor : 'transparent',
                    }}
                >
                    {!hasColor && <span className="no-color-icon">∅</span>}
                </div>
                <span className="dropdown-arrow">
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path fill="currentColor" d="M3 5l5 6 5-6z"/>
                    </svg>
                </span>
            </div>

            {/* 隐藏的原生颜色选择器 */}
            <input
                ref={colorInputRef}
                type="color"
                value={hasColor ? displayColor : '#000000'}
                onChange={(e) => handleColorSelect(e.target.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />

            {/* 颜色选择面板 */}
            {showPanel && !disabled && (
                <div className="color-panel" ref={panelRef} style={panelStyle}>
                    <div className="preset-colors">
                        {/* 清除颜色按钮 */}
                        <div
                            className="color-item clear-color"
                            onClick={handleClear}
                            title="清除颜色"
                        >
                            <span className="clear-icon">∅</span>
                        </div>
                        {/* 预设颜色 */}
                        {presetColors.map((color) => (
                            <div
                                key={color}
                                className={`color-item ${displayColor.toUpperCase() === color ? 'active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => handleColorSelect(color)}
                                title={color}
                            />
                        ))}
                    </div>
                    {/* 自定义颜色 */}
                    <div className="custom-color-row">
                        <button
                            type="button"
                            className="btn-custom-color"
                            onClick={openColorPicker}
                        >
                            自定义颜色...
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
