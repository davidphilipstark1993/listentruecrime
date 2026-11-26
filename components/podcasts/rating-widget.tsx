'use client'
import { useState, useEffect } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { getSupabase } from '@/lib/supabase/lazy-client'
import { AuthModal } from '@/components/auth/auth-modal'
import toast from 'react-hot-toast'
import type { Rating } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const RATING_FIELDS: { key: keyof Omit<Rating, 'id' | 'user_id' | 'anonymous_rating_id' | 'podcast_id' | 'created_at'>; label: string }[] = [
  { key: 'storytelling_score', label: 'Storytelling' },
  { key: 'research_score', label: 'Research Quality' },
  { key: 'host_quality_score', label: 'Host Quality' },
  { key: 'production_score', label: 'Production / Audio' },
  { key: 'binge_factor_score', label: 'Binge Factor' },
  { key: 'factual_accuracy_score', label: 'Factual Accuracy' },
  { key: 'overall_score', label: 'Overall Score' },
]

const OVERALL_FIELD = RATING_FIELDS.find(f => f.key === 'overall_score')!
const DETAIL_FIELDS = RATING_FIELDS.filter(f => f.key !== 'overall_score')

interface RatingWidgetProps {
  podcastId: string
  podcastTitle: string
}

type ScoreMap = Record<string, number>

function localKey(podcastId: string) {
  return `ltc_rating_${podcastId}`
}

// Set once the browser's rating has been saved to the server. Ratings made
// before anonymous ratings were stored server-side only have localKey, so a
// missing flag means "not counted yet" and the rating is re-sent on load.
function syncedKey(podcastId: string) {
  return `ltc_rating_synced_${podcastId}`
}

const VISITOR_KEY = 'ltc_visitor_id'

function getVisitorId(create: boolean): string | null {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing || !create) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch { return null }
}

async function saveAnonymous(podcastId: string, scores: ScoreMap): Promise<void> {
  const visitorId = getVisitorId(true)
  if (!visitorId) throw new Error('Could not save rating — please enable cookies/storage for this site')
  const res = await fetch('/api/ratings/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ podcast_id: podcastId, visitor_id: visitorId, scores }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Could not save rating')
  }
}

