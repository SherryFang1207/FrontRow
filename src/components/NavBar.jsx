const TABS = [
  { id: 'speed', label: '⚡ Speed' },
  { id: 'value', label: '💎 Value' },
  { id: 'watch', label: '👁 Watch' },
]

export default function NavBar({ activeMode, onTabChange, onLogoClick }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'rgba(10, 10, 18, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Logo */}
      <button
        onClick={onLogoClick}
        style={{
          background: 'linear-gradient(135deg, #ffffff, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.25rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          flexShrink: 0,
          padding: 0,
        }}
      >
        🎫 FrontRow
      </button>

      {/* Tabs: white by default, purple on hover */}
      <nav style={{ display: 'flex', gap: 4 }}>
        {TABS.map(tab => {
          const active = activeMode === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="nav-tab"
              style={{
                background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
                color: active ? '#ffffff' : '#ffffff',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
                padding: '6px 16px',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.01em',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
