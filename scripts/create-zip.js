const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const sourceDir = 'feishu-plugin';
const outputFile = 'feishu-bitable-plugin-v2.0.0.zip';

console.log('开始创建 ZIP 文件...');

try {
  const zip = new AdmZip();

  // 添加所有文件到 zip
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    const filePath = path.join(sourceDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 添加目录
      zip.addLocalFolder(filePath, file);
    } else if (file !== 'ICON_REQUIRED.txt') {
      // 添加文件（排除说明文件）
      zip.addLocalFile(filePath);
    }
  });

  // 写入 zip 文件
  zip.writeZip(outputFile);

  console.log(`✅ ZIP 文件创建成功: ${outputFile}`);

  // 显示文件信息
  const stats = fs.statSync(outputFile);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`文件大小: ${sizeInMB} MB`);

  if (parseFloat(sizeInMB) > 10) {
    console.warn('⚠️  警告：文件大小超过 10MB，可能影响上传');
  } else {
    console.log('✅ 文件大小符合要求（< 10MB）');
  }

} catch (error) {
  console.error('❌ 创建 ZIP 文件失败:', error);
  process.exit(1);
}
