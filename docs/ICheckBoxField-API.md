# 多维表格复选框（Checkbox）字段开发文档

## 概述

本文档描述了如何在多维表格（Base）SDK 中使用复选框字段（ICheckBoxField）进行数据交互。复选框字段用于存储布尔值（true/false），适用于标记状态、完成确认等场景。

---

## 接口定义

### ICheckBoxField

复选框字段的核心接口，提供对复选框字段的完整操作能力。

```typescript
interface ICheckBoxField {
  // 获取字段实例（静态方法）
  getField(table: ITable, fieldId: string): Promise<ICheckBoxField>;
  
  // 创建单元格
  createCell(val: IOpenCheckbox): Promise<ICell>;
  
  // 获取单元格对象
  getCell(recordOrId: IRecordType | string): Promise<ICell>;
  
  // 设置单元格值
  setValue(recordOrId: IRecordType | string, val: IOpenCheckbox): Promise<boolean>;
  
  // 获取单元格值
  getValue(recordOrId: IRecordType | string): Promise<IOpenCheckbox>;
}
```

### 类型定义

```typescript
// 复选框字段值类型
 type IOpenCheckbox = boolean;

// 字段元数据类型标识
enum FieldType {
  Checkbox = 8,  // 复选框字段类型值为 8
}
```

---

## 方法详解

### 1. getField - 获取字段实例

从指定表格中根据 fieldId 获取复选框字段实例。

**语法**
```typescript
const checkboxField = await table.getField<ICheckBoxField>(fieldId);
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| table | ITable | 是 | 表格实例对象 |
| fieldId | string | 是 | 复选框字段的唯一标识符 |

**返回值**
`Promise<ICheckBoxField>` - 复选框字段实例

**示例**
```typescript
// 获取表格实例
const table = await bitable.base.getTableById('tblHfXxxxxxx');

// 通过字段 ID 获取复选框字段
const checkboxField = await table.getField<ICheckBoxField>('fldGjYyyyyyy');

// 或通过字段名称获取
const fieldMetaList = await table.getFieldMetaList();
const checkboxFieldMeta = fieldMetaList.find(f => f.name === '已完成' && f.type === FieldType.Checkbox);
if (checkboxFieldMeta) {
  const checkboxField = await table.getField<ICheckBoxField>(checkboxFieldMeta.id);
}
```

---

### 2. createCell - 创建单元格

为复选框字段创建一个新的单元格对象，用于新建记录。

**语法**
```typescript
const cell = await checkboxField.createCell(val);
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| val | IOpenCheckbox (boolean) | 是 | 复选框的初始值，true 为选中，false 为未选中 |

**返回值**
`Promise<ICell>` - 单元格对象，可用于 addRecord

**示例**
```typescript
// 创建已选中的单元格
const checkedCell = await checkboxField.createCell(true);

// 创建未选中的单元格
const uncheckedCell = await checkboxField.createCell(false);

// 使用单元格创建新记录
await table.addRecord({
  fields: {
    'fldGjYyyyyyy': checkedCell
  }
});

// 或简写形式
await table.addRecord({
  fields: {
    'fldGjYyyyyyy': true  // SDK 会自动转换
  }
});
```

---

### 3. getCell - 获取单元格对象

根据记录 ID 获取该记录在复选框字段上的单元格对象。

**语法**
```typescript
const cell = await checkboxField.getCell(recordOrId);
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordOrId | IRecordType \| string | 是 | 记录对象或记录 ID |

**返回值**
`Promise<ICell>` - 单元格对象

**示例**
```typescript
// 通过记录 ID 获取单元格
const cell = await checkboxField.getCell('recAbc123456');

// 或通过记录对象获取
const record = await table.getRecordById('recAbc123456');
const cell = await checkboxField.getCell(record);

// 获取单元格值
const value = await cell.getValue();
console.log(value); // true 或 false
```

---

### 4. setValue - 设置单元格值

设置指定记录的复选框字段值。

**语法**
```typescript
await checkboxField.setValue(recordOrId, newValue);
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordOrId | IRecordType \| string | 是 | 目标记录对象或 ID |
| val | IOpenCheckbox (boolean) | 是 | 要设置的新值 |

**返回值**
`Promise<boolean>` - 操作是否成功

