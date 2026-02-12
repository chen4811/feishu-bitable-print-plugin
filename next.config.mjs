/** @type {import('next').NextConfig} */
const nextConfig = {
  // 飞书插件需要静态导出
  output: 'export',

  // 禁用图片优化（飞书插件不支持）
  images: {
    unoptimized: true,
  },

  // 启用严格模式
  reactStrictMode: true,

  // 环境变量
  env: {
    APP_NAME: '飞书多维表格排版打印插件',
    APP_VERSION: '2.0.0',
  },

  // 压缩
  compress: true,

  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // 飞书插件相关配置
  trailingSlash: true,
  
  // Turbopack 配置（Next.js 16 默认使用）
  turbopack: {},
};

export default nextConfig;
