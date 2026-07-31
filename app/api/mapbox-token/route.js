export const dynamic = 'force-dynamic'

export function GET() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  return Response.json({ token, configured: Boolean(token) })
}
