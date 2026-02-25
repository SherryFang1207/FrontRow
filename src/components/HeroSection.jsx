export default function HeroSection({ onTabChange }) {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #1a0533 0%, #0d0d20 60%, #0a0a12 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 24px 72px',
        textAlign: 'center',
      }}
    >
      {/* Radial glow backdrop */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 400,
          background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 300,
          background: 'radial-gradient(ellipse at center, rgba(224,64,251,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.2rem, 6vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 20,
            background: 'linear-gradient(135deg, #ffffff 40%, #e040fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Get Front Row.<br />Every Time.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '1.1rem',
            color: '#a0a0b8',
            marginBottom: 36,
            lineHeight: 1.6,
          }}
        >
          AI-powered ticket agent.&nbsp;&nbsp;3 platforms.&nbsp;&nbsp;Real-time.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          <button
            onClick={() => onTabChange('value')}
            className="btn-glow-purple"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '14px 28px',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            🎵 Find Tickets →
          </button>
          <button
            onClick={() => onTabChange('watch')}
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 12,
              color: '#e0e0f0',
              fontWeight: 500,
              fontSize: '1rem',
              padding: '14px 28px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.color = '#e0e0f0'
            }}
          >
            See How It Works
          </button>
        </div>

        {/* Stats bar: white default, purple on hover */}
        <div
          className="hero-tags"
          style={{
            display: 'inline-flex',
            gap: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 40,
            padding: '10px 28px',
            fontSize: '0.8rem',
            color: '#ffffff',
            letterSpacing: '0.02em',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span>3 Platforms</span>
          <span style={{ padding: '0 12px', opacity: 0.4 }}>·</span>
          <span>Real-Time Search</span>
          <span style={{ padding: '0 12px', opacity: 0.4 }}>·</span>
          <span>AI-Powered</span>
        </div>
      </div>
    </section>
  )
}
