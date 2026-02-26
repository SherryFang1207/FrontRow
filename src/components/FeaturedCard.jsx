import { useState } from 'react'
import ArtistAvatar from './ArtistAvatar'

export default function FeaturedCard({ artist, badge, onGetTickets }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#12121f',
        borderRadius: 16,
        overflow: 'hidden',
        border: hovered ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: hovered ? '0 0 20px rgba(124,58,237,0.12)' : 'none',
        transition: 'all 0.2s ease',
        position: 'relative',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      {/* Gradient header band with avatar (Last.fm image or initials) */}
      <div
        style={{
          height: 110,
          background: artist.gradient,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Overlay vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(18,18,31,0.7) 100%)',
          }}
        />
        {/* Avatar: Last.fm image or initials fallback */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ArtistAvatar
            artistName={artist.name}
            initials={artist.initials}
            gradient={artist.gradient}
            headshot={artist.headshot}
            objectPosition={artist.avatarPosition}
            size="large"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
          />
        </div>

        {/* Badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: badge.bg,
            border: `1px solid ${badge.color}40`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: badge.color,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            zIndex: 2,
          }}
        >
          {badge.text}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 4 }}>
          {artist.name}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 500, marginBottom: 8 }}>
          {artist.tour}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#a0a0b8' }}>📅 {artist.dates}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#a0a0b8', marginBottom: 16 }}>
          📍 {artist.venue}, {artist.city}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#a0a0b8', marginBottom: 2 }}>From</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fb923c' }}>
              ${artist.fromPrice}
            </div>
          </div>
          <button
            onClick={() => onGetTickets(artist)}
            className="btn-glow-purple"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '9px 18px',
              cursor: 'pointer',
            }}
          >
            View Tickets
          </button>
        </div>
      </div>
    </div>
  )
}
