import { useState, useMemo, useEffect, useRef } from 'react'
import { runTinyfishAgent } from '../services/tinyfish'
import { parseTicketResult } from '../utils/parseTicket'
import { getCached, setCache, CACHE_TTL } from '../utils/cache'
import { useToast } from '../context/ToastContext'
import TooltipButton from './TooltipButton'
import DemoPurchaseModal from './DemoPurchaseModal'

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
      position:absolute; left:${cx}px; top:${cy}px;
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

const VALUE_TOOLTIP =
  '💎 Value Mode scores every listing using a weighted formula: Price (50%) + Distance from your zip (30%) + Seat Zone match (20%). Enter your zip code in the Location filter to personalize scores. Scores update instantly.'

const SEAT_TYPES = ['Floor GA', 'Pit', 'Section 100s', 'Section 200s', 'VIP']
const SORT_OPTIONS = [
  { id: 'value', label: 'Value Score' },
  { id: 'price', label: 'Price' },
]

const PLATFORM_BADGE = {
  VividSeats: { short: 'VS', color: '#9b59b6', bg: 'rgba(155,89,182,0.15)' },
  StubHub:    { short: 'SH', color: '#1dbf73', bg: 'rgba(29,191,115,0.15)' },
  Viagogo:    { short: 'VG', color: '#ff6b35', bg: 'rgba(255,107,53,0.15)' },
}

// Phase 3 mock venue zip — Phase 4 will use real venue zip from API
const MOCK_VENUE_ZIP = '10001'

function getScoreColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  return '#ef4444'
}

function hasValidPrice(result) {
  const t = result?.total
  return typeof t === 'number' && !isNaN(t) && t > 0
}

const fmtPrice = (n) => (n != null && !isNaN(n) && n > 0) ? `$${n}` : '—'

function inferZoneFromSection(section) {
  const s = (section || '').toLowerCase()
  if (s.includes('floor') || s.includes('pit') || s.includes('ga')) return 'floor'
  if (['10', '11', '12', '20', '21', '22'].some(n => s.includes(n))) return 'lower_bowl'
  if (['upper', 'balcony'].some(n => s.includes(n)) || /\b[234]\d{2}\b/.test(s)) return 'upper_bowl'
  return 'general'
}

function isZipCode(s) {
  return /^\d{5}$/.test((s || '').trim())
}

function buildZipContext(location) {
  if (!location || !location.trim()) return ''
  const loc = location.trim()
  const locDesc = isZipCode(loc) ? `near US zip code ${loc}` : `in or near ${loc}, US`
  return `The user is located ${locDesc} — prefer US events in the same state or nearby region. `
}

function getTicketSearchUrl(platformName, eventName) {
  const encoded = encodeURIComponent(eventName || '')
  switch (platformName) {
    case 'StubHub':    return `https://www.stubhub.com/find/s/?q=${encoded}`
    case 'VividSeats': return `https://www.vividseats.com/search?searchTerm=${encoded}`
    case 'Viagogo':    return `https://www.viagogo.com/ww/Search?q=${encoded}`
    default:           return '#'
  }
}

function estimateMiles(zipA, zipB) {
  if (!zipA || !zipB || zipA.length < 3 || zipB.length < 3) return 800
  if (!isZipCode(zipA)) return 400  // city name — moderate neutral distance
  if (zipA.slice(0, 3) === zipB.slice(0, 3)) return 8
  if (zipA[0] === zipB[0]) return 150
  return 800
}

function calcDistanceScore(userZip) {
  // Returns 0–20; 10 = neutral (no zip entered)
  if (!userZip || userZip.length < 3) return 10
  const miles = estimateMiles(userZip, MOCK_VENUE_ZIP)
  if (miles <= 8) return 20
  if (miles <= 150) return 12
  return 3
}

