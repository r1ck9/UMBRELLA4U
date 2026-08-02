import { adminSupabase } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$/i

export async function GET(_req, { params }) {
  const userId = params?.userId || ''
  const file = params?.file || ''
  if (!UUID.test(userId) || !FILE.test(file)) {
    return new Response('Not found', { status: 404 })
  }

  const admin = adminSupabase()
  if (!admin) return new Response('Unavailable', { status: 503 })

  const photoPath = `${userId}/${file}`
  const { data: profile } = await admin.from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('avatar_url', `avatar:${photoPath}`)
    .maybeSingle()
  if (!profile) return new Response('Not found', { status: 404 })

  const { data, error } = await admin.storage.from('avatars').download(photoPath)
  if (error || !data) return new Response('Not found', { status: 404 })

  return new Response(await data.arrayBuffer(), {
    headers: {
      'Content-Type': file.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
