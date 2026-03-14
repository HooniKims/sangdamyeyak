import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Service Worker 스코프 헤더 설정
  async headers() {
    return [
      {
        source: '/sw-v2.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
