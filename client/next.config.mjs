/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_BASE_URL || "http://localhost:9000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
