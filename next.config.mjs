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
  // Baseline browser protections on every route: no framing by other sites
  // (clickjacking), no MIME sniffing, no full URLs leaked to other origins, and
  // camera/mic/location limited to this site.
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()' },
      ],
    }]
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