**示例**
```typescript
// 将记录标记为已完成
await checkboxField.setValue('recAbc123456', true);

// 取消标记
await checkboxField.setValue('recAbc123456', false);

// 批量更新多条记录
const recordIds = ['rec001', 'rec002', 'rec003'];
for (const recordId of recordIds) {
  await checkboxField.setValue(recordId, true);
}

// 根据条件设置值
const records = await table.getRecords();
for (const record of records) {
  const status = await record.getCellValue('fldStatus');
  if (status === '已审核') {
    await checkboxField.setValue(record.id, true);
  }
}
```

---

### 5. getValue - 获取单元格值

获取指定记录的复选框字段当前值。

**语法**
```typescript
const value = await checkboxField.getValue(recordOrId);
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordOrId | IRecordType \| string | 是 | 目标记录对象或 ID |

**返回值**
`Promise<IOpenCheckbox>` (Promise<boolean>) - 当前布尔值

**示例**
```typescript
// 获取单条记录的复选框值
const isCompleted = await checkboxField.getValue('recAbc123456');
console.log(isCompleted ? '已完成' : '未完成');

// 批量统计已完成数量
const records = await table.getRecords();
let completedCount = 0;
for (const record of records) {
  const isChecked = await checkboxField.getValue(record.id);
  if (isChecked) {
    completedCount++;
  }
}
console.log(`已完成 ${completedCount}/${records.length} 条`);

// 筛选未完成的记录
const uncheckedRecords = [];
for (const record of records) {
  const isChecked = await checkboxField.getValue(record.id);
  if (!isChecked) {
    uncheckedRecords.push(record);
  }
}
```

---

## 获取数据方案对比

### 方案一：通过记录批量获取（推荐）

适用于需要同时获取多个字段值的场景。

```typescript
const table = await bitable.base.getTableById('tblXxx');
const records = await table.getRecords();

for (const record of records) {
  // 一次性获取多个字段值
  const fields = await record.getFields();
  const isChecked = fields['fldCheckbox'] as boolean;
  const taskName = fields['fldTaskName'] as string;
  
  console.log(`${taskName}: ${isChecked ? '✓' : '○'}`);
}
```

**优点**：
- 减少 API 调用次数
- 适合数据导出、批量处理

**缺点**：
- 字段值为原始类型，需手动转换
- 不适用于实时更新场景

---

### 方案二：通过字段实例获取（精确控制）

适用于需要精确控制复选框字段的场景。

```typescript
const table = await bitable.base.getTableById('tblXxx');
const checkboxField = await table.getField<ICheckBoxField>('fldCheckbox');

const records = await table.getRecords();
for (const record of records) {
  const isChecked = await checkboxField.getValue(record.id);
  // 处理逻辑...
}
```

**优点**：
- 类型安全，有完整 IDE 提示
- 可链式调用字段方法（setValue 等）
- 适合需要对字段进行读写操作的场景

**缺点**：
- 需要额外的字段实例获取步骤

---

### 方案三：通过单元格对象获取（精细操作）

适用于需要对单元格进行复杂操作的场景。

```typescript
const table = await bitable.base.getTableById('tblXxx');
const checkboxField = await table.getField<ICheckBoxField>('fldCheckbox');

const record = await table.getRecordById('recXxx');
const cell = await checkboxField.getCell(record);

// 获取值
const value = await cell.getValue();

// 监听单元格变化（如支持）
cell.on('change', (newValue) => {
  console.log('复选框状态变更:', newValue);
});
```

**优点**：
- 可操作单元格级别的属性和事件
- 适合需要监听变化的场景

**缺点**：
- API 相对复杂
- 需要处理单元格对象的生命周期

---

## 最佳实践

### 1. 字段类型校验

在获取字段前，建议先校验字段类型，避免运行时错误。

```typescript
const fieldMeta = await table.getFieldMetaById(fieldId);
if (fieldMeta.type !== FieldType.Checkbox) {
  throw new Error(`字段 ${fieldMeta.name} 不是复选框类型`);
}
const checkboxField = await table.getField<ICheckBoxField>(fieldId);
```

### 2. 批量操作优化

对于大量数据的读写，建议使用批量操作减少 API 调用。

```typescript
// 不推荐：逐条更新
for (const recordId of recordIds) {
  await checkboxField.setValue(recordId, true); // N 次 API 调用
}

