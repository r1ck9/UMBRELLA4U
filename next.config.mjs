/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/about', destination: '/about.html' },
      { source: '/handbook', destination: '/handbook.html' },
      { source: '/umbrella4u', destination: '/org.html' },
    ]
  },
}
export default nextConfig
