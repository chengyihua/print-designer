# Print Designer

一个功能强大的 React 报表设计器组件库，支持可视化设计、打印预览和 PDF 导出。

**[在线演示 Demo](https://chengyihua.github.io/print-designer)**

## 特性

- 📐 **可视化设计** - 拖拽式设计界面，所见即所得
- 🎨 **丰富控件** - 支持文本、字段、图片、条码、二维码、线条等多种控件
- 📊 **带区设计** - 支持页头、明细、汇总、页脚带区
- 🖨️ **打印预览** - 实时预览打印效果，支持分页
- 📄 **PDF 导出** - 一键导出 PDF 文件
- ⌨️ **键盘操作** - 支持方向键微调、Shift 锁定方向、快捷键
- 🔧 **高度可定制** - 灵活的属性配置和样式设置
- 📝 **公式支持** - 支持计算字段和公式编辑

## 安装

```bash
npm install print-designer
```

## 快速开始

### 基本使用（设计器模式）

```tsx
import { BandBoundaryDesigner } from 'print-designer';

// 定义数据字段
const dataFields = [
    // 主表字段
    { name: 'orderNo', label: '订单号', type: 'string', source: 'master' },
    { name: 'customer', label: '客户名称', type: 'string', source: 'master' },
    { name: 'orderDate', label: '订单日期', type: 'date', source: 'master' },
    { name: 'totalAmount', label: '总金额', type: 'currency', source: 'master' },
    // 明细字段（source 为 'detail'）
    { name: 'products.name', label: '产品名称', type: 'string', source: 'detail' },
    { name: 'products.quantity', label: '数量', type: 'number', source: 'detail' },
    { name: 'products.price', label: '单价', type: 'currency', source: 'detail' },
    { name: 'products.amount', label: '金额', type: 'currency', source: 'detail' },
];

// 预览数据
const previewData = {
    orderNo: 'ORD-2024001',
    customer: '测试客户公司',
    orderDate: '2024-01-15',
    totalAmount: 15000,
    // 明细数据（数组名称根据字段定义自动识别，如 products.name → products）
    products: [
        { name: '产品A', quantity: 10, price: 500, amount: 5000 },
        { name: '产品B', quantity: 20, price: 300, amount: 6000 },
        { name: '产品C', quantity: 8, price: 500, amount: 4000 },
    ],
};

function App() {
    const handleSave = (design) => {
        console.log('保存设计:', design);
        // 保存到服务器或本地存储
        localStorage.setItem('design', JSON.stringify(design));
    };

    const handleDesignChange = (bands) => {
        console.log('设计变更:', bands);
    };

    return (
        <BandBoundaryDesigner
            dataFields={dataFields}
            data={previewData}
            onSave={handleSave}
            onDesignChange={handleDesignChange}
        />
    );
}
```

### 直接打印输出（无需设计器）

如果已有设计模板，可以直接调用打印输出接口：

```tsx
import { 
    renderToHtml, 
    exportToPdf, 
    getPrintableHtml, 
    openPrintWindow 
} from 'print-designer';

// 从存储加载设计数据
const savedDesign = JSON.parse(localStorage.getItem('design') || '{}');

// 打印配置（统一的 JSON 结构）
const printOptions = {
    design: savedDesign,   // 设计数据（包含 bands, pageSettings）
    data: previewData,     // 业务数据
    dataFields,            // 数据字段定义（必填）
};

// 1. 渲染为 HTML 字符串
const result = renderToHtml(printOptions);
console.log('总页数:', result.totalPages);
console.log('HTML:', result.html);

// 2. 导出 PDF
await exportToPdf({
    ...printOptions,
    fileName: '订单报表',  // PDF 文件名
    download: true,           // 直接下载
});

// 3. 获取完整的可打印 HTML 文档
const printHtml = getPrintableHtml(printOptions);
// 可以发送给服务器生成 PDF 或打印

// 4. 打开打印窗口
openPrintWindow(printOptions);
```

## API 文档

### BandBoundaryDesigner

主设计器组件。

```tsx
import { BandBoundaryDesigner } from 'print-designer';
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| dataFields | `DataField[]` | ✓ | - | 数据字段定义 |
| data | `Record<string, any>` | | `{}` | 预览数据 |
| initialDesign | `Band[]` | | - | 初始设计数据（用于加载已保存的设计） |
| options | `Partial<DesignerOptions>` | | - | 设计器配置选项 |
| initialPageSettings | `PageSettings` | | A4 纵向 | 初始页面设置 |
| onDesignChange | `(bands: Band[]) => void` | | - | 设计变更回调（实时） |
| onSave | `(design: any) => void` | | - | 保存按钮回调 |
| onPreview | `() => void` | | - | 预览按钮回调 |
| onPageSettingsChange | `(settings: PageSettings) => void` | | - | 页面设置变更回调 |

### PrintPreview

打印预览组件，可独立使用。

```tsx
import { PrintPreview } from 'print-designer';
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| bands | `Band[]` | ✓ | - | 带区设计数据 |
| data | `Record<string, any>` | ✓ | - | 预览数据 |
| dataFields | `DataField[]` | ✓ | - | 数据字段定义 |
| onClose | `() => void` | ✓ | - | 关闭回调 |
| pageSettings | `PageSettings` | ✓ | - | 页面设置（纸张尺寸、边距、方向等） |
| showPageNumbers | `boolean` | | `true` | 是否显示页码 |

### 打印输出函数

#### renderToHtml(options)

将设计模板和数据渲染为 HTML 字符串。

```typescript
import { renderToHtml } from 'print-designer';

const result = renderToHtml({
    design: DesignData,      // 设计数据（bands, pageSettings）
    data: object,            // 业务数据
    dataFields: DataField[], // 数据字段定义（必填）
});

// 返回结果
console.log(result.html);         // HTML 字符串
console.log(result.totalPages);   // 总页数
console.log(result.pageWidth);    // 页面宽度(px)
console.log(result.pageHeight);   // 页面高度(px)
console.log(result.paperWidthMm); // 纸张宽度(mm)
console.log(result.paperHeightMm);// 纸张高度(mm)
```

#### exportToPdf(options)

导出为 PDF 文件。

```typescript
import { exportToPdf } from 'print-designer';

await exportToPdf({
    design: DesignData,      // 设计数据
    data: object,            // 业务数据
    dataFields: DataField[], // 数据字段定义（必填）
    fileName?: string,       // 文件名（不含扩展名），默认 '报表_日期'
    download?: boolean,      // 是否直接下载，默认 true
    scale?: number,          // 图片缩放比例，默认 2
});

// 如果 download 为 false，返回 Blob 对象
const pdfBlob = await exportToPdf({ ...options, download: false });
```

#### getPrintableHtml(options)

获取完整的可打印 HTML 文档，包含样式和打印配置。

```typescript
import { getPrintableHtml } from 'print-designer';

const html = getPrintableHtml({
    design: DesignData,      // 设计数据
    data: object,            // 业务数据
    dataFields: DataField[], // 数据字段定义（必填）
});

// 返回完整的 HTML 文档字符串（包含 DOCTYPE、打印样式等）
// 可用于：
// - 发送给服务器生成 PDF
// - iframe 打印
// - 保存为 HTML 文件
```

#### openPrintWindow(options)

在新窗口中打开打印预览，并触发打印对话框。

```typescript
import { openPrintWindow } from 'print-designer';

openPrintWindow({
    design: DesignData,      // 设计数据
    data: object,            // 业务数据
    dataFields: DataField[], // 数据字段定义（必填）
});
// 会打开新窗口并自动调用 window.print()
```

## 类型定义

### DesignData

设计数据（统一的 JSON 结构）。

```typescript
interface DesignData {
    bands?: Band[];                    // 带区设计数据（可选，为空时使用默认带区）
    pageSettings?: PageSettings;       // 页面设置（可选，为空时使用默认 A4 设置）
}
```

### DataField

数据字段定义。

```typescript
interface DataField {
    name: string;                              // 字段名
    label: string;                             // 显示名称
    type: 'string' | 'number' | 'currency' | 'date';  // 数据类型
    source: 'master' | 'detail';               // 数据来源：master-主表字段, detail-明细字段
}
```

### Band

带区定义。

```typescript
interface Band {
    id: 'header' | 'detail' | 'summary' | 'footer';  // 带区ID
    name: string;                              // 带区名称
    type: string;                              // 带区类型
    top: number;                               // 顶部位置
    bottom: number;                            // 底部位置
    actualBottom: number;                      // 实际底部位置
    visible: boolean;                          // 是否可见
    objects: ControlObject[];                  // 带区内的控件
    backgroundColor?: string;                  // 背景色
    backgroundColorFormula?: string;           // 背景色公式
    summaryDisplayMode?: 'atEnd' | 'perPage' | 'perGroup';  // 汇总显示模式
}
```

### PageSettings

页面设置。

```typescript
interface PageSettings {
    paperSize: 'A4' | 'A3' | 'A5' | 'B4' | 'B5' | 'Letter' | 'Legal' | 'Custom';
    width: number;                             // 纸张宽度
    height: number;                            // 纸张高度
    unit: 'mm' | 'in';                         // 单位
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    orientation: 'portrait' | 'landscape';     // 纸张方向
}
```

### DesignerOptions

设计器配置。

```typescript
interface DesignerOptions {
    minBandHeight: number;       // 最小带区高度
    defaultBandHeight: number;   // 默认带区高度
    showGrid: boolean;           // 显示网格
    gridSize: number;            // 网格大小
    bandSpacing: number;         // 带区间距
}
```

## 支持的控件类型

| 控件类型 | 说明 | 主要属性 |
|----------|------|----------|
| `text` | 静态文本 | content, fontSize, color, fontWeight |
| `field` | 数据字段 | fieldName, format |
| `calculated` | 计算字段 | formula |
| `image` | 图片 | src, objectFit, floating |
| `barcode` | 条形码 | value, barcodeType, showText |
| `qrcode` | 二维码 | value, errorLevel |
| `line` | 线条 | x1, y1, x2, y2, strokeWidth, lineStyle |
| `rectangle` | 矩形 | backgroundColor, border |
| `page_number` | 页码 | format |
| `current_date` | 当前日期 | format |

## 导出清单

### 组件

```typescript
import {
    BandBoundaryDesigner,    // 主设计器组件
    PrintPreview,            // 打印预览组件
    ObjectPropertyPanel,     // 对象属性面板
    BandPropertyPanel,       // 带区属性面板
    Toolbar,                 // 工具栏
    CanvasArea,              // 画布区域
    ColorPicker,             // 颜色选择器
    FormulaEditor,           // 公式编辑器
    RichTextEditor,          // 富文本编辑器
    PageSettingsPanel,       // 页面设置面板
} from 'print-designer';
```

### 类型

```typescript
import type {
    Band,
    ControlObject,
    ControlObjectAll,
    DataField,
    DesignerOptions,
    DesignerState,
    BandBoundaryDesignerProps,
    PageSettings,
} from 'print-designer';
```

### 工具函数

```typescript
import {
    // 渲染工具
    getBandObjectsRenderData,
    getObjectRenderData,
    getObjectContent,
    
    // 公式工具
    evaluateFormula,
    validateFormula,
    registerFunction,
    getRegisteredFunctions,
    
    // 打印工具
    renderToHtml,
    exportToPdf,
    getPrintableHtml,
    openPrintWindow,
} from 'print-designer';
```

### 常量

```typescript
import {
    controlTypes,            // 控件类型列表
    defaultBands,            // 默认带区配置
    defaultOptions,          // 默认设计器选项
    defaultPageSettings,     // 默认页面设置
    pageSizePresets,         // 纸张尺寸预设
    marginPresets,           // 边距预设
    fontWeightOptions,       // 字体粗细选项
    fontStyleOptions,        // 字体样式选项
    textAlignOptions,        // 文本对齐选项
    borderStyles,            // 边框样式选项
    lineStyleOptions,        // 线条样式选项
    dateFormatOptions,       // 日期格式选项
    barcodeTypeOptions,      // 条码类型选项
    qrcodeErrorLevelOptions, // 二维码容错等级
    getDetailDataKey,        // 获取明细数据键名
} from 'print-designer';
```

### Hooks

```typescript
import {
    useBandDesigner,         // 设计器状态管理
    useHistory,              // 历史记录（撤销/重做）
} from 'print-designer';
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `方向键` | 微调选中对象位置 (1px) |
| `Shift + 方向键` | 快速移动 (10px) |
| `Alt + 方向键` | 调整对象尺寸 |
| `Shift + 拖动` | 锁定水平/垂直方向 |
| `Ctrl/Cmd + C` | 复制 |
| `Ctrl/Cmd + V` | 粘贴 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Y` | 重做 |
| `Delete/Backspace` | 删除选中对象 |

## 浏览器支持

- Chrome 80+ (推荐)
- Firefox 75+
- Safari 13+
- Edge 80+

## 依赖

- React 17+
- react-rnd (拖拽调整)
- jspdf (PDF 导出)
- html2canvas (页面截图)
- jsbarcode (条形码)
- qrcode (二维码)
- dompurify (XSS 防护)

## License

CC BY-NC 4.0 (非商业授权)

本项目仅限个人学习和非商业用途。如需商业授权，请联系：chengyihua@acbnlink.com

## 作者

程宜华 (chengyihua@acbnlink.com)

## 链接

- [GitHub](https://github.com/chengyihua/print-designer)
- [npm](https://www.npmjs.com/package/print-designer)
- [Issues](https://github.com/chengyihua/print-designer/issues)
