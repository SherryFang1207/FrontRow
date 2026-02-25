import { useRef } from 'react'
import ArtistCard from './ArtistCard'
import { ARTISTS } from '../data/mockData'

export default function TrendingSection({ onGetTickets }) {
  const scrollRef = useRef(null)

  function scroll(dir) {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 240, behavior: 'smooth' })
    }
  }

  return (
    <section style={{ padding: '48px 0 40px' }}>
      <div style={{ padding: '0 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Trending Concerts
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#a0a0b8' }}>
            Live events with tickets available now
          </p>
        </div>

        {/* Scroll arrows (desktop helper) */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[['←', -1], ['→', 1]].map(([label, dir]) => (
            <button
              key={dir}
              onClick={() => scroll(dir)}
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 8,
                color: '#a0a0b8',
                width: 34,
                height: 34,
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          padding: '4px 24px 16px',
          scrollbarWidth: 'thin',
        }}
      >
        {ARTISTS.map(artist => (
          <ArtistCard key={artist.id} artist={artist} onGetTickets={onGetTickets} />
        ))}
      </div>
    </section>
  )
}
