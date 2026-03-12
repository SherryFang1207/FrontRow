import { useState, useRef } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { WATCH_EVENTS } from '../data/mockData'
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

function buildZipContext(location) {
  if (!location || !location.trim()) return ''
  const loc = location.trim()
  const isZip = /^\d{5}$/.test(loc)
  const locDesc = isZip ? `near US zip code ${loc}` : `in or near ${loc}, US`
  return `The user is located ${locDesc} — prefer US events in the same state or nearby region. `
}

const WATCH_TOOLTIP =
  '👁 Watch Mode monitors ticket prices over time and alerts you when they drop to your target. In this demo, no real notifications will be sent — but enter your email or phone to see how it would work.'

const TREND_CONFIG = {
  up:     { icon: '↑', color: '#ef4444', label: 'Rising' },
  down:   { icon: '↓', color: '#22c55e', label: 'Falling' },
  stable: { icon: '→', color: '#f59e0b', label: 'Stable'  },
}

function getStatusLabel(event) {
  if (event.alert)           return '🔴 Alert! Approaching target'
  if (event.trend === 'up')  return '🔺 Rising — act soon'
  return '🟡 Watching'
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 8,
          padding: '8px 14px',
        }}
      >
        <div style={{ fontSize: '0.72rem', color: '#a0a0b8', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c084fc' }}>
          ${payload[0].value}
        </div>
      </div>
    )
  }
  return null
}

function buildPriceHistory(currentPrice, existingHistory) {
  if (existingHistory.length > 0) {
    return [...existingHistory, { date: 'Today', price: currentPrice }]
  }
  const labels = ['4 wks ago', '3 wks ago', '2 wks ago', '1 wk ago']
  const prior = labels.map(date => ({
    date,
    price: Math.max(10, Math.round(currentPrice + (Math.random() * 30 - 15))),
  }))
  return [...prior, { date: 'Today', price: currentPrice }]
}

