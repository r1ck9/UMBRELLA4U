'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import StoryCard from '@/components/StoryCard'
import FollowButton from '@/components/FollowButton'
import ProfileEditor from '@/components/ProfileEditor'
import ProfilePhotoPicker from '@/components/ProfilePhotoPicker'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import { bannerStyle } from '@/lib/banners'
import { accentStyle, normalizeAccent, profileAccentStyle } from '@/lib/palette'
import { avatarImageUrl } from '@/lib/avatar'
import { withStoryAuthor } from '@/lib/storyAuthors'

export default function PublicProfile({ params }) {
  const router = useRouter()
  const username = decodeURIComponent(params.username || '')
  const [state, setState] = useState({ loading: true, prof: null })
  const [stats, setStats] = useState({ stories: 0, received: 0, opened: 0 })
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [channels, setChannels] = useState([])
  const [posts, setPosts] = useState([])
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [isOwner, setIsOwner] = useState(false)
  const [reported, setReported] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  useEffect(() => {
    if (!supabase) { setState({ loading: false, prof: null }); return }
    let active = true
    ;(async () => {
      setState({ loading: true, prof: null })
      setEditOpen(false)
      setPhotoOpen(false)
      setReported(false)

      const { data: prof } = await supabase.from('profiles')
        .select('id,username,display_name,pronouns,status_weather,about_me,accent_color,avatar_url,banner_url,banner_theme,tags,discoverable,notify_email,onboarded,post_count,streak_count,umbrellas_sent,is_moderator,created_at')
        .eq('username', username).single()
      if (!active) return
      if (!prof) { setState({ loading: false, prof: null }); return }

      prof.accent_color = normalizeAccent(prof.accent_color)
      prof.tags = prof.tags || []
      prof.banner_theme = prof.banner_theme || 'rain'

      const me = await getMe()
      if (!active) return
      const owner = me.userId === prof.id

      const [{ data: mine }, { data: opened }, { data: followCounts }, { data: channelRows }, { data: stories }] = await Promise.all([
        supabase.from('stories').select('umbrella_count').eq('author_id', prof.id).eq('anonymous', false).eq('state', 'live'),
        supabase.rpc('umbrellas_opened_by', { uid: prof.id }),
        supabase.rpc('follow_counts', { target: prof.id }),
        supabase.from('channels').select('id,name').eq('owner_id', prof.id).order('created_at', { ascending: true }),
        supabase.from('stories')
          .select('id,author_id,author_name,anonymous,text,intent,category,content_warning,umbrella_count,state,created_at,boost_count,hug_count,off_topic_count,prompt_id,view_count,weather,giphy_id,photo_path,channel_id')
          .eq('author_id', prof.id).eq('anonymous', false).eq('state', 'live').order('created_at', { ascending: false }),
      ])
      if (!active) return

      const storyRows = mine || []
      const countRow = Array.isArray(followCounts) ? followCounts[0] : followCounts
      setStats({
        stories: storyRows.length,
        received: storyRows.reduce((total, story) => total + (story.umbrella_count || 0), 0),
        opened: Number(opened) || 0,
      })
      setCounts({ followers: Number(countRow?.followers) || 0, following: Number(countRow?.following) || 0 })
      setChannels(channelRows || [])
      setPosts((stories || []).map((story) => withStoryAuthor(story, prof)))
      setIsOwner(owner)
      setState({ loading: false, prof })
    })()

    return () => { active = false }
  }, [username])

  useEffect(() => {
    if (!photoOpen) return
    const closeOnEscape = (event) => { if (event.key === 'Escape') setPhotoOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [photoOpen])

  function updateProfile(key, value) {
    setState((current) => ({
      ...current,
      prof: current.prof ? { ...current.prof, [key]: value } : current.prof,
    }))
  }

  async function report() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    const { error } = await supabase.from('reports').insert({
      target_type: 'profile',
      target_id: state.prof.id,
      reporter_id: data.user.id,
    })
    if (!error) setReported(true)
  }

  async function newChannel() {
    const name = (window.prompt('Name your new channel (e.g. "Small wins", "Poetry")') || '').trim()
    if (!name) return
    const { data, error } = await supabase.from('channels')
      .insert({ owner_id: state.prof.id, name }).select('id,name').single()
    if (error) { alert('Could not create channel: ' + error.message); return }
    setChannels((current) => [...current, data])
    setSelectedChannel(data.id)
  }

  const { loading, prof } = state
  const avatar = prof?.avatar_url || ''
  const isEmoji = avatar.startsWith('emoji:')
  const imageUrl = avatarImageUrl(avatar)
  const isImage = Boolean(imageUrl)
  const initial = (prof?.display_name || prof?.username || 'U').trim().charAt(0).toUpperCase()
  const avatarStyle = isImage ? { backgroundImage: `url(${imageUrl})` } : accentStyle(prof?.accent_color)
  const shownPosts = posts.filter((post) => selectedChannel === 'all' || post.channel_id === selectedChannel)

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          {loading ? <p className="empty">Loading...</p>
            : !prof ? <p className="empty">No one is here by that name.</p>
              : (
                <>
                  <div className="profile-card" style={profileAccentStyle(prof.accent_color)}>
                    <div className="pf-banner" style={bannerStyle(prof.banner_theme)} />
                    <div className="pf-top">
                      {isOwner ? (
                        <button type="button" className="pf-avatar pf-avatar-button" style={avatarStyle}
                          onClick={() => setPhotoOpen(true)} aria-label="Change profile picture" title="Change profile picture">
                          {isEmoji ? avatar.slice(6) : (isImage ? '' : initial)}
                          <span className="pf-avatar-edit" aria-hidden="true">Edit</span>
                        </button>
                      ) : (
                        <div className="pf-avatar" style={avatarStyle}>{isEmoji ? avatar.slice(6) : (isImage ? '' : initial)}</div>
                      )}
                      <div className="pf-id">
                        <div className="pf-name">{prof.display_name || prof.username}</div>
                        <div className="pf-handle">@{prof.username}{prof.pronouns ? ' · ' + prof.pronouns : ''}</div>
                        {prof.status_weather && <div className="pf-status">{prof.status_weather}</div>}
                      </div>
                      <FollowButton targetId={prof.id}
                        onChange={(change) => setCounts((current) => ({ ...current, followers: Math.max(0, current.followers + change) }))} />
                    </div>
                    <div className="pf-stats">
                      <div><b>{counts.followers}</b> followers</div>
                      <div><b>{counts.following}</b> following</div>
                      <div><b>{stats.stories}</b> stories</div>
                      <div><b>{stats.received}</b> received</div>
                    </div>
                    {prof.about_me && <p className="pf-about">{prof.about_me}</p>}
                    {prof.tags.length > 0 && (
                      <div className="pf-tags">{prof.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                    )}
                    <div className="pf-actions">
                      {isOwner ? (
                        <button type="button" className="btn prim sm profile-edit-btn" aria-expanded={editOpen}
                          aria-controls="profile-editor" onClick={() => setEditOpen((open) => !open)}>
                          {editOpen ? 'Done editing' : 'Edit profile'}
                        </button>
                      ) : reported ? (
                        <span className="reported">Reported</span>
                      ) : (
                        <button type="button" className="report" onClick={report}>Report this profile</button>
                      )}
                    </div>
                  </div>

                  {isOwner && editOpen && (
                    <ProfileEditor profile={prof} userId={prof.id} onChange={updateProfile} />
                  )}

                  {(channels.length > 0 || isOwner) && (
                    <div className="chan-tabs">
                      <button className={'chan-tab' + (selectedChannel === 'all' ? ' on' : '')}
                        onClick={() => setSelectedChannel('all')}>All</button>
                      {channels.map((channel) => (
                        <button key={channel.id} className={'chan-tab' + (selectedChannel === channel.id ? ' on' : '')}
                          onClick={() => setSelectedChannel(channel.id)}>{channel.name}</button>
                      ))}
                      {isOwner && <button className="chan-tab new" onClick={newChannel}>+ New channel</button>}
                    </div>
                  )}

                  <p className="sub" style={{ color: 'var(--ink-3)', margin: '4px 0 10px' }}>
                    {isOwner ? 'Your posts' : `Posts by @${prof.username}`}{selectedChannel !== 'all' ? ' · this channel' : ''}
                  </p>
                  {shownPosts.length === 0
                    ? <p className="empty">No posts here yet.</p>
                    : shownPosts.map((story) => <StoryCard key={story.id} story={story} />)}
                </>
              )}
        </main>
        <Rail />
      </div>

      {photoOpen && isOwner && prof && (
        <div className="modal-scrim profile-photo-scrim" role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setPhotoOpen(false) }}>
          <div className="modal-box profile-photo-modal" role="dialog" aria-modal="true" aria-labelledby="profile-photo-title">
            <div className="profile-photo-modal-head">
              <div>
                <h2 id="profile-photo-title">Change profile picture</h2>
                <p>Choose a photo or take one with your camera.</p>
              </div>
              <button type="button" className="modal-x" onClick={() => setPhotoOpen(false)} aria-label="Close">×</button>
            </div>
            <ProfilePhotoPicker userId={prof.id} />
          </div>
        </div>
      )}
    </>
  )
}
