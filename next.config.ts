import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // 静态导出配置（用于飞书多维表格插件）
  output: 'export',
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
