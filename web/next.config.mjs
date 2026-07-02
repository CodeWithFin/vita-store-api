/** @type {import('next').NextConfig} */
const apiBase = process.env.VITASTORE_API_BASE_URL || 'http://localhost:3000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
      { source: '/assets/:path*', destination: `${apiBase}/assets/:path*` },
    ];
  },
};

export default nextConfig;
