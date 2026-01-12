import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { marked } from 'marked';

// 打印输出接口测试
import { renderToHtml, exportToPdf, getPrintableHtml, openPrintWindow } from './utils/printUtils';
import templateDesign from './temp.json';
import enhancedSampleData from './enhancedSampleData.json';
import type { Band, DataField, PageSettings, DesignData } from './types/types';

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
  return {
    bands: (templateDesign as any).bands,
    pageSettings: defaultPageSettings,
  };
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
      design: {
        bands: (templateDesign as any).bands as Band[],
        pageSettings: defaultPageSettings,
      },
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
        design: {
          bands: (templateDesign as any).bands as Band[],
          pageSettings: defaultPageSettings,
        },
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
      design: {
        bands: (templateDesign as any).bands as Band[],
        pageSettings: defaultPageSettings,
      },
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
      design: {
        bands: (templateDesign as any).bands as Band[],
        pageSettings: defaultPageSettings,
      },
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
  const [showDesigner, setShowDesigner] = useState(() => {
    // 检查 URL 参数是否为设计器模式
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'designer';
  });
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
  const getCurrentDesign = (): DesignData => ({
    bands: design?.bands || (templateDesign as any).bands,
    pageSettings: design?.pageSettings || defaultPageSettings,
  });

  const handleRenderHtml = () => {
    const result = renderToHtml({
      design: getCurrentDesign(),
      data: enhancedSampleData,
      dataFields: testDataFields,
    });
    // 在新窗口中显示 HTML 渲染结果
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>HTML 渲染结果 - Print Designer</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; }
            .header { display: flex; align-items: center; padding: 12px 20px; background: #24292e; color: #fff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .header .tag { margin-left: 12px; font-size: 12px; color: rgba(255,255,255,0.5); padding: 2px 8px; background: rgba(255,255,255,0.1); border-radius: 4px; }
            .header .links { margin-left: auto; display: flex; align-items: center; gap: 12px; }
            .header a { display: flex; align-items: center; gap: 6px; color: #fff; text-decoration: none; font-size: 14px; padding: 6px 12px; border-radius: 4px; background: rgba(255,255,255,0.1); }
            .main { flex: 1; padding: 20px; background: #f5f5f5; overflow: auto; }
            .container { display: flex; gap: 20px; height: 100%; }
            .panel { flex: 1; display: flex; flex-direction: column; }
            .panel-title { font-weight: bold; margin-bottom: 8px; color: #333; }
            .render-result { flex: 1; background: #fff; border: 1px solid #ddd; padding: 10px; overflow: auto; }
            .code-result { flex: 1; background: #1e1e1e; color: #d4d4d4; padding: 10px; overflow: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
            .footer { padding: 12px 20px; background: #f6f8fa; border-top: 1px solid #e1e4e8; text-align: center; font-size: 12px; color: #586069; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Print Designer</h1>
            <span class="tag">HTML 渲染结果</span>
            <div class="links">
              <a href="https://github.com/chengyihua/print-designer" target="_blank">GitHub</a>
              <a href="https://www.npmjs.com/package/print-designer" target="_blank">📦 npm</a>
            </div>
          </div>
          <div class="main">
            <div class="container">
              <div class="panel">
                <div class="panel-title">渲染结果 (总 ${result.totalPages} 页)</div>
                <div class="render-result">${result.html}</div>
              </div>
              <div class="panel">
                <div class="panel-title">HTML 源码</div>
                <pre class="code-result">${result.html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>
            </div>
          </div>
          <div class="footer">© 2024 程宜华 | CC BY-NC 4.0 | 仅限个人学习和非商业用途 | 商业授权请联系: chengyihua@acbnlink.com</div>
        </body>
        </html>
      `);
      win.document.close();
    }
    console.log('✅ renderToHtml:', { totalPages: result.totalPages, pageWidth: result.pageWidth, pageHeight: result.pageHeight });
  };

  const handleExportPdf = async () => {
    console.log('⏳ 正在导出 PDF...');
    await exportToPdf({
      design: getCurrentDesign(),
      data: enhancedSampleData,
      dataFields: testDataFields,
      fileName: '测试报表',
    });
    console.log('✅ PDF 导出成功!');
  };

  const handleOpenPrintWindow = () => {
    openPrintWindow({
      design: getCurrentDesign(),
      data: enhancedSampleData,
      dataFields: testDataFields,
    });
  };

  const handlePreviewHtml = () => {
    const html = getPrintableHtml({
      design: getCurrentDesign(),
      data: enhancedSampleData,
      dataFields: testDataFields,
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* 顶部栏 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 20px',
          background: '#24292e',
          color: '#fff',
        }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Print Designer</h1>
          <span style={{ marginLeft: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
            设计器
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="https://github.com/chengyihua/print-designer" target="_blank" rel="noopener noreferrer"
              style={{ color: '#fff', textDecoration: 'none', fontSize: 13, padding: '4px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
              GitHub
            </a>
            <a href="https://www.npmjs.com/package/print-designer" target="_blank" rel="noopener noreferrer"
              style={{ color: '#fff', textDecoration: 'none', fontSize: 13, padding: '4px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
              📦 npm
            </a>
          </div>
        </div>
        {/* 设计器 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <App />
        </div>
        {/* 底部版权 */}
        <div style={{
          padding: '8px 20px',
          background: '#f6f8fa',
          borderTop: '1px solid #e1e4e8',
          textAlign: 'center',
          fontSize: 11,
          color: '#586069',
        }}>
          © 2024 程宜华 | CC BY-NC 4.0 | 商业授权: chengyihua@acbnlink.com
        </div>
      </div>
    );
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
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 0', background: '#f9f9f9' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
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
          <button onClick={() => window.open(window.location.href + '?mode=designer', '_blank')} style={{ ...btnStyle, background: '#1890ff' }}>
            进入设计器
          </button>
        </div>

        {/* README 文档 */}
        <div 
          className="markdown-body"
          style={{ fontSize: 14, lineHeight: 1.8, color: '#24292e' }}
          dangerouslySetInnerHTML={{ __html: readmeContent ? marked(readmeContent) as string : '加载文档中...' }}
        />
        </div>
      </div>

      {/* 底部版权信息 */}
      <div style={{
        padding: '12px 20px',
        background: '#f6f8fa',
        borderTop: '1px solid #e1e4e8',
        textAlign: 'center',
        fontSize: 12,
        color: '#586069',
      }}>
        © 2024 程宜华 | CC BY-NC 4.0 | 仅限个人学习和非商业用途 | 商业授权请联系: chengyihua@acbnlink.com
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
