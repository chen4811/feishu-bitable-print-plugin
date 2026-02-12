/** @type {import('next').NextConfig} */
const nextConfig = {
  // 输出模式：standalone 用于 Docker 部署
  output: process.env.DOCKER ? 'standalone' : undefined,

  // 启用严格模式
  reactStrictMode: true,

  // 优化图片
  images: {
    domains: ['lf-coze-web-cdn.coze.cn'],
    formats: ['image/avif', 'image/webp'],
  },

  // 环境变量
  env: {
    APP_NAME: '飞书多维表格自定义排版插件',
    APP_VERSION: '1.0.0',
  },

  // 压缩
  compress: true,

  // 性能优化
  swcMinify: true,

  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
