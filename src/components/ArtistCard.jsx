import { useState } from 'react'

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
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: artist.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          fontWeight: 700,
          color: '#fff',
          marginBottom: 4,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
          flexShrink: 0,
        }}
      >
        {artist.initials}
      </div>

      {/* Name */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>
          {artist.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 500, marginBottom: 4 }}>
          {artist.tour}
        </div>
        <div style={{ fontSize: '0.73rem', color: '#a0a0b8', marginBottom: 2 }}>
          {artist.venue}, {artist.city}
        </div>
        <div style={{ fontSize: '0.73rem', color: '#a0a0b8', marginBottom: 10 }}>
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
