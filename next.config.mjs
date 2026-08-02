/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep recently visited Haven routes in the browser briefly so returning
    // to the live feed is instant. FeedList refreshes this cached view in the
    // background and listens for live story changes.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async rewrites() {
    return {
      // beforeFiles runs before app routes, so this replaces the homepage:
      // umbrella4u.ca/ now serves the Umbrella4U org info page.
      beforeFiles: [
        { source: '/', destination: '/org.html' },
      ],
      afterFiles: [
        { source: '/about', destination: '/about.html' },
        { source: '/team', destination: '/team.html' },
        { source: '/about-us', destination: '/team.html' },   // legacy alias → /team
        { source: '/handbook', destination: '/handbook.html' },
        { source: '/umbrella4u', destination: '/org.html' },
      ],
    }
  },
}
export default nextConfig
