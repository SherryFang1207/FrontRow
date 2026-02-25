import { useState, useEffect } from 'react'

export default function DebugPanel() {
  const [visible, setVisible] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [callCount, setCallCount] = useState(0)
  const [log, setLog] = useState([])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        setVisible(v => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function onDebug(e) {
      const msg = e.detail
      setLastEvent(msg)
      setLog(prev => [...prev.slice(-49), { ts: Date.now(), ...msg }])

      if (msg.type === 'STARTED') setCallCount(c => c + 1)
      if (msg.type === 'COMPLETE' && msg.resultJson != null) {
        setLastResult(msg.resultJson)
      }
    }
    window.addEventListener('tinyfish-debug', onDebug)
    return () => window.removeEventListener('tinyfish-debug', onDebug)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 420,
        maxHeight: 480,
        background: '#0a0a12',
        border: '1px solid rgba(124,58,237,0.5)',
        borderRadius: 14,
        padding: 16,
        zIndex: 9990,
        fontFamily: 'monospace',
        fontSize: '0.72rem',
        color: '#a0a0b8',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 0 40px rgba(124,58,237,0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#c084fc', fontWeight: 700 }}>🐛 Debug Panel <span style={{ color: '#6b6b8a', fontWeight: 400 }}>(Ctrl+D to close)</span></span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setLog([]); setLastEvent(null); setLastResult(null); setCallCount(0) }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#6b6b8a', cursor: 'pointer', fontSize: '0.68rem', padding: '2px 8px' }}
          >
            clear
          </button>
        </div>
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem' }}>
        <span>API calls: <span style={{ color: '#fff' }}>{callCount}</span></span>
        <span>Last: <span style={{ color: lastEvent ? '#22c55e' : '#6b6b8a' }}>{lastEvent?.type ?? '—'}{lastEvent?.status ? `/${lastEvent.status}` : ''}</span></span>
      </div>

      {/* Last result */}
      {lastResult != null && (
        <div>
          <div style={{ color: '#7c3aed', marginBottom: 4 }}>Last resultJson:</div>
          <pre
            style={{
              background: '#12121f',
              borderRadius: 8,
              padding: '8px 10px',
              overflowX: 'auto',
              maxHeight: 120,
              overflowY: 'auto',
              color: '#e0e0f0',
              fontSize: '0.68rem',
              margin: 0,
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Event log */}
      <div>
        <div style={{ color: '#7c3aed', marginBottom: 4 }}>SSE event log (last 50):</div>
        <div
          style={{
            background: '#12121f',
            borderRadius: 8,
            padding: '6px 8px',
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid rgba(124,58,237,0.15)',
          }}
        >
          {log.length === 0 && <div style={{ color: '#4b4b6a' }}>No events yet. Run a search.</div>}
          {[...log].reverse().map((entry, i) => (
            <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', lineHeight: 1.4 }}>
              <span style={{ color: '#4b4b6a' }}>{new Date(entry.ts).toISOString().slice(11, 19)} </span>
              <span style={{
                color: entry.type === 'COMPLETE' ? '#22c55e' : entry.type === 'ERROR' ? '#ef4444' : entry.type === 'PROGRESS' ? '#f59e0b' : '#a0a0b8',
              }}>
                {entry.type}
              </span>
              {entry.status && <span style={{ color: '#6b6b8a' }}>/{entry.status}</span>}
              {entry.purpose && <span style={{ color: '#a0a0b8' }}> — {entry.purpose.slice(0, 55)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
