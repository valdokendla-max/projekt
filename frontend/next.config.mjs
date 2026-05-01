import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendProxyTarget = (process.env.BACKEND_PROXY_TARGET || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '')).replace(/\/$/, '')
const contentSecurityPolicy = [
  'upgrade-insecure-requests',
  'block-all-mixed-content',
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', 'pg'],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ]
  },
  async rewrites() {
    if (!backendProxyTarget) {
      return []
    }

    return [
      {
        source: '/backend/:path*',
        destination: `${backendProxyTarget}/:path*`,
      },
    ]
  },
}

export default nextConfig
