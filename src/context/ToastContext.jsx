import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, borderColor = '#22c55e', duration = 4000, large = false }) => {
    const id = ++_id
    setToasts(prev => [...prev.slice(-2), { id, message, borderColor, large, leaving: false }])

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 300)
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={toast.leaving ? 'toast-out' : 'toast-in'}
          style={{
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderLeft: `4px solid ${toast.borderColor}`,
            borderRadius: 12,
            padding: toast.large ? '16px 20px' : '12px 16px',
            maxWidth: 340,
            minWidth: 240,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontSize: toast.large ? '0.95rem' : '0.85rem',
            color: '#fff',
            lineHeight: 1.5,
            pointerEvents: 'auto',
            fontWeight: toast.large ? 600 : 400,
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
