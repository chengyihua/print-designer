import React, { useState, useEffect } from 'react';
import BandBoundaryDesigner from './components/BandBoundaryDesigner';
import templateDesign from './temp.json';
import type { Band, DataField } from './types/types';
import enhancedSampleData from "./enhancedSampleData.json"

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
  const [initialDesign, setInitialDesign] = useState<Band[] | undefined>();
  const [dataFields, setDataFields] = useState<DataField[]>(defaultDataFields);
  const [previewData, setPreviewData] = useState<Record<string, any>>(enhancedSampleData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从服务器加载设计
    fetch('/api/get-design')
      .then(res => res.json())
      .then(data => {
        setInitialDesign(data.bands as Band[]);
        setLoading(false);
      })
      .catch(() => {
        // 如果服务器加载失败，尝试从本地存储加载
        if (localStorage.getItem('design')) {
          setInitialDesign(JSON.parse(localStorage.getItem('design') || '{}').bands as Band[]);
        } else {
          const savedDesign = templateDesign;//localStorage.getItem('design');
          if (savedDesign) {
            setInitialDesign(savedDesign.bands as Band[]);
          }
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>加载设计中...</div>;
  }

  return (
    <BandBoundaryDesigner
      dataFields={dataFields}
      initialDesign={initialDesign}
      data={previewData}
      onSave={(design) => {
        console.log('Saving design:', JSON.stringify(design));
        // 同时保存到服务器和本地
        fetch('/api/save-design', {
          method: 'POST',
          body: JSON.stringify(design)
        });
        localStorage.setItem('design', JSON.stringify(design));
      }}
    />
  );
}

export default App;
