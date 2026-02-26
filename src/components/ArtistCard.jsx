import { useState } from 'react'
import ArtistAvatar from './ArtistAvatar'

export default function ArtistCard({ artist, onGetTickets }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="card-hover"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#12121f',
        borderRadius: 16,
        padding: '24px 20px',
        width: 220,
        minHeight: 365,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Avatar */}
      <div style={{ marginBottom: 4 }}>
        <ArtistAvatar
          artistName={artist.name}
          initials={artist.initials}
          gradient={artist.gradient}
          headshot={artist.headshot}
          objectPosition={artist.avatarPosition}
          size="small"
        />
      </div>

      {/* Name — fixed height for consistent card layout */}
      <div style={{ textAlign: 'center', height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 3, lineHeight: 1.3 }}>
          {artist.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>
          {artist.tour}
        </div>
        <div style={{ fontSize: '0.73rem', color: '#a0a0b8', marginBottom: 2, lineHeight: 1.35 }}>
          {artist.venue}, {artist.city}
        </div>
        <div style={{ fontSize: '0.73rem', color: '#a0a0b8', lineHeight: 1.35 }}>
          {artist.dates}
        </div>
      </div>

      {/* Price badge */}
      <div
        style={{
          background: 'rgba(232,93,4,0.18)',
          border: '1px solid rgba(232,93,4,0.35)',
          borderRadius: 20,
          padding: '3px 12px',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#fb923c',
          marginBottom: 4,
        }}
      >
        From ${artist.fromPrice}
      </div>

      {/* Button */}
      <button
        onClick={() => onGetTickets(artist)}
        style={{
          background: hovered ? 'rgba(124,58,237,0.25)' : 'transparent',
          border: '1.5px solid rgba(124,58,237,0.6)',
          borderRadius: 10,
          color: '#c084fc',
          fontWeight: 600,
          fontSize: '0.8rem',
          padding: '7px 16px',
          cursor: 'pointer',
          width: '100%',
          transition: 'all 0.2s ease',
        }}
      >
        Get Tickets
      </button>
    </div>
  )
}
