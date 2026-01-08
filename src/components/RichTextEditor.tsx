// RichTextEditor.tsx - 富文本编辑器组件
import React, { useRef, useCallback, useEffect } from 'react';
import './RichTextEditor.css';
import ColorPicker from './ColorPicker';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = '请输入内容...',
    minHeight = 120
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalChange = useRef(false);

    // 同步外部值到编辑器
    useEffect(() => {
        if (editorRef.current && !isInternalChange.current) {
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value || '';
            }
        }
        isInternalChange.current = false;
    }, [value]);

    // 处理内容变化
    const handleInput = useCallback(() => {
        if (editorRef.current) {
            isInternalChange.current = true;
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    // 执行格式化命令
    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    }, [handleInput]);

    // 工具栏按钮
    const toolbarButtons = [
        {
            command: 'bold',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M3 2h5.5c2.5 0 4 1.5 4 3.5 0 1.2-.6 2.2-1.6 2.8 1.4.5 2.4 1.7 2.4 3.2 0 2.2-1.7 3.5-4.2 3.5H3V2zm2.5 5h2.8c1 0 1.7-.6 1.7-1.5S9.3 4 8.3 4H5.5v3zm0 5h3.2c1.1 0 1.8-.6 1.8-1.6 0-1-.7-1.6-1.8-1.6H5.5v3.2z"/>
            </svg>,
            title: '加粗'
        },
        {
            command: 'italic',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M6 2h6v2h-2l-2 8h2v2H4v-2h2l2-8H6V2z"/>
            </svg>,
            title: '斜体'
        },
        {
            command: 'underline',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M3 13h10v2H3v-2zM8 2c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4s-4-1.8-4-4V6c0-2.2 1.8-4 4-4zm0 2c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
            </svg>,
            title: '下划线'
        },
        {
            command: 'strikeThrough',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M2 7h12v2H2V7z"/>
                <path fill="currentColor" d="M4 3h8v2H9v2H7V5H4V3zm4 8h2v3H8v-3z"/>
            </svg>,
            title: '删除线'
        },
        { type: 'separator' },
        {
            command: 'justifyLeft', icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <rect x="2" y="2" width="8" height="3" fill="currentColor" />
                <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                <rect x="2" y="12" width="10" height="2" fill="currentColor" />
            </svg>, title: '左对齐'
        },
        {
            command: 'justifyCenter', icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <rect x="4" y="2" width="8" height="3" fill="currentColor" />
                <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                <rect x="3" y="12" width="10" height="2" fill="currentColor" />
            </svg>, title: '居中'
        },
        {
            command: 'justifyRight', icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <rect x="6" y="2" width="8" height="3" fill="currentColor" />
                <rect x="2" y="7" width="12" height="3" fill="currentColor" />
                <rect x="4" y="12" width="10" height="2" fill="currentColor" />
            </svg>, title: '右对齐'
        },
        { type: 'separator' },
        {
            command: 'insertUnorderedList',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="3" cy="4" r="1.5" fill="currentColor" />
                <rect x="6" y="3" width="8" height="2" fill="currentColor" />
                <circle cx="3" cy="8" r="1.5" fill="currentColor" />
                <rect x="6" y="7" width="8" height="2" fill="currentColor" />
                <circle cx="3" cy="12" r="1.5" fill="currentColor" />
                <rect x="6" y="11" width="8" height="2" fill="currentColor" />
            </svg>,
            title: '无序列表'
        },
        {
            command: 'insertOrderedList',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <text x="1" y="5" fontSize="5" fill="currentColor" fontFamily="Arial">1.</text>
                <rect x="6" y="3" width="8" height="2" fill="currentColor" />
                <text x="1" y="9" fontSize="5" fill="currentColor" fontFamily="Arial">2.</text>
                <rect x="6" y="7" width="8" height="2" fill="currentColor" />
                <text x="1" y="13" fontSize="5" fill="currentColor" fontFamily="Arial">3.</text>
                <rect x="6" y="11" width="8" height="2" fill="currentColor" />
            </svg>,
            title: '有序列表'
        },
        { type: 'separator' },
        {
            command: 'removeFormat',
            icon: <svg width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M2 3h12v2H2V3z" />
                <path fill="currentColor" d="M7 5h2v8H7V5z" />
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M3 13l10-10" />
            </svg>,
            title: '清除格式'
        },
    ];

    // 字号选项
    const fontSizes = [
        { value: '1', label: '10px' },
        { value: '2', label: '12px' },
        { value: '3', label: '14px' },
        { value: '4', label: '16px' },
        { value: '5', label: '18px' },
        { value: '6', label: '24px' },
        { value: '7', label: '32px' },
    ];

    return (
        <div className="rich-text-editor">
            {/* 工具栏 */}
            <div className="rte-toolbar">
                {/* 字号 */}
                <select
                    className="rte-select"
                    onChange={(e) => execCommand('fontSize', e.target.value)}
                    defaultValue="3"
                    title="字号"
                >
                    {fontSizes.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                </select>

                {/* 文字颜色 */}
                <ColorPicker
                    value="#000000"
                    onChange={(color) => {
                        if (color) {
                            execCommand('foreColor', color);
                        }
                    }}
                />

                <span className="rte-separator" />

                {/* 格式按钮 */}
                {toolbarButtons.map((btn, idx) =>
                    btn.type === 'separator' ? (
                        <span key={idx} className="rte-separator" />
                    ) : (
                        <button
                            key={btn.command}
                            type="button"
                            className="rte-btn"
                            onClick={() => execCommand(btn.command!)}
                            title={btn.title}
                        >
                            {btn.icon}
                        </button>
                    )
                )}
            </div>

            {/* 编辑区域 */}
            <div
                ref={editorRef}
                className="rte-content"
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                style={{ minHeight }}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
};

export default RichTextEditor;
