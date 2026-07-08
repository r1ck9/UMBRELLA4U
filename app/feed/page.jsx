import { getStories } from '@/lib/stories'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import Composer from '@/components/Composer'
import FeedList from '@/components/FeedList'
import FeedTour from '@/components/FeedTour'
import SafetyNote from '@/components/SafetyNote'

export const dynamic = 'force-dynamic'

const CAT_NAMES = {
  identity: 'Identity', school: 'School life', mind: 'Mental health',
  culture: 'Culture', wins: 'Small wins', vent: 'Venting'
}

export default async function Feed({ searchParams }) {
  const cat = searchParams?.cat || 'all'
  const { stories, live } = await getStories(cat === 'all' ? null : cat)

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active={cat} />
        <main className="feed">
          {!live && (
            <p className="notice">Sample stories. Connect Supabase (see <code>README.md</code>) to make it live.</p>
          )}
          {cat !== 'all' && <h2 className="feedhead">{CAT_NAMES[cat] || cat}</h2>}
          <SafetyNote />
          <p className="care-banner">🫂 We know some days are heavy. However you&apos;re feeling, you&apos;re welcome here — just be kind to yourself, and to everyone else.</p>
          <Composer />
          {stories.length === 0
            ? <p className="empty">No stories here yet. Be the first to share this weather. ☂</p>
            : <FeedList stories={stories} category={cat === 'all' ? null : cat} />}
        </main>
        <Rail />
      </div>
      <FeedTour />
    </>
  )
}
