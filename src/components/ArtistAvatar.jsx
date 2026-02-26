import { useState } from 'react'

/**
 * Renders artist avatar: local headshot if provided, else gradient circle with initials.
 */
export default function ArtistAvatar({ artistName, initials, gradient, headshot, objectPosition, style = {}, size = 'small' }) {
  const [imgError, setImgError] = useState(false)
  const dim = size === 'large' ? 100 : 90

  const baseStyle = {
    width: dim,
    height: dim,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size === 'large' ? '2rem' : '1.6rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
    overflow: 'hidden',
    background: gradient,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    ...style,
  }

  const useImage = headshot && !imgError

  if (useImage) {
    return (
      <div style={{ ...baseStyle, position: 'relative' }}>
        <img
          src={headshot}
          alt={artistName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objectPosition || 'center 45%' }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div style={baseStyle}>
      {initials}
    </div>
  )
}