function calcValueScore(ticket, allTickets, userZip) {
  const zoneScore = { floor: 35, lower_bowl: 27, general: 24, upper_bowl: 18 }[ticket.seat_zone] ?? 22
  const totals = allTickets.map(t => t.total)
  const range = Math.max(...totals) - Math.min(...totals)
  const priceScore = range === 0 ? 40 : ((Math.max(...totals) - ticket.total) / range) * 40
  const feeScore = Math.max(0, 12 - (ticket.fees / ticket.total) * 24)
  const distScore = calcDistanceScore(userZip)
  return Math.min(99, Math.max(0, Math.round(zoneScore + priceScore + feeScore + distScore)))
}

function normalizeTicket(raw) {
  const section = raw.section || raw.seat_section || raw.zone || 'General'
  const row = raw.row || 'GA'
  const price = raw.price || raw.base_price || 0
  const fees = raw.fees || raw.service_fee || 0
  const total = raw.total || raw.total_price || (price + fees)
  const seat_zone = raw.seat_zone || raw.zone_type || inferZoneFromSection(section)
  const available = raw.available || raw.quantity || 1
  return { ...raw, section, row, price, fees, total, seat_zone, available }
}

const INIT_PLATFORM_META = {
  VividSeats: { status: 'idle', streamUrl: null },
  StubHub:    { status: 'idle', streamUrl: null },
  Viagogo:    { status: 'idle', streamUrl: null },
}

