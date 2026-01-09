import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 打印输出接口测试
import { renderToHtml, exportToPdf, getPrintableHtml, openPrintWindow } from './utils/printUtils';
import templateDesign from './temp.json';
import enhancedSampleData from './enhancedSampleData.json';
import type { Band, DataField, PageSettings } from './types/types';

// 设计数据类型
interface DesignData {
  bands?: Band[];
  pageSettings?: PageSettings;
  version?: string;
  createdAt?: string;
}

// 默认页面设置 (A4 纸张)
const defaultPageSettings: PageSettings = {
  paperSize: 'A4',
  width: 210,
  height: 297,
  unit: 'mm',
  margins: { top: 10, bottom: 10, left: 10, right: 10 },
  orientation: 'portrait',
};

// 测试用数据字段定义
const testDataFields: DataField[] = [
  // 主表字段
  { name: 'customer', label: '客户名称', type: 'string', source: 'master' },
  { name: 'invoiceNo', label: '发票号码', type: 'string', source: 'master' },
  { name: 'date', label: '日期', type: 'date', source: 'master' },
  { name: 'totalQuantity', label: '总数量', type: 'number', source: 'master' },
  { name: 'totalAmount', label: '总金额', type: 'currency', source: 'master' },
  { name: 'totalChinese', label: '金额大写', type: 'string', source: 'master' },
  { name: 'remark', label: '备注', type: 'string', source: 'master' },
  { name: 'creator', label: '制单人', type: 'string', source: 'master' },
  { name: 'reviewer', label: '审核人', type: 'string', source: 'master' },
  { name: 'receiver', label: '收货人', type: 'string', source: 'master' },
  { name: 'receiveDate', label: '收货日期', type: 'date', source: 'master' },
  // 明细字段 (products 数组中的字段)
  { name: 'products.name', label: '产品名称', type: 'string', source: 'detail' },
  { name: 'products.spec', label: '规格型号', type: 'string', source: 'detail' },
  { name: 'products.unit', label: '单位', type: 'string', source: 'detail' },
  { name: 'products.quantity', label: '数量', type: 'number', source: 'detail' },
  { name: 'products.price', label: '单价', type: 'currency', source: 'detail' },
  { name: 'products.amount', label: '金额', type: 'currency', source: 'detail' },
];

/**
 * 加载设计数据（与 App.tsx 保持一致）
 * 优先级：服务器 > localStorage > 默认模板
 */
async function loadDesign(): Promise<DesignData> {
  try {
    // 先尝试从服务器加载
    const res = await fetch('/api/get-design');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // 服务器加载失败
  }
  
  // 尝试从 localStorage 加载
  const localDesign = localStorage.getItem('design');
  if (localDesign) {
    try {
      return JSON.parse(localDesign);
    } catch (e) {
      // 解析失败
    }
  }
  
  // 回退到默认模板
  return templateDesign as DesignData;
}

/**
 * 格式化 HTML 字符串
 */
function formatHtml(html: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  
  // 简单的 HTML 格式化
  html.split(/(<[^>]+>)/g).forEach(node => {
    if (!node.trim()) return;
    
    // 结束标签
    if (node.match(/^<\/\w/)) {
      indent = Math.max(0, indent - 1);
    }
    
    // 添加缩进
    if (node.startsWith('<')) {
      formatted += tab.repeat(indent) + node + '\n';
    } else {
      // 文本内容
      const text = node.trim();
      if (text) {
        formatted += tab.repeat(indent) + text + '\n';
      }
    }
    
    // 开始标签（非自关闭）
    if (node.match(/^<\w[^>]*[^/]>$/)) {
      indent++;
    }
  });
  
  return formatted.trim();
}

// 暴露打印测试函数到 window 对象
declare global {
  interface Window {
    printTest: {
      renderToHtml: () => void;
      exportToPdf: () => void;
      getPrintableHtml: () => void;
      openPrintWindow: () => void;
    };
  }
}

window.printTest = {
  // 测试渲染为 HTML
  renderToHtml: () => {
    const result = renderToHtml({
      template: (templateDesign as any).bands as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
    });
    console.log('✅ renderToHtml 结果:');
    console.log('  - 总页数:', result.totalPages);
    console.log('  - 页面尺寸:', result.pageWidth, 'x', result.pageHeight);
    console.log('  - HTML 长度:', result.html.length, '字符');
    console.log('  - HTML 预览 (前500字符):', result.html.substring(0, 500));
    return result;
  },

  // 测试导出 PDF
  exportToPdf: async () => {
    console.log('⏳ 正在导出 PDF...');
    try {
      await exportToPdf({
        template: (templateDesign as any).bands as Band[],
        data: enhancedSampleData,
        dataFields: testDataFields,
        fileName: '测试报表',
        download: true,
      });
      console.log('✅ PDF 导出成功!');
    } catch (error) {
      console.error('❌ PDF 导出失败:', error);
    }
  },

  // 测试获取可打印 HTML
  getPrintableHtml: () => {
    const html = getPrintableHtml({
      template: (templateDesign as any).bands as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
    });
    console.log('✅ getPrintableHtml 结果:');
    console.log('  - HTML 文档长度:', html.length, '字符');
    console.log('  - 包含 DOCTYPE:', html.includes('<!DOCTYPE'));
    console.log('  - 包含 @media print:', html.includes('@media print'));
    return html;
  },

  // 测试打开打印窗口
  openPrintWindow: () => {
    console.log('⏳ 正在打开打印窗口...');
    openPrintWindow({
      template: (templateDesign as any).bands as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
    });
    console.log('✅ 打印窗口已打开!');
  },
};

