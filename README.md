# Print Designer

一个功能强大的 React 报表设计器组件库，支持可视化设计、打印预览和 PDF 导出。

## 特性

- 📐 **可视化设计** - 拖拽式设计界面，所见即所得
- 🎨 **丰富控件** - 支持文本、字段、图片、条码、二维码、线条等多种控件
- 📊 **带区设计** - 支持页头、页脚、明细带区等报表结构
- 🖨️ **打印预览** - 实时预览打印效果
- 📄 **PDF 导出** - 一键导出 PDF 文件
- 🔧 **高度可定制** - 灵活的属性配置和样式设置

## 安装

```bash
npm install print-designer
```

## 快速开始

```tsx
import { BandBoundaryDesigner } from 'print-designer';

const dataFields = [
    { name: 'orderNo', label: '订单号', type: 'string' },
    { name: 'customer', label: '客户名称', type: 'string' },
    { name: 'amount', label: '金额', type: 'number' },
    { name: 'products', label: '产品明细', type: 'array', children: [
        { name: 'name', label: '产品名称', type: 'string' },
        { name: 'qty', label: '数量', type: 'number' },
        { name: 'price', label: '单价', type: 'number' },
    ]},
];

const previewData = {
    orderNo: 'ORD-2024001',
    customer: '测试客户',
    amount: 1000,
    products: [
        { name: '产品A', qty: 10, price: 50 },
        { name: '产品B', qty: 5, price: 100 },
    ],
};

function App() {
    return (
        <BandBoundaryDesigner
            dataFields={dataFields}
            data={previewData}
            onSave={(design) => {
                console.log('保存设计:', design);
            }}
        />
    );
}
```

## API

### BandBoundaryDesigner

主设计器组件。

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dataFields | `DataField[]` | ✓ | 数据字段定义 |
| data | `Record<string, any>` | | 预览数据 |
| initialDesign | `Band[]` | | 初始设计数据 |
| options | `Partial<DesignerOptions>` | | 设计器配置 |
| onDesignChange | `(bands: Band[]) => void` | | 设计变更回调 |
| onSave | `(design: any) => void` | | 保存回调 |
| onPreview | `() => void` | | 预览回调 |

### DataField 类型

```typescript
interface DataField {
    name: string;      // 字段名
    label: string;     // 显示名称
    type: 'string' | 'number' | 'date' | 'boolean' | 'array';
    children?: DataField[];  // 子字段（用于明细数据）
}
```

### 导出的组件

| 组件 | 说明 |
|------|------|
| BandBoundaryDesigner | 主设计器组件 |
| PrintPreview | 打印预览组件 |
| ObjectPropertyPanel | 对象属性面板 |
| BandPropertyPanel | 带区属性面板 |
| Toolbar | 工具栏 |
| ColorPicker | 颜色选择器 |
| FormulaEditor | 公式编辑器 |

### 导出的工具函数

```typescript
import {
    getBandObjectsRenderData,
    getObjectRenderData,
    evaluateFormula,
    validateFormula,
} from 'print-designer';
```

### 导出的常量

```typescript
import {
    controlTypes,        // 控件类型列表
    defaultBands,        // 默认带区配置
    borderStyles,        // 边框样式选项
    fontWeightOptions,   // 字体粗细选项
    barcodeTypeOptions,  // 条码类型选项
    // ... 更多常量
} from 'print-designer';
```

## 支持的控件类型

| 控件 | 说明 |
|------|------|
| text | 静态文本 |
| field | 数据字段 |
| calculated | 计算字段 |
| image | 图片 |
| barcode | 条形码 |
| qrcode | 二维码 |
| line | 线条 |
| rectangle | 矩形 |
| page_number | 页码 |
| current_date | 当前日期 |

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## License

MIT

## 作者

程宜华 (chengyihua@acbnlink.com)

## 链接

- [GitHub](https://github.com/chengyihua/print-designer)
- [npm](https://www.npmjs.com/package/print-designer)
