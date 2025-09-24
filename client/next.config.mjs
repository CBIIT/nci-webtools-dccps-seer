/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "",
  experimental: {
    proxyTimeout: 1000 * 60 * 15,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
