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
  const [readmeContent, setReadmeContent] = useState('');

  // 加载设计数据和 README
  useEffect(() => {
    loadDesign().then(data => {
      setDesign(data);
      setLoading(false);
    });
    // 加载 README
    fetch('https://raw.githubusercontent.com/chengyihua/print-designer/main/README.md')
      .then(res => res.text())
      .then(text => setReadmeContent(text))
      .catch(() => setReadmeContent('无法加载 README 内容'));
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
    <div style={{ fontFamily: 'sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        background: '#24292e',
        color: '#fff',
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Print Designer</h1>
        <span style={{ marginLeft: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
          报表设计器
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a 
            href="https://github.com/chengyihua/print-designer" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              padding: '6px 12px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <a 
            href="https://www.npmjs.com/package/print-designer" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              padding: '6px 12px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            📦 npm
          </a>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            CC BY-NC 4.0
          </span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>打印输出接口测试</h2>
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

        {/* README 文档 */}
        <h3 style={{ margin: '20px 0 12px 0', fontSize: 16 }}>项目文档</h3>
        <pre style={{
          background: '#f6f8fa',
          border: '1px solid #e1e4e8',
          borderRadius: 8,
          padding: 20,
          margin: '0 0 20px 0',
          fontSize: 14,
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          color: '#24292e',
          maxHeight: 500,
          overflow: 'auto',
        }}>{readmeContent || '加载文档中...'}</pre>

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
