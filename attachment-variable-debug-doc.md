# 附件变量读取问题技术文档

## 问题概述
在飞书打印插件中，绑定到"附件"类型字段的变量无法正确渲染图片，而是直接显示附件的文件名文本。

**日志证据**：
```json
"fldT0YzdsZ": [
  {
    "name": "IMG_20260313_084441.jpg",
    "size": 5665738,
    "type": "image/jpeg",
    "token": "XbfHbfxbMofHMIxVDBtcSgJpnwe",
    "timeStamp": 1773380886221,
    "permission": {
      "tableId": "tblRCwmdw4yGjxZV",
      "fieldId": "fldT0YzdsZ",
      "recordId": "recxerJFVk"
    }
  }
]
```

日志中显示附件元数据已正确获取，但**未发现 `getAttachmentUrls` 调用痕迹**，也未生成临时下载链接。

---

## 涉及的完整代码文件

### 1. 数据获取层
**文件**: `src/lib/feishu-env.ts`

| 函数 | 行号 | 功能 |
|------|------|------|
| `fetchFields()` | 463-520 | 获取字段元数据，返回 `{id, name, type}` |
| `getSelectedRecords()` | 522-600 | 获取选中记录，返回 `record.fields` |
| `FIELD_TYPE_MAP` | 94-99 | 字段类型映射：`11: 'attachment'` |

**关键数据结构**:
```typescript
// fetchFields 返回
[{ id: "fldT0YzdsZ", name: "附件", type: "attachment" }]

// getSelectedRecords 返回
{
  "fldT0YzdsZ": [{ name: "xxx.jpg", token: "..." }]  // 键是字段ID
}
```

---

### 2. 编辑页面数据处理
**文件**: `src/components/editor/EditorPage.tsx`

| 函数/代码 | 行号 | 功能 |
|-----------|------|------|
| `enrichAttachmentUrls()` | 66-130 | **核心函数**：调用 SDK 获取附件真实 URL |
| 附件字段筛选 | 79 | `fieldMetaList.filter(f => f.type === 11 \|\| f.type === 'attachment')` |
| 字段值访问 | 96 | `enrichedFields[fieldId]` - 使用字段ID访问 |
| SDK 调用 | 105 | `(field as any).getAttachmentUrls(recordId)` |
| URL 注入 | 117 | `enrichedFields[fieldId] = fieldValue.map(...)` |
| 初始化调用 | 269 | `enrichAttachmentUrls(record.id, tableId, record.fields, fields)` |
| 行选中调用 | 322 | `onSelectionChange` 中调用 |

**核心代码**:
```typescript
const enrichAttachmentUrls = async (
  recordId: string,
  tableId: string,
  fields: Record<string, any>,
  fieldMetaList: any[]
): Promise<Record<string, any>> => {
  // 筛选附件字段（原始类型11，映射后为'attachment'）
  const attachmentFields = fieldMetaList.filter(f => 
    f.type === 11 || f.type === 'attachment'
  );
  
  const table = await base.getTable(tableId);
  
  for (const fieldMeta of attachmentFields) {
    const fieldName = fieldMeta.name;      // "附件"
    const fieldId = fieldMeta.id;          // "fldT0YzdsZ"
    
    // 【关键】使用字段ID访问，不是字段名称
    const fieldValue = enrichedFields[fieldId];
    
    if (!Array.isArray(fieldValue)) continue;
    
    const field = await table.getField(fieldId);
    const realUrls = await (field as any).getAttachmentUrls(recordId);
    
    // 注入真实URL
    enrichedFields[fieldId] = fieldValue.map((item, index) => ({
      ...item,
      url: realUrls[index],
      fileUrl: realUrls[index],
    }));
  }
};
```

---

### 3. 打印预览数据处理
**文件**: `src/components/editor/TemplatePreview.tsx`

| 函数/代码 | 行号 | 功能 |
|-----------|------|------|
| `enrichAttachmentUrls()` | 234-290 | 与 EditorPage 相同的函数 |
| 附件字段筛选 | 241 | `filter(f => f.type === 11 \|\| f.type === 'attachment')` |
| 字段值访问 | 256 | `enrichedFields[fieldId]` |
| HTML 渲染 | 339-445 | `formatFieldValueToHTML()` 生成 `<img>` 标签 |
| 图片判断 | 405 | `isImageAttachment()` |
| 图片生成 | 424-443 | 生成 `<img src="${url}">` |
| React 渲染 | 890-960 | 渲染 `<img>` 组件 |

---

### 4. 变量渲染组件
**文件**: `src/components/VariableTextRenderer.tsx`

| 函数/代码 | 行号 | 功能 |
|-----------|------|------|
| `getRawFieldValue()` | 33-57 | 从记录获取原始字段值 |
| 附件检测 | 68-72 | `isAttachmentField(rawValue)` |
| 图片渲染 | 73-90 | 渲染 `<img>` 标签 |
| 文本渲染 | 92-99 | `VariableChip` 显示文本 |

**关键逻辑**:
```typescript
const rawValue = getRawFieldValue(fieldName, records, fields);

if (isAttachmentField(rawValue)) {
  const imageUrls = getAttachmentImageUrls(rawValue);
  return (
    <span>
      {imageUrls.map((url, idx) => (
        <img key={idx} src={url} style={{ maxWidth: '80px' }} />
      ))}
    </span>
  );
} else {
  return <VariableChip value={getFieldValue(...)} />;
}
```

