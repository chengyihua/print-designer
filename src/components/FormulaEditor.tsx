import React, { useState, useCallback, useRef } from 'react';
import { validateFormula as validateFormulaUtil, validateFormulaWithExecution } from '../utils/formulaUtils';
import { DataField } from '../types/types';

interface FormulaEditorProps {
    dataFields: DataField[];  
    value: string;
    onConfirm: (formula: string) => void;
    onCancel: () => void;
}

// 系统变量
const systemVariables = [
    { name: 'currentDate', label: '当前日期', category: 'system' },
    { name: 'currentTime', label: '当前时间', category: 'system' },
    { name: 'pageNumber', label: '当前页码', category: 'system' },
    { name: 'totalPages', label: '总页数', category: 'system' },
    { name: 'rowIndex', label: '行号', category: 'system' },
];

// 运算符
const operators = [
    { symbol: '+', label: '加' },
    { symbol: '-', label: '减' },
    { symbol: '*', label: '乘' },
    { symbol: '/', label: '除' },
    { symbol: '(', label: '左括号' },
    { symbol: ')', label: '右括号' },
];

// 函数分类
const functionCategories = [
    {
        name: 'aggregate',
        label: '聚合函数',
        functions: [
            { name: 'COUNT', syntax: 'COUNT(*)', desc: '统计所有记录数', example: 'COUNT(*)' },
            { name: 'PAGECOUNT', syntax: 'PAGECOUNT(*)', desc: '统计当前页记录数', example: 'PAGECOUNT(*)' },
            { name: 'SUM', syntax: 'SUM({field})', desc: '所有记录求和', example: 'SUM({products.amount})' },
            { name: 'PAGESUM', syntax: 'PAGESUM({field})', desc: '当前页求和', example: 'PAGESUM({products.amount})' },
            { name: 'AVG', syntax: 'AVG({field})', desc: '所有记录平均值', example: 'AVG({products.price})' },
            { name: 'PAGEAVG', syntax: 'PAGEAVG({field})', desc: '当前页平均值', example: 'PAGEAVG({products.price})' },
            { name: 'MAX', syntax: 'MAX({field})', desc: '所有记录最大值', example: 'MAX({products.quantity})' },
            { name: 'PAGEMAX', syntax: 'PAGEMAX({field})', desc: '当前页最大值', example: 'PAGEMAX({products.quantity})' },
            { name: 'MIN', syntax: 'MIN({field})', desc: '所有记录最小值', example: 'MIN({products.price})' },
            { name: 'PAGEMIN', syntax: 'PAGEMIN({field})', desc: '当前页最小值', example: 'PAGEMIN({products.price})' },
        ]
    },
    {
        name: 'math',
        label: '数学函数',
        functions: [
            { name: 'ROUND', syntax: 'ROUND(value, decimals)', desc: '四舍五入，保留指定小数位', example: 'ROUND({price} * 1.13, 2)' },
            { name: 'FLOOR', syntax: 'FLOOR(value)', desc: '向下取整', example: 'FLOOR({amount})' },
            { name: 'CEIL', syntax: 'CEIL(value)', desc: '向上取整', example: 'CEIL({amount})' },
            { name: 'ABS', syntax: 'ABS(value)', desc: '绝对值', example: 'ABS({totalAmount})' },
            { name: 'MOD', syntax: 'MOD(a, b)', desc: '取余数', example: 'MOD({rowIndex}, 2)' },
        ]
    },
    {
        name: 'string',
        label: '字符串函数',
        functions: [
            { name: 'CONCAT', syntax: 'CONCAT(str1, str2, ...)', desc: '字符串拼接', example: 'CONCAT({customer}, "-出库单")' },
            { name: 'LEFT', syntax: 'LEFT(str, n)', desc: '取左边n个字符', example: 'LEFT({invoiceNo}, 3)' },
            { name: 'RIGHT', syntax: 'RIGHT(str, n)', desc: '取右边n个字符', example: 'RIGHT({invoiceNo}, 4)' },
            { name: 'LEN', syntax: 'LEN(str)', desc: '字符串长度', example: 'LEN({name})' },
            { name: 'TRIM', syntax: 'TRIM(str)', desc: '去除首尾空格', example: 'TRIM({remark})' },
        ]
    },
    {
        name: 'date',
        label: '日期函数',
        functions: [
            { name: 'NOW', syntax: 'NOW()', desc: '当前日期时间', example: 'NOW()' },
            { name: 'TODAY', syntax: 'TODAY()', desc: '当前日期', example: 'TODAY()' },
            { name: 'YEAR', syntax: 'YEAR(date)', desc: '提取年份', example: 'YEAR({date})' },
            { name: 'MONTH', syntax: 'MONTH(date)', desc: '提取月份', example: 'MONTH({date})' },
            { name: 'DAY', syntax: 'DAY(date)', desc: '提取日期', example: 'DAY({date})' },
        ]
    },
    {
        name: 'logic',
        label: '逻辑函数',
        functions: [
            { name: 'IF', syntax: 'IF(condition, trueVal, falseVal)', desc: '条件判断', example: 'IF({amount} > 1000, "大额", "普通")' },
            { name: 'IIF', syntax: 'IIF(condition, trueVal, falseVal)', desc: '简化条件', example: 'IIF({quantity} < 10, "低库存", "")' },
            { name: 'ISNULL', syntax: 'ISNULL(value, default)', desc: '空值处理', example: 'ISNULL({remark}, "无")' },
        ]
    },
    {
        name: 'format',
        label: '格式化函数',
        functions: [
            { name: 'FORMAT', syntax: 'FORMAT(value, type)', desc: '格式化数值', example: 'FORMAT({amount}, "currency")' },
            { name: 'FIXED', syntax: 'FIXED(value, decimals)', desc: '固定小数位', example: 'FIXED({price}, 2)' },
            { name: 'PADLEFT', syntax: 'PADLEFT(str, len, char)', desc: '左侧填充', example: 'PADLEFT({rowIndex}, 4, "0")' },
        ]
    },
    {
        name: 'finance',
        label: '财务函数',
        functions: [
            { name: 'TOCHINESE', syntax: 'TOCHINESE(amount)', desc: '金额转中文大写', example: 'TOCHINESE({totalAmount})' },
            { name: 'CURRENCY', syntax: 'CURRENCY(num, symbol, decimals)', desc: '货币格式化（带千分位）', example: 'CURRENCY({amount}, "￥", 2)' },
            { name: 'DISCOUNT', syntax: 'DISCOUNT(amount, rate)', desc: '计算折扣后金额（rate为百分比）', example: 'DISCOUNT({amount}, 10)' },
            { name: 'TAX', syntax: 'TAX(amount, rate)', desc: '计算税额（rate为税率百分比）', example: 'TAX({amount}, 13)' },
            { name: 'WITHTAX', syntax: 'WITHTAX(amount, rate)', desc: '计算含税金额', example: 'WITHTAX({amount}, 13)' },
            { name: 'EXTRACTTAX', syntax: 'EXTRACTTAX(amountWithTax, rate)', desc: '从含税金额提取税额', example: 'EXTRACTTAX({totalAmount}, 13)' },
        ]
    },
];