export default function WatchMode({ zipCode = '', onZipChange }) {
  const addToast = useToast()
  const [watchList, setWatchList] = useState(WATCH_EVENTS)
  const [expandedId, setExpandedId] = useState(1) // first item open by default
  const [addInput, setAddInput] = useState('')
  const [addTarget, setAddTarget] = useState('')
  const [localZip, setLocalZip] = useState(zipCode || '')
  const [checkingId, setCheckingId] = useState(null)
  const [checkProgress, setCheckProgress] = useState('')
  const [checkStreamUrl, setCheckStreamUrl] = useState(null)
  const [checkError, setCheckError] = useState(null)
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [lastCheckResult, setLastCheckResult] = useState(null) // { eventId, ticket }
  const [demoModal, setDemoModal] = useState({ visible: false, pendingFn: null })
  const abortRef = useRef(null)

  function openDemoModal(fn) {
    setDemoModal({ visible: true, pendingFn: fn })
  }
  function handleModalConfirm() {
    const fn = demoModal.pendingFn
    setDemoModal({ visible: false, pendingFn: null })
    fn?.()
  }

  function handleWatchBuyNow(event, ticket) {
    addToast({ message: 'Securing your ticket...', borderColor: '#7c3aed', duration: 2000 })
    setTimeout(() => {
      const id = 'FR-' + Math.floor(10000000 + Math.random() * 90000000)
      addToast({
        message: `🎫 Secured! ${event.event} · ${ticket.section || 'General'} · $${ticket.total} · Confirmation #${id}`,
        borderColor: '#22c55e',
        duration: 6000,
        large: true,
      })
      spawnConfetti(null)
    }, 2000)
  }

  function handleAdd(e) {
    e.preventDefault()
    if (!addInput.trim() || localZip.trim().length < 2) return
    const price = 150 + Math.floor(Math.random() * 100)
    const target = addTarget ? Number(addTarget) : price - 20
    const newEvent = {
      id: Date.now(),
      event: addInput,
      date: 'TBD',
      currentPrice: price,
      targetPrice: target,
      trend: 'stable',
      alert: false,
      history: [],
    }
    console.log('PHASE2_TINYFISH: watch_add', { event: addInput, targetPrice: target })
    setWatchList(prev => [newEvent, ...prev])
    setAddInput('')
    setAddTarget('')
  }

  function handleRemove(id) {
    if (checkingId === id) {
      abortRef.current?.abort()
      setCheckingId(null)
    }
    setWatchList(prev => prev.filter(e => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function handleCancelCheck() {
    abortRef.current?.abort()
    abortRef.current = null
    setCheckingId(null)
    setCheckProgress('')
    setCheckStreamUrl(null)
    setCheckError(null)
  }

  function handleCheckPrice(event) {
    if (checkingId !== null) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setCheckingId(event.id)
    setCheckProgress('')
    setCheckStreamUrl(null)
    setCheckError(null)

    const SEARCH_SCOPE = 'IMPORTANT: Search scope is United States only. Filter to US events only. Only include events in 2026.'
    const zipContext = buildZipContext(localZip)
    const goal =
      `Go to https://www.stubhub.com and search for "${event.event}" concerts. ${zipContext}${SEARCH_SCOPE} Find the cheapest available listing in the US, 2026. Return ONLY valid JSON with no extra text:
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

    const watchCacheKey = `watch_${event.event}`

    function applyPriceResult(ticket, fromCache = false) {
      const priceNum = ticket?.total
      if (priceNum != null && !isNaN(priceNum) && priceNum > 0) {
        if (!fromCache) {
          setCache('watch', watchCacheKey, ticket, CACHE_TTL.WATCH_PRICE)
        }
        setWatchList(prev =>
          prev.map(e => {
            if (e.id !== event.id) return e
            const trend =
              priceNum < e.currentPrice ? 'down' :
              priceNum > e.currentPrice ? 'up' : 'stable'
            const history = buildPriceHistory(priceNum, e.history)
            const alert = priceNum <= e.targetPrice
            return { ...e, currentPrice: priceNum, trend, history, alert }
          })
        )
        setLastCheckResult({ eventId: event.id, ticket: { ...ticket, fromCache } })
      }
    }

    runTinyfishAgent({
      url: 'https://www.stubhub.com',
      goal,
      signal: controller.signal,
      onProgress: (text) => {
        if (text) setCheckProgress(text)
      },
      onStreamUrl: (url) => setCheckStreamUrl(url),
      onComplete: (resultJson) => {
        const ticket = parseTicketResult(resultJson)
        applyPriceResult(ticket)
        setCheckingId(null)
        setCheckProgress('')
        setCheckStreamUrl(null)
      },
      onError: () => {
        // Try cache fallback
        const cached = getCached('watch', watchCacheKey)
        if (cached) {
          applyPriceResult(cached, true)
          addToast({ message: 'Using cached price — live check failed', borderColor: '#f59e0b', duration: 3000 })
        } else {
          setCheckError('Could not retrieve price.')
          setTimeout(() => setCheckError(null), 3000)
        }
        setCheckingId(null)
        setCheckProgress('')
        setCheckStreamUrl(null)
      },
    })
  }

  function handleSaveContact(e) {
    e.preventDefault()
    addToast({
      message: "Got it! We'll let you know (in a real app 😄)",
      borderColor: '#7c3aed',
      duration: 4000,
    })
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px' }}>
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
            Watch Mode
          </h1>
          <TooltipButton tooltip={WATCH_TOOLTIP} />
        </div>
        <p style={{ color: '#a0a0b8', fontSize: '0.9rem' }}>
          Track price trends and get alerted when tickets drop to your target
        </p>
      </div>

      {/* Add event form */}
      <form
        onSubmit={handleAdd}
        style={{
          background: '#12121f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '20px',
          marginBottom: 20,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 6 }}>
            Event to Watch
          </label>
          <input
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            placeholder="e.g. Bruno Mars — SoFi Stadium"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '0 1 130px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 6 }}>
            Target Price ($)
          </label>
          <input
            type="number"
            value={addTarget}
            onChange={e => setAddTarget(e.target.value)}
            placeholder="e.g. 120"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 6 }}>
            📍 Location
          </label>
          <input
            value={localZip}
            onChange={e => {
              const z = e.target.value
              setLocalZip(z)
              if (z.trim().length >= 2) onZipChange?.(z.trim())
            }}
            placeholder="Zip or city name"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={!addInput.trim() || localZip.trim().length < 2}
          style={{
            background: 'rgba(124,58,237,0.15)',
            border: '1.5px solid rgba(124,58,237,0.45)',
            borderRadius: 12,
            color: (!addInput.trim() || localZip.trim().length < 2) ? '#6b6b8a' : '#c084fc',
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '11px 20px',
            cursor: (!addInput.trim() || localZip.trim().length < 2) ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            opacity: (!addInput.trim() || localZip.trim().length < 2) ? 0.5 : 1,
          }}
        >
          + Watch
        </button>
      </form>

      {/* Notification signup */}
      <div
        style={{
          background: '#12121f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '20px',
          marginBottom: 28,
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: 14 }}>
          🔔 Get Notified When Price Drops
        </div>
        <form onSubmit={handleSaveContact}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ ...inputStyle, flex: '1 1 180px' }}
            />
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              style={{ ...inputStyle, flex: '1 1 160px' }}
            />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6b6b8a', marginBottom: 12 }}>
            ⚠️ This is a demo — no real notifications will be sent.
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.88rem',
              padding: '10px',
              cursor: 'pointer',
            }}
          >
            Save Contact Info
          </button>
        </form>
      </div>

      {/* Alert banner if any */}
      {watchList.some(e => e.alert) && (
        <div
          className="alert-pulse"
          style={{
            background: 'rgba(224,64,251,0.06)',
            border: '1px solid rgba(224,64,251,0.5)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🔔</span>
          <div>
            <span style={{ color: '#e040fb', fontWeight: 700, fontSize: '0.88rem' }}>
              Price Alert!{' '}
            </span>
            <span style={{ color: '#a0a0b8', fontSize: '0.85rem' }}>
              Ariana Grande tickets dropped — approaching your target of $120
            </span>
          </div>
        </div>
      )}

      {/* Watch list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {watchList.map(event => {
          const trend = TREND_CONFIG[event.trend]
          const isExpanded = expandedId === event.id
          const isChecking = checkingId === event.id
          const diff = event.currentPrice - event.targetPrice
          const pctToTarget = Math.min(100, ((event.currentPrice - event.targetPrice) / event.currentPrice) * 100)
          const statusLabel = getStatusLabel(event)
          const isRising = event.trend === 'up' && !event.alert

          return (
            <div
              key={event.id}
              className={event.alert ? 'alert-pulse' : isRising ? 'alert-rising-pulse' : ''}
              style={{
                background: '#12121f',
                borderRadius: 16,
                border: event.alert
                  ? '1px solid rgba(224,64,251,0.5)'
                  : isRising
                  ? '1px solid rgba(239,68,68,0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Summary row */}
              <div
                style={{
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
              >
                {/* Alert dot */}
                {event.alert && (
                  <div
                    className="pulse-dot"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#e040fb',
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Event name + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>
                    {event.event}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#a0a0b8', marginBottom: 2 }}>
                    📅 {event.date}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: event.alert ? '#e040fb' : isRising ? '#ef4444' : '#f59e0b' }}>
                    {statusLabel}
                  </div>
                </div>

                {/* Trend badge */}
                <div
                  style={{
                    background: `${trend.color}18`,
                    border: `1px solid ${trend.color}40`,
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: trend.color,
                    flexShrink: 0,
                  }}
                >
                  {trend.icon} {trend.label}
                </div>

                {/* Prices */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    ${event.currentPrice}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#a0a0b8' }}>
                    Target: <span style={{ color: '#c084fc' }}>${event.targetPrice}</span>
                  </div>
                </div>

                {/* Progress to target */}
                <div style={{ width: 70, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: '#a0a0b8', marginBottom: 4, textAlign: 'right' }}>
                    {diff > 0 ? `-$${diff} to go` : '🎯 At target'}
                  </div>
                  <div style={{ height: 4, background: '#1a1a2e', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${100 - Math.min(100, pctToTarget)}%`,
                        background: event.alert ? '#e040fb' : '#7c3aed',
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Expand / remove */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span style={{ color: '#a0a0b8', fontSize: '0.85rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>
                    ▾
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleRemove(event.id) }}
                    style={{ background: 'none', border: 'none', color: '#4b4b6a', cursor: 'pointer', fontSize: '0.85rem', padding: '0 4px', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#4b4b6a'}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Expanded chart */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#a0a0b8', marginBottom: 16 }}>
                    Price history (last 9 weeks)
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={event.history} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id={`grad-${event.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        stroke="transparent"
                        tick={{ fill: '#a0a0b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="transparent"
                        tick={{ fill: '#a0a0b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `$${v}`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(124,58,237,0.3)', strokeWidth: 1 }} />
                      <ReferenceLine
                        y={event.targetPrice}
                        stroke="rgba(224,64,251,0.5)"
                        strokeDasharray="4 4"
                        label={{ value: `Target $${event.targetPrice}`, fill: '#e040fb', fontSize: 10, position: 'insideTopRight' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        fill={`url(#grad-${event.id})`}
                        dot={false}
                        activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 1.5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleCheckPrice(event) }}
                      disabled={checkingId !== null}
                      className={isChecking ? '' : 'btn-glow-purple'}
                      style={{
                        background: isChecking ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        border: 'none',
                        borderRadius: 10,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        padding: '9px 20px',
                        cursor: checkingId !== null ? 'not-allowed' : 'pointer',
                        opacity: checkingId !== null && !isChecking ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isChecking ? 'Checking...' : 'Check Price'}
                    </button>
                    {isChecking && (
                      <button
                        onClick={e => { e.stopPropagation(); handleCancelCheck() }}
                        type="button"
                        style={{
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 10,
                          color: '#ef4444',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          padding: '9px 16px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel Search
                      </button>
                    )}

                    <button
                      onClick={() => console.log('PHASE2_TINYFISH: watch_set_alert', { eventId: event.id, targetPrice: event.targetPrice })}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(224,64,251,0.35)',
                        borderRadius: 10,
                        color: '#e040fb',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        padding: '9px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🔔 Alert at ${event.targetPrice}
                    </button>

                    {isChecking && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        {checkProgress && (
                          <span style={{ fontSize: '0.72rem', color: '#a0a0b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {checkProgress}
                          </span>
                        )}
                        {checkStreamUrl && (
                          <div style={{ flexShrink: 0 }}>
                            <a
                              href={checkStreamUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Live view may show 'no service' after agent completes or if stream is unavailable"
                              style={{ fontSize: '0.72rem', color: '#E85D04', textDecoration: 'none', display: 'block' }}
                            >
                              🐟 Watch live on TinyFish →
                            </a>
                            <span style={{ fontSize: '0.65rem', color: '#6b6b8a' }}>Powered by TinyFish Web Agent</span>
                          </div>
                        )}
                      </div>
                    )}

                    {checkError && event.id === expandedId && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{checkError}</span>
                    )}
                  </div>

                  {/* View Ticket + Buy Now — shown after a successful price check */}
                  {lastCheckResult?.eventId === event.id && lastCheckResult.ticket?.total > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <a
                        href={`https://www.stubhub.com/find/s/?q=${encodeURIComponent(event.event)}`}
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
                          fontSize: '0.82rem',
                          padding: '9px 16px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        View on StubHub ↗
                      </a>
                      <button
                        onClick={e => { e.stopPropagation(); openDemoModal(() => handleWatchBuyNow(event, lastCheckResult.ticket)) }}
                        style={{
                          background: 'linear-gradient(135deg, #E85D04, #c2410c)',
                          border: 'none',
                          borderRadius: 10,
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '9px 20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Buy Now — ${lastCheckResult.ticket.total}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {watchList.length === 0 && (
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
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>👁</div>
          <div style={{ fontSize: '1rem', color: '#6b6b8a' }}>
            Add events above to start tracking prices
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

const inputStyle = {
  width: '100%',
  background: '#0a0a12',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#fff',
  padding: '10px 14px',
  fontSize: '0.875rem',
  outline: 'none',
}
