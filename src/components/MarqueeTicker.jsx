const ITEMS = [
  '🎵 Concert', '✦ Festival', '✦ Verified Tickets', '✦ Best Price',
  '✦ Limited Offers', '✦ Early Access', '✦ Floor Seats', '✦ VIP Packages',
]

export default function MarqueeTicker() {
  const doubled = [...ITEMS, ...ITEMS]

  return (
    <div
      style={{
        background: 'rgba(124,58,237,0.08)',
        borderTop: '1px solid rgba(124,58,237,0.15)',
        borderBottom: '1px solid rgba(124,58,237,0.15)',
        overflow: 'hidden',
        padding: '10px 0',
      }}
    >
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              padding: '0 32px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
