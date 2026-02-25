import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()

// Allow any localhost origin (dev)
app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }))
app.use(express.json())

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY || process.env.VITE_TINYFISH_API_KEY
if (!TINYFISH_API_KEY) {
  console.warn('[proxy] WARNING: TINYFISH_API_KEY or VITE_TINYFISH_API_KEY not set in .env')
}

// Proxy endpoint — streams TinyFish SSE back to client
app.post('/api/tinyfish', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { url, goal, browser_profile, proxy_config } = req.body
  // Always use stealth + US proxy to bypass bot detection on ticket sites
  const tfBody = {
    url,
    goal,
    browser_profile: 'stealth',
    proxy_config: { enabled: true, country_code: 'US' },
  }
  console.log(`[proxy] ${new Date().toISOString()} → ${url} (stealth mode)`)

  try {
    const tfRes = await fetch(
      'https://agent.tinyfish.ai/v1/automation/run-sse',
      {
        method: 'POST',
        headers: {
          'X-API-Key': TINYFISH_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tfBody),
      }
    )

    if (!tfRes.ok) {
      const errText = await tfRes.text()
      console.error(`[proxy] TinyFish HTTP ${tfRes.status}:`, errText)
      res.write(`data: ${JSON.stringify({ type: 'ERROR', message: `API error ${tfRes.status}: ${errText}` })}\n\n`)
      res.end()
      return
    }

    // Pipe TinyFish SSE stream directly to client
    const reader = tfRes.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })

      // Log each event type for debugging
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const evt = JSON.parse(line.slice(6))
          console.log(`[proxy] event: ${evt.type}${evt.status ? '/' + evt.status : ''}`)
        } catch {}
      }

      res.write(chunk)
    }
    res.end()
  } catch (err) {
    console.error('[proxy] Fetch error:', err.message)
    res.write(`data: ${JSON.stringify({ type: 'ERROR', message: err.message })}\n\n`)
    res.end()
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[proxy] Server running on http://localhost:${PORT}`)
  console.log(`[proxy] API key: ${TINYFISH_API_KEY ? TINYFISH_API_KEY.slice(0, 16) + '...' : 'NOT SET'}`)
})
