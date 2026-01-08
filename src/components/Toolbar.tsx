import React from 'react';

interface ToolbarProps {
    onSave: () => void;
    onPreview?: () => void;
    onLoadSample: () => void;
    onClearDesign: () => void;
    showGrid: boolean;
    showBands: boolean;
    showRulers: boolean;
    showPageMargins: boolean;
    onToggleGrid: (checked: boolean) => void;
    onToggleBands: (checked: boolean) => void;
    onToggleRulers: () => void;
    onTogglePageMargins: () => void;
    onHandlePreview: () => void;

}

const Toolbar: React.FC<ToolbarProps> = ({
    onSave,
    onPreview,
    onLoadSample,
    onClearDesign,
    showGrid,
    showBands,
    showRulers,
    showPageMargins,
    onToggleGrid,
    onToggleBands,
    onToggleRulers,
    onTogglePageMargins,
    onHandlePreview
}) => {
    return (
        <div className="toolbar">
            <div className="toolbar-left">
                <button className="btn btn-primary" onClick={onSave}>
                    保存设计
                </button>
                <button className="btn" onClick={onLoadSample}>
                    加载示例
                </button>
                <button className="btn" onClick={onClearDesign}>
                    清空设计
                </button>
                <button className="btn" onClick={onPreview}>
                    预览
                </button>
                <button className="btn" onClick={onHandlePreview}>
                    打印预览
                </button>
            </div>

            <div className="toolbar-right">
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => onToggleGrid(e.target.checked)}
                    />
                    显示网格
                </label>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showBands}
                        onChange={(e) => onToggleBands(e.target.checked)}
                    />
                    显示带区
                </label>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showRulers}
                        onChange={onToggleRulers}
                    />
                    显示标尺
                </label>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showPageMargins}
                        onChange={onTogglePageMargins}
                    />
                    显示边距
                </label>
            </div>
        </div>
    );
};

export default Toolbar;