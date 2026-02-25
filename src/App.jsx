import { useState } from 'react'
import NavBar from './components/NavBar'
import HomePage from './components/HomePage'
import SpeedMode from './components/SpeedMode'
import ValueMode from './components/ValueMode'
import WatchMode from './components/WatchMode'
import ParticleBackground from './components/ParticleBackground'
import DebugPanel from './components/DebugPanel'
import { ToastProvider } from './context/ToastContext'

export default function App() {
  const [activeMode, setActiveMode] = useState('home') // 'home' | 'speed' | 'value' | 'watch'
  const [selectedArtist, setSelectedArtist] = useState(null)

  function handleGetTickets(artist) {
    setSelectedArtist(artist)
    setActiveMode('value')
  }

  function handleTabChange(tab) {
    setActiveMode(tab)
    if (tab !== 'value') setSelectedArtist(null)
  }

  return (
    <ToastProvider>
      {/* Ambient particle background — fixed, behind everything */}
      <ParticleBackground />

      <div style={{ background: 'rgba(10,10,18,0.3)', minHeight: '100vh', color: '#ffffff', position: 'relative', zIndex: 1 }}>
        <NavBar
          activeMode={activeMode}
          onTabChange={handleTabChange}
          onLogoClick={() => setActiveMode('home')}
        />

        <div style={{ paddingTop: 64 }}>
          {activeMode === 'home'  && <HomePage onGetTickets={handleGetTickets} onTabChange={handleTabChange} />}
          {activeMode === 'speed' && <SpeedMode />}
          {activeMode === 'value' && <ValueMode initialArtist={selectedArtist} />}
          {activeMode === 'watch' && <WatchMode />}
        </div>
      </div>
      <DebugPanel />
    </ToastProvider>
  )
}