// 推荐：批量更新（如 SDK 支持）
await table.updateRecords(
  recordIds.map(id => ({
    recordId: id,
    fields: {
      'fldCheckbox': true
    }
  }))
);
```

### 3. 默认值处理

复选框字段可能为 null/undefined，建议提供默认值。

```typescript
const isChecked = await checkboxField.getValue(recordId);
const safeValue = isChecked ?? false; // 默认为 false
```

### 4. 响应式更新

在 UI 中展示复选框时，确保数据变更后刷新视图。

```typescript
// 更新复选框值
await checkboxField.setValue(recordId, !currentValue);

// 重新获取最新值刷新 UI
const newValue = await checkboxField.getValue(recordId);
setCheckboxState(newValue);
```

---

## 错误处理

```typescript
try {
  const checkboxField = await table.getField<ICheckBoxField>(fieldId);
  const value = await checkboxField.getValue(recordId);
} catch (error) {
  if (error.code === 'FIELD_NOT_FOUND') {
    console.error('字段不存在，请检查 fieldId');
  } else if (error.code === 'RECORD_NOT_FOUND') {
    console.error('记录不存在，请检查 recordId');
  } else if (error.code === 'FIELD_TYPE_MISMATCH') {
    console.error('字段类型不匹配，目标字段不是复选框类型');
  } else {
    console.error('操作失败:', error);
  }
}
```

---

## 完整示例：任务清单应用

```typescript
import { bitable, FieldType } from '@lark-base-open/js-sdk';

class TaskManager {
  private table: ITable;
  private checkboxField: ICheckBoxField;
  private taskNameField: ITextField;
  
  constructor(tableId: string, checkboxFieldId: string, taskNameFieldId: string) {
    this.table = await bitable.base.getTableById(tableId);
    this.checkboxField = await this.table.getField<ICheckBoxField>(checkboxFieldId);
    this.taskNameField = await this.table.getField<ITextField>(taskNameFieldId);
  }
  
  // 获取所有未完成任务
  async getIncompleteTasks() {
    const records = await this.table.getRecords();
    const incompleteTasks = [];
    
    for (const record of records) {
      const isCompleted = await this.checkboxField.getValue(record.id);
      if (!isCompleted) {
        const taskName = await this.taskNameField.getValue(record.id);
        incompleteTasks.push({
          recordId: record.id,
          name: taskName,
        });
      }
    }
    
    return incompleteTasks;
  }
  
  // 完成任务
  async completeTask(recordId: string) {
    await this.checkboxField.setValue(recordId, true);
    console.log('任务已完成');
  }
  
  // 重置任务状态
  async resetTask(recordId: string) {
    await this.checkboxField.setValue(recordId, false);
    console.log('任务已重置');
  }
  
  // 批量完成所有任务
  async completeAllTasks() {
    const records = await this.table.getRecords();
    const updateList = records.map(record => ({
      recordId: record.id,
      fields: {
        [this.checkboxField.id]: true
      }
    }));
    
    await this.table.updateRecords(updateList);
    console.log(`已完成 ${records.length} 个任务`);
  }
  
  // 统计完成率
  async getCompletionRate() {
    const records = await this.table.getRecords();
    let completedCount = 0;
    
    for (const record of records) {
      const isCompleted = await this.checkboxField.getValue(record.id);
      if (isCompleted) completedCount++;
    }
    
    return {
      total: records.length,
      completed: completedCount,
      rate: records.length > 0 ? (completedCount / records.length * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// 使用示例
const taskManager = new TaskManager('tblXxx', 'fldCheckbox', 'fldTaskName');
const incompleteTasks = await taskManager.getIncompleteTasks();
console.log('待办任务:', incompleteTasks);

const rate = await taskManager.getCompletionRate();
console.log(`完成进度: ${rate.completed}/${rate.total} (${rate.rate})`);
```

---

## 相关资源

- [多维表格 SDK 官方文档](https://open.larksuite.com/document/uAjLw4CM/uYjL24iN/base/introduction)
- [字段类型定义参考](https://open.larksuite.com/document/uAjLw4CM/uYjL24iN/base/field-types)
- [ITable 接口文档](https://open.larksuite.com/document/uAjLw4CM/uYjL24iN/base/itable)

---

## 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-01-13 | 初始版本，包含 ICheckBoxField 完整接口定义 |
