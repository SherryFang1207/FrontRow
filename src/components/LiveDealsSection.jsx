// PHASE4: replace hardcoded deals with real polling cache

const PLATFORM_STYLE = {
  VividSeats: { short: 'VS', color: '#9b59b6', bg: 'rgba(155,89,182,0.18)' },
  StubHub:    { short: 'SH', color: '#1dbf73', bg: 'rgba(29,191,115,0.18)' },
}

// PHASE4: replace with real polling cache
const CACHED_DEALS = [
  {
    id: 'deal-1',
    artist: 'Ariana Grande',
    tour: 'Eternal Sunshine Tour',
    platform: 'VividSeats',
    section: 'Floor GA',
    row: '1',
    price: 312,
    fees: 48,
    total: 360,
    score: 91,
  },
  {
    id: 'deal-2',
    artist: 'Lady Gaga',
    tour: 'The Mayhem Ball',
    platform: 'StubHub',
    section: 'Section 102',
    row: 'E',
    price: 127,
    fees: 31,
    total: 158,
    score: 78,
  },
  {
    id: 'deal-3',
    artist: 'Bad Bunny',
    tour: 'DEBÍ TiRAR MáS FOToS',
    platform: 'VividSeats',
    section: 'Pit',
    row: 'GA',
    price: 198,
    fees: 35,
    total: 233,
    score: 85,
  },
  {
    id: 'deal-4',
    artist: 'Bruno Mars',
    tour: 'The Romantic Tour',
    platform: 'StubHub',
    section: 'Lower Bowl 201',
    row: 'C',
    price: 445,
    fees: 67,
    total: 512,
    score: 72,
  },
]

function getScoreColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  return '#ef4444'
}

export default function LiveDealsSection({ onGetTickets }) {
  return (
    <section style={{ padding: '32px 24px 0' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 4,
              letterSpacing: '-0.01em',
            }}
          >
            🔥 Live Deals — Updated Just Now
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#a0a0b8', margin: 0 }}>
            Real ticket prices from StubHub &amp; VividSeats
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: '0.72rem', color: '#6b6b8a' }}>Refreshes every 30 min</span>
          {/* PHASE4: replace with real cache timestamp */}
          <span style={{ fontSize: '0.7rem', color: '#6b6b8a' }}>Last updated 2 min ago</span>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 12,
          scrollbarWidth: 'none',
        }}
      >
        {CACHED_DEALS.map(deal => {
          const ps = PLATFORM_STYLE[deal.platform] || { short: '?', color: '#a0a0b8', bg: 'rgba(255,255,255,0.1)' }
          const scoreColor = getScoreColor(deal.score)

          return (
            <div
              key={deal.id}
              className="card-hover"
              style={{
                minWidth: 280,
                maxWidth: 280,
                flexShrink: 0,
                background: '#12121f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Artist + platform badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>
                    {deal.artist}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9b59b6' }}>{deal.tour}</div>
                </div>
                <div
                  style={{
                    background: ps.bg,
                    border: `1px solid ${ps.color}50`,
                    borderRadius: 8,
                    padding: '3px 9px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: ps.color,
                    flexShrink: 0,
                  }}
                >
                  {ps.short}
                </div>
              </div>

              {/* Section / Row */}
              <div style={{ fontSize: '0.78rem', color: '#a0a0b8' }}>
                {deal.section} · Row {deal.row}
              </div>

              {/* Price block */}
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E85D04', lineHeight: 1 }}>
                  ${deal.price}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b6b8a', marginTop: 2 }}>
                  + ${deal.fees} fees
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a0a0b8', marginTop: 2 }}>
                  Total: ${deal.total}
                </div>
              </div>

              {/* Score badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: `${scoreColor}18`,
                    border: `1px solid ${scoreColor}40`,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: scoreColor,
                  }}
                >
                  Score {deal.score}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: '#1a1a2e',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${deal.score}%`,
                      background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)`,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => onGetTickets && onGetTickets({ name: deal.artist })}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(124,58,237,0.45)',
                  borderRadius: 10,
                  color: '#c084fc',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  padding: '9px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                Get This Ticket →
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