---

### 5. 工具函数
**文件**: `src/utils/smartVariableRenderer.ts`

| 函数 | 行号 | 功能 |
|------|------|------|
| `isImageAttachment()` | 60-75 | 判断是否为图片附件 |
| `isAttachmentField()` | 77-89 | 检测是否为附件数组 |
| `getAttachmentImageUrls()` | 91-100 | 提取图片 URL 列表 |
| `getFieldValue()` | 129-220 | 获取字段值文本 |

---

### 6. 变量芯片
**文件**: `src/components/VariableChip.tsx`

- 纯文本显示组件
- 只显示 `value` 文本，不处理图片

---

## 数据流完整链路

```
┌─────────────────────────────────────────────────────────────────────┐
│                         飞书多维表格                                │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 附件字段     │  │ fldT0YzdsZ       │  │ {name, token, type}  │  │
│  │ (类型 11)    │  │ 字段ID           │  │ 原始数据             │  │
│  └──────────────┘  └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      src/lib/feishu-env.ts                          │
│  fetchFields()  →  [{id: "fldT0YzdsZ", name: "附件", type: "attachment"}]│
│  getSelectedRecords() → { "fldT0YzdsZ": [{name: "xxx.jpg", token:...}] }│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    src/components/editor/EditorPage.tsx             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ enrichAttachmentUrls(recordId, tableId, record.fields, fields)│  │
│  │                                                              │  │
│  │  1. 筛选附件字段: fieldMetaList.filter(f => f.type === 11)   │  │
│  │  2. 访问字段值:   record.fields[fieldId]  // 用ID访问        │  │
│  │  3. 调用 SDK:     field.getAttachmentUrls(recordId)          │  │
│  │  4. 注入 URL:     item.url = realUrl                         │  │
│  │  5. 返回:         enrichedFields                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                │
│                                    ▼                                │
│  setRecords(enrichedFields) → 保存到 useEditorStore                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 src/components/VariableTextRenderer.tsx             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. 从 store 获取 records                                       │  │
│  │ 2. 检测附件: isAttachmentField(rawValue)                       │  │
│  │ 3. 提取 URL: getAttachmentImageUrls(rawValue)                  │  │
│  │ 4. 渲染:     <img src={url}>                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 已知的修改历史

### 修复 1: 字段类型检测
- **问题**: 错误检测 `f.type === 17`（17 是 relation 类型）
- **修复**: 改为 `f.type === 11 || f.type === 'attachment'`
- **文件**: EditorPage.tsx, TemplatePreview.tsx

### 修复 2: 字段访问键
- **问题**: 使用字段名称访问 `enrichedFields[fieldName]`
- **修复**: 使用字段ID访问 `enrichedFields[fieldId]`
- **原因**: `record.fields` 使用字段ID作为键
- **文件**: EditorPage.tsx, TemplatePreview.tsx

### 修复 3: 变量渲染组件
- **添加**: `VariableTextRenderer.tsx` 支持附件图片渲染
- **添加**: `smartVariableRenderer.ts` 附件检测函数

---

## 当前问题状态

**现象**: 附件变量仍只显示文件名，不显示图片

**已确认**:
1. ✅ `fetchFields()` 返回正确的附件字段元数据
2. ✅ `getSelectedRecords()` 返回包含附件原始数据的记录
3. ✅ `enrichAttachmentUrls()` 函数逻辑正确
4. ✅ 字段类型检测正确（11 或 'attachment'）
5. ✅ 字段访问键正确（使用字段ID）

**待排查**:
1. ❓ `enrichAttachmentUrls()` 是否被正确调用？
2. ❓ `field.getAttachmentUrls(recordId)` 是否成功执行？
3. ❓ 注入的 URL 是否正确传递到 VariableTextRenderer？
4. ❓ VariableTextRenderer 是否正确检测附件类型？

---

## 关键调试日志

应在控制台查看的日志标记：
- `[EditorPage-Attachment]` - EditorPage 附件处理
- `[AttachmentEnrich]` - TemplatePreview 附件处理
- `[AttachmentDebug]` - 调试函数输出

**如果未看到这些日志**，说明 `enrichAttachmentUrls()` 未被调用。

---

## 建议排查方向

1. **检查调用链**: 确认 `enrichAttachmentUrls()` 在数据获取后被调用
2. **检查条件判断**: 确认附件字段被正确筛选（添加更多日志）
3. **检查 SDK 调用**: 确认 `getAttachmentUrls()` 返回有效 URL
4. **检查数据流**: 确认 enrichedFields 正确保存到 store
5. **检查渲染层**: 确认 VariableTextRenderer 正确检测附件类型

---

## 相关文件清单

```
src/
├── lib/
│   └── feishu-env.ts          # 数据获取
├── components/
│   ├── editor/
│   │   ├── EditorPage.tsx     # 编辑页面数据处理
│   │   └── TemplatePreview.tsx # 打印预览数据处理
│   ├── VariableTextRenderer.tsx # 变量渲染
│   └── VariableChip.tsx       # 文本芯片
└── utils/
    └── smartVariableRenderer.ts # 工具函数
```