export function RatingWidget({ podcastId, podcastTitle }: RatingWidgetProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [scores, setScores] = useState<ScoreMap>({})
  const [existing, setExisting] = useState<ScoreMap>({})
  const [authOpen, setAuthOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)


  useEffect(() => {
    getSupabase().then(s => s.auth.getUser()).then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        // Move this browser's anonymous rating onto the account, then drop
        // the anonymous copy so it isn't counted twice.
        const pending = readLocal()
        if (pending && Object.keys(pending).length > 0) {
          const { error } = await (await getSupabase())
            .from('ratings')
            .upsert({ user_id: user.id, podcast_id: podcastId, ...pending }, { onConflict: 'user_id,podcast_id' })
          if (!error) {
            const visitorId = getVisitorId(false)
            if (visitorId) {
              await fetch('/api/ratings/anonymous', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ podcast_id: podcastId, visitor_id: visitorId }),
              }).catch(() => {})
            }
            try {
              localStorage.removeItem(localKey(podcastId))
              localStorage.removeItem(syncedKey(podcastId))
            } catch {}
          }
        }
        await fetchExisting(user.id)
      } else {
        const local = readLocal()
        if (local) {
          setScores(local)
          setExisting(local)
          // Rated before anonymous ratings were stored server-side — send it now.
          let synced = false
          try { synced = !!localStorage.getItem(syncedKey(podcastId)) } catch {}
          if (!synced) {
            saveAnonymous(podcastId, local)
              .then(() => { try { localStorage.setItem(syncedKey(podcastId), '1') } catch {} })
              .catch(() => {})
          }
        }
        setLoaded(true)
      }
    })
  }, [])

  function readLocal(): ScoreMap | null {
    try {
      const raw = localStorage.getItem(localKey(podcastId))
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const fetchExisting = async (userId: string) => {
    const { data } = await (await getSupabase())
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('podcast_id', podcastId)
      .single()

    if (data) {
      const map: ScoreMap = {}
      RATING_FIELDS.forEach(f => { if (data[f.key]) map[f.key] = data[f.key] as number })
      setExisting(map)
      setScores(map)
    }
    setLoaded(true)
  }

  const handleSave = async () => {
    if (Object.keys(scores).length === 0) { toast.error('Please rate at least one dimension'); return }

    if (!user) {
      setSaving(true)
      try {
        await saveAnonymous(podcastId, scores)
        try {
          localStorage.setItem(localKey(podcastId), JSON.stringify(scores))
          localStorage.setItem(syncedKey(podcastId), '1')
        } catch {}
        setExisting(scores)
        toast.success('Rating saved — thank you!')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save rating')
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    const payload = { user_id: user.id, podcast_id: podcastId, ...scores }
    const { error } = await (await getSupabase())
      .from('ratings')
      .upsert(payload, { onConflict: 'user_id,podcast_id' })

    setSaving(false)
    if (error) {
      toast.error('Failed to save rating')
    } else {
      toast.success('Rating saved!')
      setExisting(scores)
    }
  }

  const StarRow = ({ field }: { field: typeof RATING_FIELDS[number] }) => {
    const current = scores[field.key] ?? 0
    return (
      // Phones: label above a full-width row of 10 stars, each a 44px-tall
      // target sharing the width (min 24px wide). From sm: label beside stars.
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
        <div className="flex items-center justify-between sm:block">
          <span id={`rate-${field.key}`} className="text-sm text-stone-muted sm:w-36 sm:shrink-0 sm:inline-block">{field.label}</span>
          <span className="sm:hidden text-sm text-stone tabular-nums" aria-hidden="true">{current > 0 ? `${current}/10` : '—'}</span>
        </div>
        <div className="flex items-center gap-0 sm:gap-1 -mx-1 sm:mx-0" role="radiogroup" aria-labelledby={`rate-${field.key}`}>
          {[...Array(10)].map((_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={current === i + 1}
              onClick={() => setScores(prev => ({ ...prev, [field.key]: i + 1 }))}
              className="flex-1 sm:flex-none min-w-[24px] h-11 sm:h-auto sm:p-0.5 flex items-center justify-center rounded-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson/60"
              aria-label={`${i + 1} out of 10`}
            >
              <Star
                size={18}
                className={cn('sm:w-4 sm:h-4', i < current ? 'text-gold-light' : 'text-ink-500')}
                fill={i < current ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            </button>
          ))}
          <span className="hidden sm:inline ml-2 text-sm text-stone-muted w-6 text-right tabular-nums">
            {current > 0 ? current : '—'}
          </span>
        </div>
      </div>
    )
  }

  if (!loaded) return <div className="skeleton h-48 rounded-lg" />

  return (
    <>
      <div className="card p-4 sm:p-5">
        <h3 className="font-serif text-lg text-stone mb-1">Your rating</h3>
        <p className="text-stone-subtle text-xs mb-4 sm:mb-5">
          {user ? 'Your ratings are saved to your account.' : 'No account needed — rate anonymously.'}
        </p>

        {/* Overall first — one row is all most people want to give. The six
            detailed dimensions are one tap away (open already if this visitor
            has rated any of them), which keeps the card ~1 screen on a phone. */}
        <StarRow field={OVERALL_FIELD} />

        <details className="group mt-4 border-t border-white/[0.06]" open={DETAIL_FIELDS.some(f => existing[f.key])}>
          <summary className="flex items-center justify-between gap-3 min-h-[48px] cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm text-stone-muted hover:text-stone">
            <span>Rate in more detail <span className="text-stone-subtle">(optional)</span></span>
            <ChevronDown size={16} aria-hidden="true" className="text-stone-subtle transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 sm:space-y-4 pt-1">
            {DETAIL_FIELDS.map(field => (
              <StarRow key={field.key} field={field} />
            ))}
          </div>
        </details>

        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : (Object.keys(existing).length > 0 ? 'Update rating' : 'Submit rating')}
          </button>
          {!user && (
            <button
              onClick={() => setAuthOpen(true)}
              className="min-h-[44px] text-xs text-stone-subtle hover:text-stone underline"
            >
              Sign in to sync across devices
            </button>
          )}
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        message={`Sign in to save your ${podcastTitle} rating`}
      />
    </>
  )
}