export default function ValueMode({ initialArtist, zipCode = '', onZipChange }) {
  const addToast = useToast()
  const [query, setQuery] = useState(initialArtist ? initialArtist.name : '')
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState([])
  const [platformMeta, setPlatformMeta] = useState(INIT_PLATFORM_META)
  const [platformProgress, setPlatformProgress] = useState({ VividSeats: '', StubHub: '', Viagogo: '' })
  const [maxBudget, setMaxBudget] = useState(null) // null = no upper limit
  const [seatTypes, setSeatTypes] = useState(new Set(SEAT_TYPES))
  const [sortBy, setSortBy] = useState('value')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [zipFilter, setZipFilter] = useState(zipCode || '')
  const [demoModal, setDemoModal] = useState({ visible: false, pendingFn: null })
  const rangeRef = useRef(null)
  const abortControllersRef = useRef({})

  function openDemoModal(fn) {
    setDemoModal({ visible: true, pendingFn: fn })
  }
  function handleModalConfirm() {
    const fn = demoModal.pendingFn
    setDemoModal({ visible: false, pendingFn: null })
    fn?.()
  }

  // Sync zipFilter when zip prop changes
  useEffect(() => {
    setZipFilter(zipCode || '')
  }, [zipCode])

  // Auto-search if initialArtist is set
  useEffect(() => {
    if (initialArtist) {
      triggerSearch(initialArtist.name)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(c => c.abort())
    }
  }, [])

  // Update range track fill (only when maxBudget is a number)
  useEffect(() => {
    if (rangeRef.current && maxBudget !== null) {
      const pct = ((maxBudget - 50) / (600 - 50)) * 100
      rangeRef.current.style.background =
        `linear-gradient(to right, #7c3aed 0%, #7c3aed ${pct}%, #1a1a2e ${pct}%, #1a1a2e 100%)`
    } else if (rangeRef.current) {
      rangeRef.current.style.background = '#1a1a2e'
    }
  }, [maxBudget])

  function setPlatformStatus(platformName, status) {
    setPlatformMeta(prev => ({
      ...prev,
      [platformName]: { ...prev[platformName], status },
    }))
  }

  function setPlatformStreamUrl(platformName, url) {
    setPlatformMeta(prev => ({
      ...prev,
      [platformName]: { ...prev[platformName], streamUrl: url },
    }))
  }

  function clearProgress(platformName) {
    setPlatformProgress(prev => ({ ...prev, [platformName]: '' }))
  }

  function appendResults(items, platformName) {
    const arr = (Array.isArray(items) ? items : items ? [items] : []).filter(item => item?.found !== false)
    const normalized = arr.map(normalizeTicket)
    const withId = normalized.map((item, i) => ({
      ...item,
      platform: platformName,
      id: `${platformName}-${Date.now()}-${i}`,
    }))
    setResults(prev => [...prev, ...withId])
  }

  function handleCancel() {
    Object.values(abortControllersRef.current).forEach(c => c.abort())
    abortControllersRef.current = {}
    setPlatformMeta(INIT_PLATFORM_META)
    setPlatformProgress({ VividSeats: '', StubHub: '', Viagogo: '' })
  }

  function handleBuyNow(result) {
    addToast({
      message: 'Securing your ticket...',
      borderColor: '#7c3aed',
      duration: 2000,
    })
    setTimeout(() => {
      const orderId = 'FR-' + Math.floor(10000000 + Math.random() * 90000000)
      addToast({
        message: `🎫 Ticket Secured! ${result.platform} — ${result.section} · Confirmation #${orderId}`,
        borderColor: '#7c3aed',
        duration: 6000,
        large: true,
      })
      spawnConfetti(null)
    }, 2000)
  }

  const SEARCH_SCOPE = 'IMPORTANT: Search scope is United States only. Filter to US events only — do NOT include UK, Europe, London, or other countries. Only include events in 2026 — filter out 2025 or 2027.'

  function tryValueCacheFallback(platformName, artistName) {
    const cacheKey = `value_${platformName}_${artistName}`
    const cached = getCached('value', cacheKey)
    if (cached) {
      appendResults([{ ...cached, fromCache: true }], platformName)
      setPlatformStatus(platformName, 'done')
      return true
    }
    return false
  }

  function searchVividSeats(artistName) {
    const controller = new AbortController()
    abortControllersRef.current['VividSeats'] = controller
    const zipContext = buildZipContext(zipFilter)
    const goal =
      `Go to https://www.vividseats.com and search for "${artistName}" concerts. ${zipContext}${SEARCH_SCOPE} Find the cheapest available ticket in the US, 2026. Return ONLY valid JSON with no extra text:
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

    runTinyfishAgent({
      url: 'https://www.vividseats.com',
      goal,
      signal: controller.signal,
      onProgress: (text) => {
        if (!text) return
        setPlatformProgress(prev => ({ ...prev, VividSeats: text }))
      },
      onStreamUrl: (url) => setPlatformStreamUrl('VividSeats', url),
      onComplete: (resultJson) => {
        clearProgress('VividSeats')
        const parsed = parseTicketResult(resultJson)
        if (parsed) {
          setCache('value', `value_VividSeats_${artistName}`, parsed, CACHE_TTL.VALUE_RESULT)
          appendResults([parsed], 'VividSeats')
        }
        setPlatformStatus('VividSeats', 'done')
      },
      onError: () => {
        clearProgress('VividSeats')
        if (!tryValueCacheFallback('VividSeats', artistName)) {
          setPlatformStatus('VividSeats', 'error')
        }
      },
    })
  }

  function searchViagogo(artistName) {
    const controller = new AbortController()
    abortControllersRef.current['Viagogo'] = controller
    const zipContext = buildZipContext(zipFilter)
    const goal =
      `Go to https://www.viagogo.com and search for "${artistName}" tickets. ${zipContext}${SEARCH_SCOPE} Find the cheapest ticket available in the US, 2026. Return ONLY valid JSON with no extra text:
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

    runTinyfishAgent({
      url: 'https://www.viagogo.com',
      goal,
      signal: controller.signal,
      onProgress: (text) => {
        if (!text) return
        setPlatformProgress(prev => ({ ...prev, Viagogo: text }))
      },
      onStreamUrl: (url) => setPlatformStreamUrl('Viagogo', url),
      onComplete: (resultJson) => {
        clearProgress('Viagogo')
        const parsed = parseTicketResult(resultJson)
        if (parsed) {
          setCache('value', `value_Viagogo_${artistName}`, parsed, CACHE_TTL.VALUE_RESULT)
          appendResults([parsed], 'Viagogo')
        }
        setPlatformStatus('Viagogo', 'done')
      },
      onError: () => {
        clearProgress('Viagogo')
        if (!tryValueCacheFallback('Viagogo', artistName)) {
          setPlatformStatus('Viagogo', 'error')
        }
      },
    })
  }

  function searchStubHub(artistName) {
    const controller = new AbortController()
    abortControllersRef.current['StubHub'] = controller
    const zipContext = buildZipContext(zipFilter)
    const goal =
      `Go to https://www.stubhub.com and search for "${artistName}" concerts. ${zipContext}${SEARCH_SCOPE} Find the cheapest available listing in the US, 2026. Return ONLY valid JSON with no extra text:
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

    runTinyfishAgent({
      url: 'https://www.stubhub.com',
      goal,
      signal: controller.signal,
      onProgress: (text) => {
        if (!text) return
        setPlatformProgress(prev => ({ ...prev, StubHub: text }))
      },
      onStreamUrl: (url) => setPlatformStreamUrl('StubHub', url),
      onComplete: (resultJson) => {
        clearProgress('StubHub')
        const parsed = parseTicketResult(resultJson)
        if (parsed) {
          setCache('value', `value_StubHub_${artistName}`, parsed, CACHE_TTL.VALUE_RESULT)
          appendResults([parsed], 'StubHub')
        }
        setPlatformStatus('StubHub', 'done')
      },
      onError: () => {
        clearProgress('StubHub')
        if (!tryValueCacheFallback('StubHub', artistName)) {
          setPlatformStatus('StubHub', 'error')
        }
      },
    })
  }

  function triggerSearch(artistName) {
    Object.values(abortControllersRef.current).forEach(c => c.abort())
    abortControllersRef.current = {}

    setResults([])
    setPlatformProgress({ VividSeats: '', StubHub: '', Viagogo: '' })
    setPlatformMeta({
      VividSeats: { status: 'searching', streamUrl: null },
      StubHub:    { status: 'searching', streamUrl: null },
      Viagogo:    { status: 'searching', streamUrl: null },
    })
    setSearched(true)

    searchVividSeats(artistName)
    searchStubHub(artistName)
    searchViagogo(artistName)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim() || zipFilter.trim().length < 2) return
    triggerSearch(query)
  }

  function toggleSeat(seat) {
    setSeatTypes(prev => {
      const next = new Set(prev)
      next.has(seat) ? next.delete(seat) : next.add(seat)
      return next
    })
  }

  // Fix 3: re-score when zipFilter changes (client-side only, no new API call)
  const scored = useMemo(() => {
    if (results.length === 0) return []
    return results.map(r => ({ ...r, valueScore: calcValueScore(r, results, zipFilter) }))
  }, [results, zipFilter])

  // Fix 1: no distance/location gate — only budget filter (null = no limit)
  const filtered = useMemo(() => {
    return scored
      .filter(r => maxBudget === null || r.total <= maxBudget)
      .sort((a, b) => sortBy === 'value' ? b.valueScore - a.valueScore : a.total - b.total)
  }, [scored, maxBudget, sortBy])

  // Location badge: with zip = distance; city name = "Near X"; without = venue + US
  function getLocationBadge(result) {
    if (zipFilter && zipFilter.trim().length >= 2) {
      if (isZipCode(zipFilter)) {
        const miles = estimateMiles(zipFilter, MOCK_VENUE_ZIP)
        return `~${miles} mi away`
      }
      return `Near ${zipFilter.trim()}`
    }
    const venue = result?.venue
    if (venue && venue !== 'Unknown venue' && !venue.toLowerCase().includes('unknown')) {
      return `${venue}, US`
    }
    return 'US'
  }

  const anySearching = Object.values(platformMeta).some(m => m.status === 'searching')

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
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
            Value Mode
          </h1>
          <TooltipButton tooltip={VALUE_TOOLTIP} />
        </div>
        <p style={{ color: '#a0a0b8', fontSize: '0.9rem' }}>
          AI scores every listing for price, fees, section quality, and availability
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}
      >
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Artist, event, or venue..."
          style={{
            flex: '1 1 220px',
            background: '#12121f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: '#fff',
            padding: '12px 18px',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />
        <input
          value={zipFilter}
          onChange={e => {
            const z = e.target.value
            setZipFilter(z)
            if (z.trim().length >= 2) onZipChange?.(z.trim())
          }}
          placeholder="📍 Zip or city"
          style={{
            flex: '0 0 150px',
            background: '#12121f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: '#fff',
            padding: '12px 14px',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn-glow-purple"
          disabled={anySearching || !query.trim() || zipFilter.trim().length < 2}
          style={{
            background: (anySearching || !query.trim() || zipFilter.trim().length < 2) ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '12px 24px',
            cursor: (anySearching || !query.trim() || zipFilter.trim().length < 2) ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          {anySearching ? 'Searching...' : 'Search'}
        </button>
        {anySearching && (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12,
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.95rem',
              padding: '12px 20px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Cancel Search
          </button>
        )}
      </form>

      {searched && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Filters panel */}
          <div
            style={{
              width: 220,
              flexShrink: 0,
              background: '#12121f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '20px',
              position: 'sticky',
              top: 80,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                cursor: 'pointer',
              }}
              onClick={() => setFiltersOpen(o => !o)}
            >
              <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Filters</span>
              <span style={{ color: '#a0a0b8', fontSize: '0.8rem' }}>{filtersOpen ? '▲' : '▼'}</span>
            </div>

            {filtersOpen && (
              <>
                {/* Budget slider */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: '#a0a0b8' }}>Max Budget</span>
                    <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>
                      {maxBudget === null ? 'No limit' : `$${maxBudget}`}
                    </span>
                  </div>
                  <input
                    ref={rangeRef}
                    type="range"
                    min={50}
                    max={600}
                    step={10}
                    value={maxBudget ?? 600}
                    disabled={maxBudget === null}
                    onChange={e => setMaxBudget(Number(e.target.value))}
                    style={{ opacity: maxBudget === null ? 0.3 : 1 }}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: maxBudget === null ? '#c084fc' : '#a0a0b8',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={maxBudget === null}
                      onChange={e => setMaxBudget(e.target.checked ? null : 300)}
                      style={{ accentColor: '#7c3aed', width: 13, height: 13 }}
                    />
                    No upper limit
                  </label>
                </div>

                {/* Seat type */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '0.78rem', color: '#a0a0b8', marginBottom: 10 }}>
                    Seat Type
                  </div>
                  {SEAT_TYPES.map(seat => (
                    <label
                      key={seat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        color: seatTypes.has(seat) ? '#fff' : '#6b6b8a',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={seatTypes.has(seat)}
                        onChange={() => toggleSeat(seat)}
                        style={{ accentColor: '#7c3aed', width: 14, height: 14 }}
                      />
                      {seat}
                    </label>
                  ))}
                </div>

                {/* Sort */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '0.78rem', color: '#a0a0b8', marginBottom: 10 }}>
                    Sort by
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      background: '#0a0a12',
                      borderRadius: 10,
                      padding: 3,
                      gap: 2,
                    }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        style={{
                          flex: 1,
                          background: sortBy === opt.id
                            ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                            : 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          color: sortBy === opt.id ? '#fff' : '#a0a0b8',
                          fontWeight: sortBy === opt.id ? 600 : 400,
                          fontSize: '0.72rem',
                          padding: '6px 4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location filter at bottom of panel */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
                  <div style={{ fontSize: '0.78rem', color: '#a0a0b8', marginBottom: 8 }}>
                    Location
                  </div>
                  <input
                    type="text"
                    value={zipFilter}
                    onChange={e => setZipFilter(e.target.value)}
                    placeholder="Zip or city name"
                    style={{
                      width: '100%',
                      background: '#0a0a12',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#6b6b8a', marginTop: 6 }}>
                    Filter by distance after search
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Results */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Fix 2: Per-platform status chips + progress text */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                {Object.entries(platformMeta).map(([name, meta], badgeIdx) => {
                  const badge = PLATFORM_BADGE[name]
                  const count = results.filter(r => r.platform === name).length
                  const isSearching = meta.status === 'searching'
                  const isDone = meta.status === 'done'
                  const isError = meta.status === 'error'
                  return (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: badge.bg,
                        border: `1px solid ${badge.color}40`,
                        borderRadius: 20,
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: badge.color,
                        // Staggered pulse: VS 0s, SH 0.67s (2s cycle, opacity 0.4 at 50%)
                        animation: isSearching
                          ? `badge-search-pulse 2s ease-in-out infinite`
                          : 'none',
                        animationDelay: isSearching ? `${badgeIdx * 0.67}s` : undefined,
                      }}
                    >
                      <span>{badge.short}</span>
                      {isSearching && (
                        <>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: badge.color,
                              animation: `pulse-dot 0.9s ease-in-out ${badgeIdx * 0.15}s infinite`,
                              flexShrink: 0,
                            }}
                          />
                          <span>Searching...</span>
                        </>
                      )}
                      {isDone && <span>✓ {count} result{count !== 1 ? 's' : ''}</span>}
                      {isError && <span>✕ Error</span>}
                      {meta.streamUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <a
                            href={meta.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Live view may show 'no service' after agent completes or if stream is unavailable"
                            style={{ fontSize: '0.72rem', color: '#E85D04', textDecoration: 'none' }}
                          >
                            🐟 Watch live on TinyFish →
                          </a>
                          <span style={{ fontSize: '0.65rem', color: '#6b6b8a' }}>Powered by TinyFish Web Agent</span>
                        </div>
                      )}
                    </div>
                  )
                })}
                <span style={{ fontSize: '0.8rem', color: '#a0a0b8' }}>
                  {filtered.length > 0 && (
                    <>
                      {filtered.length} listing{filtered.length !== 1 ? 's' : ''} for{' '}
                      <span style={{ color: '#c084fc', fontWeight: 600 }}>{query}</span>
                    </>
                  )}
                </span>
              </div>

              {/* Fix 2: Progress purpose text per platform */}
              {Object.entries(platformProgress).map(([name, text]) => {
                if (!text || platformMeta[name]?.status !== 'searching') return null
                const badge = PLATFORM_BADGE[name]
                return (
                  <div
                    key={name}
                    className="progress-fade"
                    style={{
                      fontSize: '0.7rem',
                      fontStyle: 'italic',
                      color: '#a0a0b8',
                      maxWidth: 480,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: 4,
                    }}
                  >
                    <span style={{ color: badge.color, fontStyle: 'normal', fontWeight: 600 }}>{badge.short}</span>
                    {' — '}{text}
                  </div>
                )
              })}
            </div>

            {/* Live AI sessions - auto shown when any platform is searching */}
            <ValueLiveSessionsPanel platformMeta={platformMeta} />

            {/* Purple shimmer skeleton while searching */}
            {anySearching && filtered.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="skeleton-purple"
                    style={{
                      height: 80,
                      borderRadius: 14,
                      border: '1px solid rgba(124,58,237,0.12)',
                    }}
                  />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((result, idx) => {
                const pc = PLATFORM_BADGE[result.platform] || { color: '#a0a0b8', bg: 'rgba(160,160,184,0.1)', short: '?' }
                const isTop = idx === 0
                const locationBadge = getLocationBadge(result)

                return (
                  <div
                    key={result.id}
                    className="card-hover"
                    style={{
                      background: isTop ? 'rgba(124,58,237,0.06)' : '#12121f',
                      borderRadius: 14,
                      padding: '16px 18px',
                      border: isTop
                        ? '1px solid rgba(124,58,237,0.35)'
                        : '1px solid rgba(255,255,255,0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Rank */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isTop ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: isTop ? '#c084fc' : '#6b6b8a',
                        flexShrink: 0,
                      }}
                    >
                      {isTop ? '★' : idx + 1}
                    </div>

                    {/* Platform badge */}
                    <div
                      style={{
                        background: pc.bg,
                        border: `1px solid ${pc.color}40`,
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: pc.color,
                        flexShrink: 0,
                        minWidth: 44,
                        textAlign: 'center',
                      }}
                    >
                      {pc.short}
                      {result.fromCache && <span title="Cached result"> 📦</span>}
                    </div>

                    {/* Section / Row */}
                    <div style={{ flex: '1 1 100px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: 2 }}>
                        {result.section}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 2 }}>
                        Row {result.row} · {result.available} avail
                      </div>
                      {/* Fix 3: Location badge */}
                      <div
                        style={{
                          display: 'inline-block',
                          fontSize: '0.65rem',
                          color: zipFilter ? '#9b59b6' : '#6b6b8a',
                          background: zipFilter ? 'rgba(155,89,182,0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${zipFilter ? 'rgba(155,89,182,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        📍 {locationBadge}
                      </div>
                    </div>

                    {/* Value score */}
                    <div style={{ flex: '0 0 100px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: '0.7rem', color: '#a0a0b8' }}>Value</span>
                          <TooltipButton tooltip="Score = (Price × 50%) + (Distance × 30%) + (Zone × 20%). Enter your zip in the Location filter to personalize. Scores recalculate instantly." />
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: getScoreColor(result.valueScore),
                          }}
                        >
                          {result.valueScore}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: '#1a1a2e',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${result.valueScore}%`,
                            background: `linear-gradient(90deg, ${getScoreColor(result.valueScore)}, ${getScoreColor(result.valueScore)}cc)`,
                            borderRadius: 3,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {hasValidPrice(result) ? (
                        <>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                            {fmtPrice(result.total)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#a0a0b8' }}>
                            +{fmtPrice(result.fees)} fees
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            color: '#6b6b8a',
                            background: 'rgba(107,107,138,0.15)',
                            border: '1px solid rgba(107,107,138,0.3)',
                            borderRadius: 6,
                            padding: '4px 10px',
                          }}
                        >
                          No price data
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {hasValidPrice(result) && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <a
                          href={getTicketSearchUrl(result.platform, query)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.18)',
                            borderRadius: 10,
                            color: '#a0a0b8',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            padding: '9px 12px',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          View ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => openDemoModal(() => handleBuyNow(result))}
                          style={{
                            background: isTop
                              ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                              : 'rgba(124,58,237,0.12)',
                            border: isTop ? 'none' : '1px solid rgba(124,58,237,0.3)',
                            borderRadius: 10,
                            color: isTop ? '#fff' : '#c084fc',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            padding: '9px 14px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            boxShadow: isTop ? '0 0 16px rgba(124,58,237,0.35)' : 'none',
                          }}
                        >
                          Buy Now
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state: search done, results filtered out */}
      {searched && !anySearching && filtered.length === 0 && results.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            color: '#a0a0b8',
            background: '#12121f',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: '0.95rem', color: '#fff', marginBottom: 6 }}>No results match your current filters</div>
          <div style={{ fontSize: '0.82rem', color: '#6b6b8a' }}>
            Try raising your budget or clearing the zip code filter.
          </div>
          {maxBudget !== null && (
            <button
              onClick={() => setMaxBudget(null)}
              style={{ marginTop: 14, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10, color: '#c084fc', fontSize: '0.82rem', padding: '8px 18px', cursor: 'pointer' }}
            >
              Remove budget limit
            </button>
          )}
        </div>
      )}

      {/* Empty state: search done but API returned nothing */}
      {searched && !anySearching && results.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            color: '#a0a0b8',
            background: '#12121f',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>😕</div>
          <div style={{ fontSize: '0.95rem', color: '#fff', marginBottom: 6 }}>No tickets found for "{query}"</div>
          <div style={{ fontSize: '0.82rem', color: '#6b6b8a' }}>
            Try a different artist name or event, or search again — availability changes frequently.
          </div>
        </div>
      )}

      {/* Idle state */}
      {!searched && (
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
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>💎</div>
          <div style={{ fontSize: '1rem', color: '#6b6b8a' }}>
            Search for an event to see AI-scored listings
          </div>
        </div>
      )}

      {/* Demo purchase modal */}
      {demoModal.visible && (
        <DemoPurchaseModal onConfirm={handleModalConfirm} />
      )}
    </div>
  )
}