const FormulaEditor: React.FC<FormulaEditorProps> = ({
    value,
    dataFields,
    onConfirm,
    onCancel,
}) => {
    const [formula, setFormula] = useState(value || '');
    const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
    const [activeCategory, setActiveCategory] = useState<'data' | 'system' | 'function'>('data');
    const [activeFuncCategory, setActiveFuncCategory] = useState('aggregate');
    const [selectedFunc, setSelectedFunc] = useState<typeof functionCategories[0]['functions'][0] | null>(null);
    
    // textarea 引用
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 通用插入函数：支持选中替换或光标位置插入
    const insertText = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            // 回退到追加模式
            setFormula(prev => prev + text);
            setValidationResult(null);
            return;
        }
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = formula;
        
        // 在选中位置插入（如果有选中则替换）
        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
        setFormula(newValue);
        setValidationResult(null);
        
        // 设置光标位置到插入内容之后
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + text.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [formula]);

    // 插入变量到公式
    const insertVariable = useCallback((varName: string) => {
        insertText(`{${varName}}`);
    }, [insertText]);

    // 插入运算符
    const insertOperator = useCallback((op: string) => {
        insertText(` ${op} `);
    }, [insertText]);

    // 插入函数
    const insertFunction = useCallback((func: typeof functionCategories[0]['functions'][0]) => {
        insertText(func.syntax);
        setSelectedFunc(func);
    }, [insertText]);

    // 校验公式
    const validateFormula = useCallback(() => {
        if (!formula.trim()) {
            setValidationResult({ valid: false, message: '公式不能为空' });
            return false;
        }

        // 使用工具函数进行语法校验
        const syntaxResult = validateFormulaUtil(formula);
        if (!syntaxResult.valid) {
            setValidationResult(syntaxResult);
            return false;
        }

        // 提取所有变量名
        const varPattern = /\{([^}]+)\}/g;
        const variables: string[] = [];
        let match;
        while ((match = varPattern.exec(formula)) !== null) {
            variables.push(match[1]);
        }

        // 检查变量是否存在
        const allVarNames = [
            ...systemVariables.map(v => v.name),
            ...dataFields.map(f => f.name),
        ];
        const invalidVars = variables.filter(v => !allVarNames.includes(v));
        if (invalidVars.length > 0) {
            setValidationResult({ valid: false, message: `未知变量: ${invalidVars.join(', ')}` });
            return false;
        }

        // 使用模拟数据实际执行校验
        const mockData = {
            customer: '测试客户',
            invoiceNo: 'INV001',
            date: '2024-01-01',
            totalQuantity: 100,
            totalAmount: 10000,
            totalChinese: '壹万元整',
            remark: '测试备注',
            creator: '张三',
            reviewer: '李四',
            receiver: '王五',
            receiveDate: '2024-01-02',
            // 明细数据用于预览
            products: [
                { name: '测试产品', spec: '规格型号', unit: '个', quantity: 10, price: 100, amount: 1000 }
            ]
        };
        // 明细行数据
        const mockProduct = {
            name: '测试产品',
            spec: '规格型号',
            unit: '个',
            quantity: 10,
            price: 100,
            amount: 1000,
        };

        const execResult = validateFormulaWithExecution(formula, mockData, mockProduct);
        
        if (!execResult.valid) {
            setValidationResult({ valid: false, message: execResult.message });
            return false;
        }
        
        setValidationResult({ valid: true, message: `校验通过，预览结果: ${execResult.result}` });
        return true;
    }, [formula, dataFields]);

    // 确定
    const handleConfirm = useCallback(() => {
        if (validateFormula()) {
            onConfirm(formula);
        }
    }, [formula, validateFormula, onConfirm]);

    // 清空公式
    const clearFormula = useCallback(() => {
        setFormula('');
        setValidationResult(null);
    }, []);

    return (
        <div className="formula-editor-overlay" onClick={onCancel}>
            <div className="formula-editor-modal" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                <div className="formula-editor-header">
                    <h3>公式编辑器</h3>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>
                
                <div className="formula-editor-body">
                    {/* 左侧：可选变量和函数 */}
                    <div className="formula-variables">
                        <div className="variable-tabs">
                            <button 
                                className={`tab-btn ${activeCategory === 'data' ? 'active' : ''}`}
                                onClick={() => setActiveCategory('data')}
                            >
                                数据字段
                            </button>
                            <button 
                                className={`tab-btn ${activeCategory === 'system' ? 'active' : ''}`}
                                onClick={() => setActiveCategory('system')}
                            >
                                系统变量
                            </button>
                            <button 
                                className={`tab-btn ${activeCategory === 'function' ? 'active' : ''}`}
                                onClick={() => setActiveCategory('function')}
                            >
                                函数
                            </button>
                        </div>
                        
                        <div className="variable-list">
                            {activeCategory === 'system' && (
                                <>
                                    {systemVariables.map(v => (
                                        <button
                                            key={v.name}
                                            className="variable-item"
                                            onClick={() => insertVariable(v.name)}
                                            title={`插入 {${v.name}}`}
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                </>
                            )}
                            {activeCategory === 'data' && (
                                <>
                                    <div className="field-group">
                                        <div className="field-group-title">主表字段</div>
                                        {dataFields.filter(f => f.source === 'master').map(f => (
                                            <button
                                                key={f.name}
                                                className="variable-item"
                                                onClick={() => insertVariable(f.name)}
                                                title={`插入 {${f.name}}`}
                                            >
                                                <span className="field-label">{f.label}</span>
                                                <span className="field-name">{f.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="field-group">
                                        <div className="field-group-title">明细字段</div>
                                        {dataFields.filter(f => f.source === 'detail').map(f => (
                                            <button
                                                key={f.name}
                                                className="variable-item detail-field"
                                                onClick={() => insertVariable(f.name)}
                                                title={`插入 {${f.name}}`}
                                            >
                                                <span className="field-label">{f.label}</span>
                                                <span className="field-name">{f.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            {activeCategory === 'function' && (
                                <>
                                    {/* 函数分类选择 */}
                                    <div className="func-category-tabs">
                                        {functionCategories.map(cat => (
                                            <button
                                                key={cat.name}
                                                className={`func-cat-btn ${activeFuncCategory === cat.name ? 'active' : ''}`}
                                                onClick={() => setActiveFuncCategory(cat.name)}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* 函数列表 */}
                                    <div className="func-list">
                                        {functionCategories
                                            .find(c => c.name === activeFuncCategory)
                                            ?.functions.map(f => (
                                                <button
                                                    key={f.name}
                                                    className="func-item"
                                                    onClick={() => insertFunction(f)}
                                                    title={f.desc}
                                                >
                                                    <span className="func-name">{f.name}</span>
                                                    <span className="func-desc">{f.desc}</span>
                                                </button>
                                            ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* 运算符 */}
                        {activeCategory !== 'function' && (
                            <div className="operator-section">
                                <div className="section-title">运算符</div>
                                <div className="operator-list">
                                    {operators.map(op => (
                                        <button
                                            key={op.symbol}
                                            className="operator-btn"
                                            onClick={() => insertOperator(op.symbol)}
                                            title={op.label}
                                        >
                                            {op.symbol}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* 右侧：公式输入区 */}
                    <div className="formula-input-area">
                        <div className="input-header">
                            <span>计算公式</span>
                            <button className="clear-btn" onClick={clearFormula}>清空</button>
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="formula-textarea"
                            value={formula}
                            onChange={(e) => {
                                setFormula(e.target.value);
                                setValidationResult(null);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="点击左侧变量插入，或直接输入公式&#10;示例: {price} * {quantity}"
                            spellCheck={false}
                        />
                        
                        {/* 校验结果 */}
                        {validationResult && (
                            <div className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
                                {validationResult.valid ? '✓' : '✗'} {validationResult.message}
                            </div>
                        )}
                        
                        {/* 帮助提示 */}
                        <div className="formula-help">
                            <div className="help-title">语法说明:</div>
                            {selectedFunc ? (
                                <div className="func-help-detail">
                                    <div className="func-help-name">{selectedFunc.name}</div>
                                    <div className="func-help-syntax">语法: {selectedFunc.syntax}</div>
                                    <div className="func-help-desc">说明: {selectedFunc.desc}</div>
                                    <div className="func-help-example">示例: {selectedFunc.example}</div>
                                </div>
                            ) : (
                                <ul>
                                    <li>使用 {'{\u5b57\u6bb5\u540d}'} 引用数据字段</li>
                                    <li>支持 + - * / 四则运算</li>
                                    <li>使用括号 () 控制计算顺序</li>
                                    <li>点击“函数”查看可用函数</li>
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="formula-editor-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>取消</button>
                    <button className="btn btn-primary" onClick={validateFormula}>校验</button>
                    <button className="btn btn-success" onClick={handleConfirm}>确定</button>
                </div>
            </div>
            
            <style>{`
                .formula-editor-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                
                .formula-editor-modal {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    width: 700px;
                    max-width: 90vw;
                    height: 500px;
                    display: flex;
                    flex-direction: column;
                }
                
                .formula-editor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e8e8e8;
                }
                
                .formula-editor-header h3 {
                    margin: 0;
                    font-size: 16px;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                    padding: 4px 8px;
                }
                
                .close-btn:hover {
                    color: #333;
                }
                
                .formula-editor-body {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                    min-height: 350px;
                }
                
                .formula-variables {
                    width: 240px;
                    border-right: 1px solid #e8e8e8;
                    display: flex;
                    flex-direction: column;
                    background: #fafafa;
                }
                
                .variable-tabs {
                    display: flex;
                    border-bottom: 1px solid #e8e8e8;
                }
                
                .tab-btn {
                    flex: 1;
                    padding: 8px 4px;
                    border: none;
                    background: #f5f5f5;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.2s;
                }
                
                .tab-btn.active {
                    background: white;
                    color: #1890ff;
                    font-weight: 500;
                }
                
                .tab-btn:hover:not(.active) {
                    background: #e8e8e8;
                }
                
                .variable-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                
                .variable-item {
                    display: block;
                    width: 100%;
                    padding: 6px 10px;
                    margin-bottom: 4px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    background: white;
                    text-align: left;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .variable-item:hover {
                    border-color: #1890ff;
                    color: #1890ff;
                }
                
                /* 字段分组样式 */
                .field-group {
                    margin-bottom: 12px;
                }
                
                .field-group-title {
                    font-size: 11px;
                    color: #999;
                    font-weight: 500;
                    margin-bottom: 6px;
                    padding-left: 4px;
                    border-left: 3px solid #1890ff;
                }
                
                .field-group:last-child .field-group-title {
                    border-left-color: #52c41a;
                }
                
                .variable-item .field-label {
                    display: block;
                    font-size: 12px;
                }
                
                .variable-item .field-name {
                    display: block;
                    font-size: 10px;
                    color: #999;
                    font-family: 'Consolas', 'Monaco', monospace;
                    margin-top: 2px;
                }
                
                .variable-item.detail-field {
                    border-left: 3px solid #52c41a;
                }
                
                .variable-item:hover .field-name {
                    color: #1890ff;
                }
                
                .operator-section {
                    padding: 8px;
                    border-top: 1px solid #e8e8e8;
                }
                
                .section-title {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 8px;
                }
                
                .operator-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                
                .operator-btn {
                    width: 32px;
                    height: 32px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                
                .operator-btn:hover {
                    border-color: #1890ff;
                    color: #1890ff;
                }
                
                .formula-input-area {
                    flex: 1;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                }
                
                .input-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .input-header span {
                    font-weight: 500;
                    font-size: 13px;
                }
                
                .clear-btn {
                    padding: 2px 8px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .clear-btn:hover {
                    border-color: #ff4d4f;
                    color: #ff4d4f;
                }
                
                .formula-textarea {
                    flex: 1;
                    min-height: 100px;
                    padding: 10px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 14px;
                    resize: none;
                    line-height: 1.5;
                }
                
                .formula-textarea:focus {
                    outline: none;
                    border-color: #1890ff;
                    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                }
                
                .validation-result {
                    margin-top: 8px;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 13px;
                }
                
                .validation-result.valid {
                    background: #f6ffed;
                    border: 1px solid #b7eb8f;
                    color: #52c41a;
                }
                
                .validation-result.invalid {
                    background: #fff2f0;
                    border: 1px solid #ffccc7;
                    color: #ff4d4f;
                }
                
                .formula-help {
                    margin-top: 12px;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #666;
                }
                
                .help-title {
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .formula-help ul {
                    margin: 0;
                    padding-left: 16px;
                }
                
                .formula-help li {
                    margin: 2px 0;
                }
                
                /* 函数相关样式 */
                .func-category-tabs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-bottom: 8px;
                }
                
                .func-cat-btn {
                    padding: 4px 8px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.2s;
                }
                
                .func-cat-btn.active {
                    background: #1890ff;
                    border-color: #1890ff;
                    color: white;
                }
                
                .func-cat-btn:hover:not(.active) {
                    border-color: #1890ff;
                    color: #1890ff;
                }
                
                .func-list {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .func-item {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 6px 10px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                }
                
                .func-item:hover {
                    border-color: #1890ff;
                    background: #e6f7ff;
                }
                
                .func-name {
                    font-weight: 600;
                    font-size: 12px;
                    color: #1890ff;
                }
                
                .func-desc {
                    font-size: 10px;
                    color: #999;
                    margin-top: 2px;
                }
                
                .func-help-detail {
                    line-height: 1.6;
                }
                
                .func-help-name {
                    font-weight: 600;
                    font-size: 14px;
                    color: #1890ff;
                    margin-bottom: 4px;
                }
                
                .func-help-syntax {
                    font-family: 'Consolas', 'Monaco', monospace;
                    background: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                }
                
                .func-help-desc {
                    margin-bottom: 4px;
                }
                
                .func-help-example {
                    font-family: 'Consolas', 'Monaco', monospace;
                    background: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: #52c41a;
                }
                
                .formula-editor-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 12px 16px;
                    border-top: 1px solid #e8e8e8;
                }
                
                .formula-editor-footer .btn {
                    padding: 6px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    border: 1px solid;
                    transition: all 0.2s;
                }
                
                .btn-secondary {
                    background: white;
                    border-color: #d9d9d9;
                    color: #666;
                }
                
                .btn-secondary:hover {
                    border-color: #1890ff;
                    color: #1890ff;
                }
                
                .btn-primary {
                    background: #1890ff;
                    border-color: #1890ff;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #40a9ff;
                    border-color: #40a9ff;
                }
                
                .btn-success {
                    background: #52c41a;
                    border-color: #52c41a;
                    color: white;
                }
                
                .btn-success:hover {
                    background: #73d13d;
                    border-color: #73d13d;
                }
            `}</style>
        </div>
    );
};

export default FormulaEditor;
