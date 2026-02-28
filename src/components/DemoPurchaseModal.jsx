export default function DemoPurchaseModal({ onConfirm }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#12121f',
          border: '1px solid rgba(124,58,237,0.45)',
          borderRadius: 20,
          padding: '36px 32px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(124,58,237,0.22)',
        }}
      >
        <div style={{ fontSize: '2.8rem', marginBottom: 14 }}>🛒</div>
        <h3
          style={{
            color: '#fff',
            fontSize: '1.15rem',
            fontWeight: 700,
            marginBottom: 10,
            letterSpacing: '-0.01em',
          }}
        >
          Demo Feature Only
        </h3>
        <p
          style={{
            color: '#a0a0b8',
            fontSize: '0.88rem',
            lineHeight: 1.65,
            marginBottom: 26,
          }}
        >
          This is a demo —{' '}
          <strong style={{ color: '#c084fc' }}>no real purchase will be made</strong>.
          <br />
          Clicking <em>Gotcha!</em> will simulate the ordering process.
        </p>
        <button
          onClick={onConfirm}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            padding: '12px 36px',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}
        >
          Gotcha!
        </button>
      </div>
    </div>
  )
}