// ── ValueLiveSessionsPanel ─────────────────────────────────────────────────
const VALUE_PLATFORMS = [
  { name: 'VividSeats', shortName: 'VS', color: '#9b59b6' },
  { name: 'StubHub',    shortName: 'SH', color: '#1dbf73' },
  { name: 'Viagogo',    shortName: 'VG', color: '#ff6b35' },
]

function ValueLiveSessionsPanel({ platformMeta }) {
  const isAnyActive = VALUE_PLATFORMS.some(
    p => platformMeta[p.name]?.status === 'searching' || platformMeta[p.name]?.streamUrl
  )
  if (!isAnyActive) return null

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#ef4444',
            animation: 'pulse-dot 1s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a0a0b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Live AI Browser Sessions
        </span>
        <span style={{ fontSize: '0.62rem', color: '#6b6b8a' }}>Powered by TinyFish</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {VALUE_PLATFORMS.map(platform => {
          const meta = platformMeta[platform.name]
          const isSearching = meta?.status === 'searching'
          const streamUrl = meta?.streamUrl

          return (
            <div key={platform.name} style={{ flex: '1 1 200px', minWidth: 0 }}>
              {/* Platform label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, paddingLeft: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: `${platform.color}20`,
                      border: `1px solid ${platform.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.58rem', fontWeight: 700, color: platform.color,
                    }}
                  >
                    {platform.shortName}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#a0a0b8' }}>{platform.name}</span>
                </div>
                {isSearching && (
                  <span
                    style={{
                      fontSize: '0.58rem', background: 'rgba(239,68,68,0.85)',
                      color: '#fff', padding: '2px 5px', borderRadius: 4, fontWeight: 700,
                    }}
                  >
                    LIVE
                  </span>
                )}
                {meta?.status === 'done' && <span style={{ fontSize: '0.62rem', color: '#22c55e' }}>✓</span>}
                {meta?.status === 'error' && <span style={{ fontSize: '0.62rem', color: '#ef4444' }}>✕</span>}
              </div>

              {/* Iframe or placeholder */}
              {streamUrl ? (
                <div
                  style={{
                    borderRadius: 8, overflow: 'hidden',
                    border: `1px solid ${platform.color}30`,
                    background: '#000',
                    position: 'relative',
                  }}
                >
                  <iframe
                    src={streamUrl}
                    style={{ width: '100%', height: 190, border: 'none', display: 'block' }}
                    title={`${platform.name} live session`}
                    allow="autoplay"
                  />
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute', bottom: 5, right: 6,
                      fontSize: '0.58rem', color: '#E85D04',
                      background: 'rgba(10,10,18,0.8)',
                      padding: '2px 5px', borderRadius: 4,
                      textDecoration: 'none',
                    }}
                  >
                    ↗ Open
                  </a>
                </div>
              ) : (
                <div
                  style={{
                    height: 190, borderRadius: 8,
                    border: `1px solid ${isSearching ? platform.color + '25' : 'rgba(255,255,255,0.04)'}`,
                    background: '#0a0a12',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isSearching ? (
                    <>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: platform.color,
                              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#6b6b8a' }}>Connecting...</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: '#6b6b8a' }}>
                      {meta?.status === 'done' ? '✓ Session complete' : meta?.status === 'error' ? '✕ Error' : '—'}
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
