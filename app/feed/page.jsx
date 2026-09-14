import { getStories } from '@/lib/stories'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import Composer from '@/components/Composer'
import FeedList from '@/components/FeedList'
import FeedTour from '@/components/FeedTour'
import SafetyNote from '@/components/SafetyNote'
import SeenBanner from '@/components/SeenBanner'
import CommunityPulse from '@/components/CommunityPulse'
import CareBanner from '@/components/CareBanner'
import FeedDecor from '@/components/FeedDecor'

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
      <FeedDecor />
      <TopBar />
      <div className="shell">
        <Nav active={cat} />
        <main className="feed">
          {!live && (
            <p className="notice">Sample stories. Connect Supabase (see <code>README.md</code>) to make it live.</p>
          )}
          {cat !== 'all' && <h2 className="feedhead">{CAT_NAMES[cat] || cat}</h2>}
          <SeenBanner />
          <CommunityPulse />
          <SafetyNote />
          <CareBanner />
          <Composer />
          {stories.length === 0
            ? <p className="empty">Nothing here yet. You could be the first. ☂</p>
            : <FeedList stories={stories} category={cat === 'all' ? null : cat} />}
        </main>
        <Rail />
      </div>
      <FeedTour />
    </>
  )
}
