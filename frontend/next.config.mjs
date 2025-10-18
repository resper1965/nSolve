/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
