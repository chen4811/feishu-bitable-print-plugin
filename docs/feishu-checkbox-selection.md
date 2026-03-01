# 飞书多维表格复选框选中功能使用指南

## 核心概念

| 概念 | 激活单元格 | 复选框选中 |
|------|-----------|-----------|
| 触发方式 | 点击单元格 | 点击行首复选框 |
| SDK 事件 | `onSelectionChange` | `onRecordSelectChange` |
| 返回数据 | `{fieldId, recordId}` | `{recordIds: []}` |
| 选择状态 | 单格聚焦 | 多行选中 |
| 使用场景 | 模板编辑（单条数据预览） | 打印预览（多条数据打印） |

## 快速开始

### 方式1：使用 CheckboxSelectionManager（推荐）

```typescript
import { CheckboxSelectionManager } from '@/lib/feishu-env';

// 创建管理器实例
const manager = new CheckboxSelectionManager((records) => {
  console.log('选中的记录:', records);
});

// 初始化
await manager.init();

// 获取当前选中数量
const count = manager.getSelectedCount();
console.log(`当前选中 ${count} 条记录`);

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  manager.destroy();
});
```

### 方式2：使用便捷函数

```typescript
import { getCheckboxSelectedRecords, onRecordSelectChange } from '@/lib/feishu-env';

// 监听复选框变化
const unsubscribe = onRecordSelectChange(async (event) => {
  const { data } = event;
  console.log('选中记录IDs:', data.recordIds);
  console.log('是否全选:', data.isSelectAll);
  
  if (data.recordIds.length > 0) {
    const records = await getCheckboxSelectedRecords();
    console.log('选中记录数据:', records);
  }
});

// 取消监听
unsubscribe();
```

### 方式3：使用统一的 SDK 对象

```typescript
import { feishuEnv } from '@/lib/feishu-env';

// 初始化环境
await feishuEnv.init();

// 使用复选框功能
const unsubscribe = feishuEnv.onRecordSelectChange((event) => {
  console.log('复选框变化:', event);
});

// 手动获取当前选中记录
const records = await feishuEnv.getCheckboxSelectedRecords();
```

## 调试信息

所有功能都包含详细的调试日志，在浏览器控制台中可以看到：

```
🔍 环境调试开始
🌐 环境检查
🔄 设置复选框勾选变化监听器
🎯 复选框勾选事件触发!
📊 当前选中状态: {...}
✅ 数据加载成功: X 条记录
```

## 备用方案

如果事件监听器不工作，系统会自动启动轮询作为备用：

```typescript
import { startPolling, stopPolling } from '@/lib/feishu-env';

// 手动启动轮询（通常不需要）
startPolling(2000); // 每2秒检查一次

// 停止轮询
stopPolling();
```

## 完整示例

```typescript
import { feishuEnv, CheckboxSelectionManager } from '@/lib/feishu-env';

async function setupCheckboxSelection() {
  // 等待环境就绪
  await feishuEnv.init();
  
  // 创建管理器
  const manager = new CheckboxSelectionManager((records) => {
    // 处理选中的记录
    console.log('选中记录:', records);
    
    // 更新UI
    updatePrintPreview(records);
  });
  
  // 初始化
  await manager.init();
  
  // 手动获取当前选中
  document.getElementById('refresh-btn')?.addEventListener('click', async () => {
    const records = await feishuEnv.getCheckboxSelectedRecords();
    console.log('手动刷新:', records);
  });
  
  return manager;
}

// 启动
setupCheckboxSelection();
```
