import { useState, useRef, useEffect } from 'react'

const TABS = [
  { id: 'speed', label: '⚡ Speed' },
  { id: 'value', label: '💎 Value' },
  { id: 'watch', label: '👁 Watch' },
]

function ZipEditor({ zipCode, onZipChange }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(zipCode || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setInput(zipCode || '')
  }, [zipCode])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function save() {
    const trimmed = input.trim()
    // Accept 5-digit US zip or empty (to clear)
    if (trimmed.length === 5 || trimmed.length === 0) {
      onZipChange(trimmed)
    } else if (trimmed.length >= 3) {
      onZipChange(trimmed)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>📍</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder="5-digit ZIP"
          style={{
            width: 88,
            background: '#12121f',
            border: '1px solid rgba(124,58,237,0.5)',
            borderRadius: 8,
            color: '#fff',
            padding: '5px 10px',
            fontSize: '0.82rem',
            outline: 'none',
          }}
        />
        <button
          onMouseDown={e => { e.preventDefault(); save() }}
          style={{
            background: 'rgba(124,58,237,0.2)',
            border: '1px solid rgba(124,58,237,0.4)',
            borderRadius: 6,
            color: '#c084fc',
            fontSize: '0.75rem',
            padding: '4px 8px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Save
        </button>
        {zipCode && (
          <button
            onMouseDown={e => { e.preventDefault(); setInput(''); onZipChange(''); setEditing(false) }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6,
              color: '#ef4444',
              fontSize: '0.75rem',
              padding: '4px 8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Clear
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={zipCode ? `Location: ${zipCode} (US only). Click to change.` : 'Set your US zip code to find nearby events'}
      style={{
        background: zipCode ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
        border: zipCode ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        color: zipCode ? '#c084fc' : '#6b6b8a',
        fontSize: '0.8rem',
        padding: '5px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}
    >
      <span>📍</span>
      <span style={{ fontWeight: zipCode ? 600 : 400 }}>{zipCode || 'Set location'}</span>
      {zipCode && <span style={{ fontSize: '0.65rem', color: '#6b6b8a', marginLeft: 1 }}>US</span>}
    </button>
  )
}

export default function NavBar({ activeMode, onTabChange, onLogoClick, zipCode, onZipChange }) {
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
        gap: 12,
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

      {/* Tabs */}
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
                color: '#ffffff',
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

      {/* Zip code / location editor */}
      <ZipEditor zipCode={zipCode} onZipChange={onZipChange} />
    </header>
  )
}
