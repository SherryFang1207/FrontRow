import { useState } from 'react'

export default function TooltipButton({ tooltip }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#a0a0b8',
          fontSize: '0.65rem',
          fontWeight: 700,
          cursor: 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 8,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        ?
      </button>

      {visible && (
        <div
          className="tooltip-content"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '50%',
            /* translateX is baked into tooltip-content keyframe */
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '12px 14px',
            maxWidth: 280,
            minWidth: 220,
            fontSize: '0.78rem',
            color: '#e0e0f0',
            lineHeight: 1.55,
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            zIndex: 1000,
            whiteSpace: 'normal',
            textAlign: 'left',
            pointerEvents: 'none',
          }}
        >
          {tooltip}
          {/* small arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: -5,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#1a1a2e',
              borderRight: '1px solid rgba(255,255,255,0.12)',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        </div>
      )}
    </div>
  )
}