console.log('\n📦 打印输出接口测试已加载，在控制台执行:');
console.log('  - window.printTest.renderToHtml()    // 渲染为 HTML');
console.log('  - window.printTest.exportToPdf()     // 导出 PDF');
console.log('  - window.printTest.getPrintableHtml() // 获取可打印 HTML');
console.log('  - window.printTest.openPrintWindow() // 打开打印窗口\n');

// 测试按钮组件
const PrintTestPanel: React.FC = () => {
  const [htmlResult, setHtmlResult] = useState<string | null>(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const [design, setDesign] = useState<DesignData | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载设计数据（与 App.tsx 保持一致）
  useEffect(() => {
    loadDesign().then(data => {
      setDesign(data);
      setLoading(false);
    });
  }, []);

  // 获取当前设计数据
  const getCurrentTemplate = () => design?.bands || (templateDesign as DesignData).bands || [];
  const getCurrentPageSettings = () => design?.pageSettings || defaultPageSettings;

  const handleRenderHtml = () => {
    const result = renderToHtml({
      template: getCurrentTemplate() as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
      pageSettings: getCurrentPageSettings(),
    });
    setHtmlResult(result.html);
    console.log('✅ renderToHtml:', { totalPages: result.totalPages, pageWidth: result.pageWidth, pageHeight: result.pageHeight });
  };

  const handleExportPdf = async () => {
    console.log('⏳ 正在导出 PDF...');
    await exportToPdf({
      template: getCurrentTemplate() as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
      pageSettings: getCurrentPageSettings(),
      fileName: '测试报表',
    });
    console.log('✅ PDF 导出成功!');
  };

  const handleOpenPrintWindow = () => {
    openPrintWindow({
      template: getCurrentTemplate() as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
      pageSettings: getCurrentPageSettings(),
    });
  };

  const handlePreviewHtml = () => {
    const html = getPrintableHtml({
      template: getCurrentTemplate() as Band[],
      data: enhancedSampleData,
      dataFields: testDataFields,
      pageSettings: getCurrentPageSettings(),
    });
    // 在新窗口中预览 HTML
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // 重新加载设计数据
  const handleRefresh = async () => {
    setLoading(true);
    const data = await loadDesign();
    setDesign(data);
    setLoading(false);
    console.log('✅ 设计数据已刷新');
  };

  if (showDesigner) {
    return <App />;
  }

  if (loading) {
    return <div style={{ padding: 20 }}>加载设计中...</div>;
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>打印输出接口测试</h2>
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={handleRefresh} style={{ ...btnStyle, background: '#faad14' }}>
          刷新设计
        </button>
        <button onClick={handleRenderHtml} style={btnStyle}>
          渲染为 HTML
        </button>
        <button onClick={handlePreviewHtml} style={btnStyle}>
          预览 HTML (新窗口)
        </button>
        <button onClick={handleExportPdf} style={btnStyle}>
          导出 PDF
        </button>
        <button onClick={handleOpenPrintWindow} style={btnStyle}>
          打开打印窗口
        </button>
        <button onClick={() => setShowDesigner(true)} style={{ ...btnStyle, background: '#1890ff' }}>
          进入设计器
        </button>
      </div>

      {htmlResult && (
        <div>
          <h3>HTML 渲染结果预览:</h3>
          <div style={{ display: 'flex', gap: 10, height: 600 }}>
            {/* 左侧：渲染结果 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 5, fontWeight: 'bold', color: '#666' }}>渲染结果</div>
              <div
                style={{
                  flex: 1,
                  border: '1px solid #ccc',
                  background: '#f5f5f5',
                  padding: 10,
                  overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: htmlResult }}
              />
            </div>
            {/* 右侧：HTML 源码 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: '#666' }}>HTML 源码</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(formatHtml(htmlResult));
                    console.log('✅ HTML 已复制到剪贴板');
                  }}
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: '#1890ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  复制
                </button>
              </div>
              <pre
                style={{
                  flex: 1,
                  border: '1px solid #ccc',
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: 10,
                  overflow: 'auto',
                  margin: 0,
                  fontSize: 12,
                  fontFamily: 'Consolas, Monaco, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  tabSize: 2,
                }}
              >
                {formatHtml(htmlResult)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: 14,
  cursor: 'pointer',
  background: '#52c41a',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <PrintTestPanel />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
