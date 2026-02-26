import { useState, useRef, useEffect, useCallback } from 'react'
import { runTinyfishAgent } from '../services/tinyfish'
import { parseTicketResult } from '../utils/parseTicket'
import { useToast } from '../context/ToastContext'
import TooltipButton from './TooltipButton'

const PLATFORMS = [
  { id: 'stubhub',    name: 'StubHub',    url: 'https://www.stubhub.com',    shortName: 'SH', color: '#1dbf73' },
  { id: 'viagogo',    name: 'Viagogo',    url: 'https://www.viagogo.com',    shortName: 'VG', color: '#ff6b35' },
  { id: 'vividseats', name: 'VividSeats', url: 'https://www.vividseats.com', shortName: 'VS', color: '#9b59b6' },
]

const SPEED_TOOLTIP =
  '⚡ Speed Mode searches all platforms simultaneously and locks in the first available ticket automatically. No real purchase will be made in this demo — have fun!'

function initPlatforms() {
  return Object.fromEntries(
    PLATFORMS.map(p => [p.id, { status: 'idle', progress: [], streamUrl: null, result: null }])
  )
}

// Spawn CSS confetti particles at a DOM element position
function spawnConfetti(anchorEl) {
  const rect = anchorEl?.getBoundingClientRect() ?? { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 }
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const COLORS = ['#7c3aed', '#e040fb', '#22c55e', '#E85D04', '#fff', '#c084fc']
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;overflow:hidden;'
  document.body.appendChild(container)

  for (let i = 0; i < 36; i++) {
    const el = document.createElement('div')
    const angle = (Math.random() * 360) * (Math.PI / 180)
    const dist = 60 + Math.random() * 120
    const tx = `translate(${cx + Math.cos(angle) * dist}px, ${cy + Math.sin(angle) * dist}px)`
    const rot = `${Math.random() * 720 - 360}deg`
    el.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:${4 + Math.random() * 6}px; height:${4 + Math.random() * 6}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
      --tx:${tx}; --rot:${rot};
    `
    el.className = 'confetti-particle'
    container.appendChild(el)
  }

  setTimeout(() => document.body.removeChild(container), 1000)
}

const fmtPrice = (n) => (n != null && !isNaN(n) && n > 0) ? `$${n}` : '—'

export default function SpeedMode({ zipCode = '' }) {
  const addToast = useToast()
  const [form, setForm]           = useState({ event: '', date: '', qty: '2' })
  const [platforms, setPlatforms] = useState(initPlatforms)
  const [searchState, setSearchState]   = useState('idle')   // idle | searching | complete
  const [bookingState, setBookingState] = useState('idle')   // idle | processing | confirmed
  const [orderId, setOrderId]     = useState(null)
  const [firstWinnerId, setFirstWinnerId] = useState(null)
  const [fadingIds, setFadingIds] = useState([])
  const abortControllersRef = useRef({})
  const firstWinnerRef      = useRef(null)
  const bookBtnRef          = useRef(null)
  const cancelledRef        = useRef(false)

  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(c => c.abort())
    }
  }, [])

  const markFirstWinner = useCallback((platformId, section) => {
    if (firstWinnerRef.current) return
    firstWinnerRef.current = platformId
    setFirstWinnerId(platformId)

    const losers = PLATFORMS.filter(p => p.id !== platformId).map(p => p.id)
    setFadingIds(losers)

    const pName = PLATFORMS.find(p => p.id === platformId)?.name ?? platformId
    addToast({
      message: `🎯 Found it! ${pName} responded first — ${section || 'General'}`,
      borderColor: '#22c55e',
      duration: 4000,
    })
  }, [addToast])

  const SEARCH_SCOPE = 'IMPORTANT: Search scope is United States only. Filter to US events only — do NOT include UK, Europe, London, or other countries. Only include events in 2026 — filter out 2025 or 2027.'

  function makeGoal(platform, artistName) {
    const zipContext = zipCode
      ? `The user is located near US zip code ${zipCode} — prefer US events in the same state or nearby region. `
      : ''
    if (platform.id === 'vividseats') {
      return `Go to https://www.vividseats.com and search for "${artistName}" concerts. ${zipContext}${SEARCH_SCOPE} Find the cheapest available ticket in the US, 2026. Return ONLY valid JSON with no extra text:
{
"found": true,
"section": "Section name or GA",
"row": "Row letter or null",
"price": 125,
"fees": 22,
"total": 147,
"availability": "X tickets left or unknown",
"event_date": "Month DD, YYYY or unknown",
"venue": "Venue name, City, State or unknown"
}
If no tickets found, return: {"found": false}`
    }
    if (platform.id === 'stubhub') {
      return `Go to https://www.stubhub.com and search for "${artistName}" concerts. ${zipContext}${SEARCH_SCOPE} Find the cheapest available listing in the US, 2026. Return ONLY valid JSON with no extra text:
{
"found": true,
"section": "Section name",
"row": "Row or null",
"price": 89,
"fees": 18,
"total": 107,
"availability": "X available or unknown",
"event_date": "Month DD, YYYY or unknown",
"venue": "Venue name, City, State"
}
If nothing found, return: {"found": false}`
    }
    // viagogo
    return `Go to https://www.viagogo.com and search for "${artistName}" tickets. ${zipContext}${SEARCH_SCOPE} Find the cheapest ticket available in the US, 2026. Return ONLY valid JSON with no extra text:
{
"found": true,
"section": "Section or category",
"row": "Row or null",
"price": 95,
"fees": 20,
"total": 115,
"event_date": "Month DD YYYY or unknown",
"venue": "Venue name, City, State"
}
If no results, return: {"found": false}`
  }

  async function searchPlatform(platform, artistName) {
    const controller = new AbortController()
    abortControllersRef.current[platform.id] = controller

    const goal = makeGoal(platform, artistName)

    try {
      await runTinyfishAgent({
        url: platform.url,
        goal,
        signal: controller.signal,
        onProgress: (text) => {
          if (!text) return
          setPlatforms(prev => ({
            ...prev,
            [platform.id]: {
              ...prev[platform.id],
              progress: [...prev[platform.id].progress, text].slice(-3),
            },
          }))
        },
        onStreamUrl: (url) => {
          setPlatforms(prev => ({
            ...prev,
            [platform.id]: { ...prev[platform.id], streamUrl: url },
          }))
        },
        onComplete: (resultJson) => {
          const parsed = parseTicketResult(resultJson)
          if (!parsed) {
            setPlatforms(prev => ({
              ...prev,
              [platform.id]: { ...prev[platform.id], status: 'blocked' },
            }))
            return
          }
          setPlatforms(prev => ({
            ...prev,
            [platform.id]: { ...prev[platform.id], status: 'found', result: parsed },
          }))
          markFirstWinner(platform.id, parsed.section)
        },
        onError: () => {
          setPlatforms(prev => ({
            ...prev,
            [platform.id]: { ...prev[platform.id], status: 'blocked' },
          }))
        },
      })
    } catch {
      setPlatforms(prev => ({
        ...prev,
        [platform.id]: { ...prev[platform.id], status: 'blocked' },
      }))
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!form.event.trim()) return

    cancelledRef.current = false
    Object.values(abortControllersRef.current).forEach(c => c.abort())
    abortControllersRef.current = {}

    setBookingState('idle')
    setOrderId(null)
    setFirstWinnerId(null)
    setFadingIds([])
    firstWinnerRef.current = null
    setSearchState('searching')
    setPlatforms(
      Object.fromEntries(
        PLATFORMS.map(p => [p.id, { status: 'searching', progress: [], streamUrl: null, result: null }])
      )
    )

    await Promise.allSettled(PLATFORMS.map(p => searchPlatform(p, form.event)))
    if (!cancelledRef.current) {
      setSearchState('complete')
    }
  }

  function handleCancel() {
    cancelledRef.current = true
    Object.values(abortControllersRef.current).forEach(c => c.abort())
    abortControllersRef.current = {}
    setSearchState('idle')
    setPlatforms(initPlatforms())
    setFirstWinnerId(null)
    setFadingIds([])
    firstWinnerRef.current = null
  }

  function handleBookNow() {
    setBookingState('processing')
    setTimeout(() => {
      const id = 'FR-' + Math.floor(10000000 + Math.random() * 90000000)
      setOrderId(id)
      setBookingState('confirmed')

      addToast({
        message: `🎫 Ticket Secured! Confirmation #${id}`,
        borderColor: '#7c3aed',
        duration: 6000,
        large: true,
      })

      spawnConfetti(bookBtnRef.current)
    }, 2000)
  }

  const foundPlatforms = PLATFORMS.filter(
    p => platforms[p.id].status === 'found' && platforms[p.id].result?.total > 0
  )
  const winner =
    foundPlatforms.length > 0
      ? foundPlatforms.reduce((best, p) =>
          platforms[p.id].result.total < platforms[best.id].result.total ? p : best
        )
      : null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff, #e040fb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ⚡ Speed Mode
          </h1>
          <TooltipButton tooltip={SPEED_TOOLTIP} />
        </div>
        <p style={{ color: '#a0a0b8', fontSize: '0.9rem' }}>
          Fastest checkout across all platforms simultaneously
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        style={{
          background: '#12121f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 32,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 6 }}>
            Artist or Event
          </label>
          <input
            value={form.event}
            onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
            placeholder="e.g. Ariana Grande"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 6 }}>
            Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>
        <div style={{ flex: '0 0 100px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 6 }}>
            Tickets
          </label>
          <select
            value={form.qty}
            onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            {[1, 2, 3, 4, 6, 8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="btn-glow-purple"
          disabled={searchState === 'searching'}
          style={{
            background: searchState === 'searching'
              ? 'rgba(124,58,237,0.4)'
              : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '12px 28px',
            cursor: searchState === 'searching' ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {searchState === 'searching' ? 'Searching...' : 'Search Now'}
        </button>
        {searchState === 'searching' && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }}
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12,
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.9rem',
              padding: '12px 20px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Cancel Search
          </button>
        )}
      </form>

      {/* Live AI browser sessions - auto shown as soon as search starts */}
      {searchState !== 'idle' && (
        <LiveSessionsPanel platforms={PLATFORMS} platformStates={platforms} />
      )}

      {/* Platform columns */}
      {searchState !== 'idle' && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              alignItems: 'stretch',
            }}
          >
            {PLATFORMS.map(platform => {
              const pState    = platforms[platform.id]
              const isFound   = pState.status === 'found'
              const isBlocked = pState.status === 'blocked'
              const isWinner  = isFound && winner?.id === platform.id
              const isFirst   = platform.id === firstWinnerId
              const isFading  = fadingIds.includes(platform.id)

              const cardProps = {
                platform, pState, isFound, isBlocked,
                isWinner, isFirst, firstWinnerId,
                onTryArtist: (name) => setForm(f => ({ ...f, event: name })),
              }

              if (isFading && firstWinnerId) {
                return (
                  <div key={platform.id} className="col-fade-out" style={{ flex: '1 1 0', minWidth: 240, overflow: 'hidden', pointerEvents: 'none' }}>
                    <PlatformCard {...cardProps} />
                  </div>
                )
              }

              return (
                <div
                  key={platform.id}
                  style={{
                    flex: '1 1 0',
                    minWidth: 240,
                    maxWidth: '100%',
                    transition: 'opacity 0.3s ease',
                    minHeight: 0,
                  }}
                >
                  <PlatformCard {...cardProps} />
                </div>
              )
            })}
          </div>

          {/* Winner banner */}
          {winner !== null && bookingState === 'idle' && (
            <div
              className="winner-banner"
              style={{
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  ✅ Best deal found
                </div>
                <div style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>
                  {winner.name} — {platforms[winner.id].result.section} — {fmtPrice(platforms[winner.id].result.total)} total
                </div>
              </div>
              <button
                ref={bookBtnRef}
                onClick={handleBookNow}
                className="btn-glow-orange"
                style={{
                  background: 'linear-gradient(135deg, #E85D04, #c2410c)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Book Now →
              </button>
            </div>
          )}

          {/* Booking processing */}
          {bookingState === 'processing' && (
            <div
              style={{
                background: '#12121f',
                border: '1px solid rgba(232,93,4,0.3)',
                borderRadius: 16,
                padding: '24px',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              <SearchingSpinner color="#E85D04" />
              <div style={{ color: '#a0a0b8', fontSize: '0.9rem', marginTop: 12 }}>
                Securing your ticket...
              </div>
            </div>
          )}

          {/* Confirmed card */}
          {bookingState === 'confirmed' && orderId && (
            <div
              style={{
                background: '#12121f',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 0 30px rgba(34,197,94,0.12)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎫</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e', marginBottom: 8, letterSpacing: '-0.01em' }}>
                TICKET SECURED
              </div>
              <div style={{ color: '#a0a0b8', fontSize: '0.9rem', marginBottom: 20 }}>
                {winner.name} · {platforms[winner.id].result.section} · {fmtPrice(platforms[winner.id].result.total)} total
              </div>
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px dashed rgba(34,197,94,0.3)',
                  borderRadius: 12,
                  padding: '10px 24px',
                  fontSize: '0.8rem',
                  color: '#a0a0b8',
                }}
              >
                Confirmation #{orderId}
              </div>
            </div>
          )}
        </>
      )}

      {/* Idle placeholder */}
      {searchState === 'idle' && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            color: '#a0a0b8',
            background: '#12121f',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>⚡</div>
          <div style={{ fontSize: '1rem', color: '#6b6b8a' }}>
            Enter an event above to start the speed search
          </div>
        </div>
      )}
    </div>
  )
}

const QUICK_ARTISTS = ['Lady Gaga', 'Bad Bunny', 'Ed Sheeran']

// ── PlatformCard sub-component ─────────────────────────────────────────────
function PlatformCard({ platform, pState, isFound, isBlocked, isWinner, isFirst, firstWinnerId, onTryArtist }) {
  return (
    <div
      className={isFirst && firstWinnerId ? 'winner-pulse-glow' : isFound ? 'found-glow' : ''}
      style={{
        height: '100%',
        background: '#12121f',
        borderRadius: 16,
        padding: '24px 20px',
        border: isWinner
          ? '1px solid rgba(34,197,94,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.3s ease',
        position: 'relative',
        minHeight: 200,
      }}
    >
      {/* Ribbon */}
      {isWinner && (
        <div style={{ position: 'absolute', top: -1, right: 16, background: '#22c55e', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Best Deal
        </div>
      )}
      {isFirst && !isWinner && (
        <div style={{ position: 'absolute', top: -1, right: 16, background: 'rgba(124,58,237,0.7)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Fastest ⚡
        </div>
      )}
      {isFound && !isWinner && !isFirst && (
        <div style={{ position: 'absolute', top: -1, right: 16, background: 'rgba(160,160,184,0.2)', color: '#a0a0b8', fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Also Found
        </div>
      )}

      {/* Platform name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${platform.color}20`, border: `1px solid ${platform.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: platform.color }}>
          {platform.shortName}
        </div>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
          {platform.name}
        </span>
      </div>

      {/* Searching state */}
      {pState.status === 'searching' && (
        <div style={{ paddingTop: 4 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <SearchingSpinner color={platform.color} />
          </div>
          {pState.progress.length > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#a0a0b8', fontSize: '0.72rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                {pState.progress[pState.progress.length - 1]}
                <span className="cursor-blink" style={{ color: platform.color, marginLeft: 2, fontStyle: 'normal' }}>▌</span>
              </div>
            </div>
          ) : (
            <div style={{ color: '#a0a0b8', fontSize: '0.85rem', textAlign: 'center', marginBottom: 10 }}>
              Searching...
            </div>
          )}
          <TinyFishLink streamUrl={pState.streamUrl} />
        </div>
      )}

      {/* Blocked */}
      {isBlocked && (
        <div style={{ paddingTop: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>
            ❌ Blocked
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b6b8a', marginBottom: 8 }}>Could not retrieve results. Try again.</div>
          <QuickSearchLinks onTryArtist={onTryArtist} />
        </div>
      )}

      {/* Found */}
      {isFound && pState.result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#a0a0b8', fontSize: '0.8rem' }}>Section</span>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>{pState.result.section}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#a0a0b8', fontSize: '0.8rem' }}>Face price</span>
            <span style={{ color: '#fff', fontSize: '0.85rem' }}>{fmtPrice(pState.result.price)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#a0a0b8', fontSize: '0.8rem' }}>Fees</span>
            <span style={{ color: '#a0a0b8', fontSize: '0.85rem' }}>+{fmtPrice(pState.result.fees)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, marginTop: 4 }}>
            <span style={{ color: '#a0a0b8', fontSize: '0.8rem', fontWeight: 600 }}>Total</span>
            <span style={{ color: isWinner ? '#22c55e' : '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
              {fmtPrice(pState.result.total)}
            </span>
          </div>
          {pState.result.venue && (
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#a0a0b8' }}>{pState.result.venue}</div>
          )}
          {pState.result.event_date && (
            <div style={{ marginTop: 2, fontSize: '0.72rem', color: '#6b6b8a' }}>{pState.result.event_date}</div>
          )}
          <TinyFishLink streamUrl={pState.streamUrl} style={{ marginTop: 8 }} />
        </div>
      )}
    </div>
  )
}

// ── LiveSessionsPanel ──────────────────────────────────────────────────────
function LiveSessionsPanel({ platforms, platformStates }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ef4444',
            animation: 'pulse-dot 1s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a0a0b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Live AI Browser Sessions
        </span>
        <span style={{ fontSize: '0.68rem', color: '#6b6b8a' }}>Powered by TinyFish</span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {platforms.map(platform => {
          const pState = platformStates[platform.id]
          const isSearching = pState.status === 'searching'

          return (
            <div key={platform.id} style={{ flex: '1 1 240px', minWidth: 0 }}>
              {/* Platform label row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingLeft: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: 5,
                      background: `${platform.color}20`,
                      border: `1px solid ${platform.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: platform.color,
                    }}
                  >
                    {platform.shortName}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#a0a0b8', fontWeight: 500 }}>{platform.name}</span>
                </div>
                {isSearching && (
                  <span
                    style={{
                      fontSize: '0.58rem', background: 'rgba(239,68,68,0.85)',
                      color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em',
                    }}
                  >
                    LIVE
                  </span>
                )}
                {pState.status === 'found' && (
                  <span style={{ fontSize: '0.62rem', color: '#22c55e' }}>✓ Found</span>
                )}
                {pState.status === 'blocked' && (
                  <span style={{ fontSize: '0.62rem', color: '#ef4444' }}>✕ Blocked</span>
                )}
              </div>

              {/* Iframe or placeholder */}
              {pState.streamUrl ? (
                <div
                  style={{
                    borderRadius: 10, overflow: 'hidden',
                    border: `1px solid ${platform.color}35`,
                    background: '#000',
                    position: 'relative',
                  }}
                >
                  <iframe
                    src={pState.streamUrl}
                    style={{ width: '100%', height: 230, border: 'none', display: 'block' }}
                    title={`${platform.name} live session`}
                    allow="autoplay"
                  />
                  <a
                    href={pState.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute', bottom: 6, right: 8,
                      fontSize: '0.6rem', color: '#E85D04',
                      background: 'rgba(10,10,18,0.8)',
                      padding: '2px 6px', borderRadius: 4,
                      textDecoration: 'none',
                    }}
                  >
                    ↗ Open
                  </a>
                </div>
              ) : (
                <div
                  style={{
                    height: 230, borderRadius: 10,
                    border: `1px solid ${isSearching ? platform.color + '25' : 'rgba(255,255,255,0.05)'}`,
                    background: '#0a0a12',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  {isSearching ? (
                    <>
                      <SearchingSpinner color={platform.color} />
                      <div style={{ fontSize: '0.7rem', color: '#6b6b8a' }}>Connecting to live session...</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: '#6b6b8a', textAlign: 'center', padding: '0 16px' }}>
                      {pState.status === 'blocked' ? '❌ Session unavailable' : pState.status === 'found' ? '✓ Session complete' : '—'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TinyFishLink({ streamUrl, style }) {
  if (!streamUrl) return null
  return (
    <div style={style}>
      <a
        href={streamUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Live view may show 'no service' after agent completes or if stream is unavailable"
        style={{ fontSize: '0.72rem', color: '#E85D04', textDecoration: 'none', display: 'block' }}
      >
        🐟 Watch live on TinyFish →
      </a>
      <div style={{ fontSize: '0.65rem', color: '#6b6b8a', marginTop: 2 }}>
        Powered by TinyFish Web Agent
      </div>
    </div>
  )
}

function QuickSearchLinks({ onTryArtist }) {
  return (
    <div style={{ fontSize: '0.7rem', color: '#6b6b8a' }}>
      Try:{' '}
      {QUICK_ARTISTS.map((name, i) => (
        <span key={name}>
          <button
            onClick={() => onTryArtist?.(name)}
            style={{ background: 'none', border: 'none', color: '#9b59b6', cursor: 'pointer', fontSize: '0.7rem', padding: 0, textDecoration: 'underline' }}
          >
            {name}
          </button>
          {i < QUICK_ARTISTS.length - 1 && ' · '}
        </span>
      ))}
    </div>
  )
}

function SearchingSpinner({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: '#0a0a12',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#fff',
  padding: '10px 14px',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s',
}
