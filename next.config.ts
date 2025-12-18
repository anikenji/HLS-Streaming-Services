const nextConfig = {
  // External packages for server components
  serverExternalPackages: ['better-sqlite3'],

  // Enable static file serving for HLS and thumbnails
  async rewrites() {
    return [
      {
        source: '/hls/:path*',
        destination: '/api/hls/:path*',
      },
      {
        source: '/thumbnails/:path*',
        destination: '/api/thumbnails/:path*',
      },
    ];
  },

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
