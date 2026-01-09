import React, { useState, useEffect } from 'react';
import BandBoundaryDesigner from './components/BandBoundaryDesigner';
import templateDesign from './temp.json';
import type { Band, DataField, PageSettings } from './types/types';
import enhancedSampleData from "./enhancedSampleData.json"
import './App.css';

// 设计数据类型
interface DesignData {
  bands?: Band[];
  pageSettings?: PageSettings;
  version?: string;
  createdAt?: string;
}

// GitHub 图标组件
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

// 默认server数据字段定义（来自服务器加载前的回退值）
const defaultDataFields: DataField[] = [
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
]

function App() {
  const [design, setDesign] = useState<DesignData | undefined>();
  const [dataFields] = useState<DataField[]>(defaultDataFields);
  const [previewData] = useState<Record<string, any>>(enhancedSampleData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从服务器加载设计
    fetch('/api/get-design')
      .then(res => res.json())
      .then(data => {
        setDesign(data);
        setLoading(false);
      })
      .catch(() => {
        // 如果服务器加载失败，尝试从本地存储加载
        const localDesign = localStorage.getItem('design');
        if (localDesign) {
          setDesign(JSON.parse(localDesign));
        } else {
          setDesign(templateDesign as DesignData);
        }
        setLoading(false);
      });
  }, []);

  const [showReadme, setShowReadme] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');

  const loadReadme = () => {
    if (!readmeContent) {
      fetch('https://raw.githubusercontent.com/chengyihua/print-designer/main/README.md')
        .then(res => res.text())
        .then(text => setReadmeContent(text))
        .catch(() => setReadmeContent('无法加载 README 内容'));
    }
    setShowReadme(true);
  };

  if (loading) {
    return <div>加载设计中...</div>;
  }

  return (
    <div className="app-container">
      {/* GitHub 链接栏 */}
      <div className="github-bar">
        <a 
          href="https://github.com/chengyihua/print-designer" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
          title="GitHub"
        >
          <GitHubIcon />
          <span>GitHub</span>
        </a>
        <button className="readme-btn" onClick={loadReadme}>
          📖 文档
        </button>
        <a 
          href="https://www.npmjs.com/package/print-designer" 
          target="_blank" 
          rel="noopener noreferrer"
          className="npm-link"
          title="npm"
        >
          📦 npm
        </a>
      </div>

      {/* README 弹窗 */}
      {showReadme && (
        <div className="readme-modal" onClick={() => setShowReadme(false)}>
          <div className="readme-content" onClick={e => e.stopPropagation()}>
            <div className="readme-header">
              <h2>Print Designer 文档</h2>
              <button className="close-btn" onClick={() => setShowReadme(false)}>×</button>
            </div>
            <pre className="readme-text">{readmeContent || '加载中...'}</pre>
          </div>
        </div>
      )}

      {/* 设计器 */}
      <BandBoundaryDesigner
        dataFields={dataFields}
        initialDesign={design?.bands}
        initialPageSettings={design?.pageSettings}
        data={previewData}
        onSave={(newDesign) => {
          console.log('Saving design:', JSON.stringify(newDesign));
          // 同时保存到服务器和本地
          fetch('/api/save-design', {
            method: 'POST',
            body: JSON.stringify(newDesign)
          });
          localStorage.setItem('design', JSON.stringify(newDesign));
        }}
      />
    </div>
  );
}

export default App;
