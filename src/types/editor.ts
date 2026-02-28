// 排版打印插件核心类型定义

// 组件类型枚举
export type ComponentType = 
  | 'text'       // 文本组件
  | 'table'      // 表格组件
  | 'image'      // 图片组件
  | 'qrcode'     // 二维码
  | 'barcode'    // 条形码
  | 'line'       // 水平线
  | 'freeElement' // 自由拖动元素
  | 'article'    // 文章区块
  | 'autoTable'; // 自动表格

// 字段类型
export interface Field {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  isSystem?: boolean;
}

// 组件基础属性
export interface BaseComponentProps {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

// 文本组件
export interface TextComponent extends BaseComponentProps {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

// 表格组件
export interface TableComponent extends BaseComponentProps {
  type: 'table';
  columns: {
    fieldId: string;
    fieldName: string;
    width: number;
  }[];
  showHeader: boolean;
  headerStyle: {
    backgroundColor: string;
    fontWeight: 'normal' | 'bold';
  };
}

// 图片组件
export interface ImageComponent extends BaseComponentProps {
  type: 'image';
  src: string;
  alt: string;
  fit: 'contain' | 'cover' | 'fill';
}

// 二维码组件
export interface QRCodeComponent extends BaseComponentProps {
  type: 'qrcode';
  content: string; // 可以是字段变量 [字段名]
  size: number;
}

// 条形码组件
export interface BarcodeComponent extends BaseComponentProps {
  type: 'barcode';
  content: string;
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC';
  width: number;
  height: number;
}

// 水平线组件
export interface LineComponent extends BaseComponentProps {
  type: 'line';
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
}

// 自动表格组件
export interface AutoTableComponent extends BaseComponentProps {
  type: 'autoTable';
  viewId?: string;
  selectedFields: string[];
  showHeader: boolean;
  headerStyle: {
    backgroundColor: string;
    fontWeight: 'normal' | 'bold';
  };
}

// 自由拖动元素组件
export interface FreeElementComponent extends BaseComponentProps {
  type: 'freeElement';
  content?: string;
}

// 文章区块组件
export interface ArticleComponent extends BaseComponentProps {
  type: 'article';
  content: string;
}

// 组件联合类型
export type EditorComponent = 
  | TextComponent 
  | TableComponent 
  | ImageComponent 
  | QRCodeComponent 
  | BarcodeComponent 
  | LineComponent 
  | AutoTableComponent
  | FreeElementComponent
  | ArticleComponent;

// 页面设置
export interface PageConfig {
  size: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  orientation: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  continuous: boolean; // 连续页面模式
}

// 全局样式设置
export interface StyleConfig {
  fontSize: number; // pt
  lineHeight: number;
  paragraphSpacing: number; // pt
  fontFamily: string;
}

// 排版模板
export interface PrintTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  tags: string[];
  components: EditorComponent[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  createdAt: number;
  updatedAt: number;
}

// 预设模板
export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  format: 'DOCX' | 'PDF' | 'EXCEL';
  isPremium?: boolean;
}

// 打印记录
export interface PrintRecord {
  id: string;
  templateId: string;
  recordIds: string[];
  createdAt: number;
  status: 'pending' | 'completed' | 'failed';
}

// 纸张尺寸映射 (mm)
export const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

// 默认页面配置
export const DEFAULT_PAGE_CONFIG: PageConfig = {
  size: 'A4',
  orientation: 'portrait',
  margins: {
    top: 17.3,
    bottom: 17.3,
    left: 13.5,
    right: 13.5,
  },
  continuous: false,
};

// 默认样式配置
export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  fontSize: 9,
  lineHeight: 1.5,
  paragraphSpacing: 0,
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
};

// 组件默认尺寸
export const DEFAULT_COMPONENT_SIZES: Record<ComponentType, { width: number; height: number }> = {
  text: { width: 200, height: 40 },
  table: { width: 400, height: 200 },
  image: { width: 100, height: 100 },
  qrcode: { width: 80, height: 80 },
  barcode: { width: 150, height: 50 },
  line: { width: 400, height: 2 },
  freeElement: { width: 100, height: 100 },
  article: { width: 400, height: 150 },
  autoTable: { width: 400, height: 200 },
};
