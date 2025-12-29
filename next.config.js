/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  // Code splitting
  webpack: (config, { isServer }) => {
    // ffprobe-static과 ffmpeg-static의 바이너리 파일을 외부화
    if (isServer) {
      config.externals = config.externals || [];
      // 배열로 추가하여 기존 externals와 병합
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'ffprobe-static': 'commonjs ffprobe-static',
          'ffmpeg-static': 'commonjs ffmpeg-static',
        });
      } else {
        config.externals = [
          config.externals,
          {
            'ffprobe-static': 'commonjs ffprobe-static',
            'ffmpeg-static': 'commonjs ffmpeg-static',
          },
        ];
      }
    }
    
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'async',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig

