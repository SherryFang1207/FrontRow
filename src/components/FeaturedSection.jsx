import FeaturedCard from './FeaturedCard'
import { ARTISTS, FEATURED_BADGES } from '../data/mockData'

export default function FeaturedSection({ onGetTickets }) {
  const featured = ARTISTS.slice(0, 3)

  return (
    <section style={{ padding: '0 24px 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Featured This Month
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#a0a0b8' }}>
          Top picks curated by our AI agent
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {featured.map((artist, i) => (
          <FeaturedCard
            key={artist.id}
            artist={artist}
            badge={FEATURED_BADGES[i]}
            onGetTickets={onGetTickets}
          />
        ))}
      </div>
    </section>
  )
}
