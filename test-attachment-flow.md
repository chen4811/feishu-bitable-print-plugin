/**
 * 附件变量数据流测试脚本
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具
 * 2. 选择包含附件的记录
 * 3. 查看控制台日志
 * 
 * 预期日志流：
 * [TP] ========== 开始为附件字段获取真实URL ==========
 * [AttachmentEnrich-Start] 开始处理记录: recxxx
 * [AttachmentEnrich-Found] 发现附件字段: 附件 type: attachment
 * [AttachmentEnrich-Call] 调用 getAttachmentUrls for record recxxx
 * [AttachmentEnrich-Result] 获取到 1 个真实URL: ["https://..."]
 * [AttachmentEnrich-Inject] [0] IMG_xxx.jpg: 注入 URL https://...
 * [TP] 字段映射: fldT0YzdsZ -> 附件, 值类型: object 是否是数组: true
 * [Render-Debug] [0] IMG_xxx.jpg: 是否图片=true, 是否有URL=true  <-- 关键！
 */

// 如果日志中出现以下情况，说明修复未生效：
// 1. [AttachmentEnrich-Warn] 未找到任何附件字段 -- 字段类型判断失败
// 2. [AttachmentEnrich] 检查字段: 附件 (ID: fldT0YzdsZ), 值存在: false -- 字段键不匹配
// 3. [Render-Debug] [0] IMG_xxx.jpg: 是否图片=true, 是否有URL=false -- URL 注入失败
