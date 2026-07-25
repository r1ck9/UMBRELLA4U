/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // beforeFiles runs before app routes, so this replaces the homepage:
      // umbrella4u.ca/ now serves the Umbrella4U org info page.
      beforeFiles: [
        { source: '/', destination: '/org.html' },
      ],
      afterFiles: [
        { source: '/about', destination: '/about.html' },
        { source: '/about-us', destination: '/about-us.html' },
        { source: '/team', destination: '/about-us.html' },
        { source: '/handbook', destination: '/handbook.html' },
        { source: '/umbrella4u', destination: '/org.html' },
      ],
    }
  },
}
export default nextConfig
