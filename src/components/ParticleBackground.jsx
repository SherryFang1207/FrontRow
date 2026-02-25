import { useEffect, useRef } from 'react'

const COLORS = [
  'rgba(124,58,237,0.6)',
  'rgba(224,64,251,0.5)',
  'rgba(232,93,4,0.4)',
  'rgba(255,255,255,0.3)',
]

function makeParticle(canvas, spreadY = false) {
  return {
    x:     Math.random() * canvas.width,
    y:     spreadY ? Math.random() * canvas.height : canvas.height + Math.random() * 80,
    r:     1 + Math.random() * 3,
    speed: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    drift: 0.3 + Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Spread particles across the full canvas on init
    const particles = Array.from({ length: 60 }, () => makeParticle(canvas, true))

    let frame = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      for (const p of particles) {
        p.y -= p.speed
        p.x += Math.sin(frame * 0.01 * p.drift + p.phase) * 0.45

        // Fade in near bottom, fade out near top
        const progress = 1 - p.y / canvas.height
        let alpha
        if (progress < 0.12)      alpha = progress / 0.12
        else if (progress > 0.78) alpha = 1 - (progress - 0.78) / 0.22
        else                      alpha = 1

        if (p.y < -20) {
          Object.assign(p, makeParticle(canvas, false))
        }

        ctx.save()
        ctx.globalAlpha = alpha * 0.75
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
