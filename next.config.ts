import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Netlify Functions가 firebase-admin의 ESM 인증 의존성을 함께 번들링하도록 합니다.
  transpilePackages: ['firebase-admin', 'jwks-rsa', 'jose'],
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
