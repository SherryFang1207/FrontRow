import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { getArtistAvatar, isLastFmConfigured } from './lastfm.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

const app = express()

if (!isLastFmConfigured()) {
  console.warn('[proxy] WARNING: LASTFM_API_KEY not set — artist avatars will fall back to initials')
}

// CORS: localhost in dev, allow deploy origin or any in prod
const corsOrigin = isProd
  ? (process.env.APP_URL || true) // true = reflect request origin
  : /^http:\/\/localhost(:\d+)?$/
app.use(cors({ origin: corsOrigin }))
app.use(express.json())

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY || process.env.VITE_TINYFISH_API_KEY
if (!TINYFISH_API_KEY) {
  console.warn('[proxy] WARNING: TINYFISH_API_KEY or VITE_TINYFISH_API_KEY not set in .env')
}

// ── Server-side result cache ───────────────────────────────────────────────
const resultCache = new Map()
const RESULT_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCacheKey(url, goal) {
  // Extract artist name from goal for cache key
  const match = goal.match(/search for "([^"]+)"/)
  const artist = match ? match[1].toLowerCase().trim() : ''
  // Extract platform from url
  const platform = new URL(url).hostname.replace('www.', '')
  return `${platform}:${artist}`
}

function getCachedResult(key) {
  const entry = resultCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    resultCache.delete(key)
    return null
  }
  return entry.data
}

function setCachedResult(key, data) {
  resultCache.set(key, { data, expiry: Date.now() + RESULT_CACHE_TTL })
  // Prune old entries if cache grows too large
  if (resultCache.size > 200) {
    const now = Date.now()
    for (const [k, v] of resultCache) {
      if (now > v.expiry) resultCache.delete(k)
    }
  }
}

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeySet: !!TINYFISH_API_KEY,
    cacheSize: resultCache.size,
    uptime: process.uptime(),
  })
})

// Last.fm artist avatar — frontend calls
app.get('/api/artist-avatar', async (req, res) => {
  const name = req.query.name
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Missing or empty name query parameter' })
  }

  try {
    if (!isLastFmConfigured()) {
      return res.json({ name: name.trim(), imageUrl: null, source: 'lastfm' })
    }
    const data = await getArtistAvatar(name)
    if (!data) {
      return res.status(404).json({ name: name.trim(), imageUrl: null, source: 'lastfm' })
    }
    res.json({ name: data.name, imageUrl: data.imageUrl, source: 'lastfm' })
  } catch (err) {
    if (err.notFound) {
      return res.status(404).json({ name: name.trim(), imageUrl: null, source: 'lastfm' })
    }
    const isRateLimit = err.code === 29 || /rate limit/i.test(err.message || '')
    if (isRateLimit) {
      return res.status(429).json({
        error: 'Last.fm rate limit. Please try again later.',
        name: name.trim(),
        imageUrl: null,
        source: 'lastfm',
      })
    }
    console.error('[lastfm] Route error:', err.message)
    res.status(500).json({
      error: err.message || 'Failed to fetch artist',
      name: name.trim(),
      imageUrl: null,
      source: 'lastfm',
    })
  }
})

// Proxy endpoint — streams TinyFish SSE back to client
app.post('/api/tinyfish', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { url, goal, browser_profile, proxy_config } = req.body
  const cacheKey = getCacheKey(url, goal)

  // Check server cache first
  const cached = getCachedResult(cacheKey)
  if (cached) {
    console.log(`[proxy] Cache HIT for ${cacheKey}`)
    res.write(`data: ${JSON.stringify({ type: 'PROGRESS', purpose: 'Loading from cache...' })}\n\n`)
    res.write(`data: ${JSON.stringify({ type: 'COMPLETE', status: 'COMPLETED', resultJson: cached, fromCache: true })}\n\n`)
    res.end()
    return
  }

  // Always use stealth + US proxy to bypass bot detection on ticket sites
  const tfBody = {
    url,
    goal,
    browser_profile: 'stealth',
    proxy_config: { enabled: true, country_code: 'US' },
  }
  console.log(`[proxy] ${new Date().toISOString()} → ${url} (stealth mode)`)

  // Upstream timeout: 120s
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120_000)

  // Clean up if client disconnects
  req.on('close', () => {
    controller.abort()
    clearTimeout(timeoutId)
  })

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
        signal: controller.signal,
      }
    )

    if (!tfRes.ok) {
      clearTimeout(timeoutId)
      const errText = await tfRes.text()
      console.error(`[proxy] TinyFish HTTP ${tfRes.status}:`, errText)
      res.write(`data: ${JSON.stringify({ type: 'ERROR', message: `API error ${tfRes.status}: ${errText}` })}\n\n`)
      res.end()
      return
    }

    // Pipe TinyFish SSE stream directly to client, intercepting COMPLETE for caching
    const reader = tfRes.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })

      // Log and cache results
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const evt = JSON.parse(line.slice(6))
          console.log(`[proxy] event: ${evt.type}${evt.status ? '/' + evt.status : ''}`)

          // Cache successful results
          if (evt.type === 'COMPLETE' && (evt.status === 'COMPLETED' || !evt.status) && evt.resultJson) {
            setCachedResult(cacheKey, evt.resultJson)
            console.log(`[proxy] Cached result for ${cacheKey}`)
          }
        } catch {}
      }

      res.write(chunk)
    }
    clearTimeout(timeoutId)
    res.end()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      console.error('[proxy] Request aborted/timed out for:', cacheKey)
      res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'Request timed out. Please try again.' })}\n\n`)
    } else {
      console.error('[proxy] Fetch error:', err.message)
      res.write(`data: ${JSON.stringify({ type: 'ERROR', message: err.message })}\n\n`)
    }
    res.end()
  }
})

// Production: serve Vite build and SPA fallback
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`[proxy] Server running on http://localhost:${port}`)
    console.log(`[proxy] API key: ${TINYFISH_API_KEY ? TINYFISH_API_KEY.slice(0, 16) + '...' : 'NOT SET'}`)
  })
  // Set server-level timeout to 3 minutes (for long SSE streams)
  server.timeout = 180_000
  server.keepAliveTimeout = 180_000
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[proxy] Port ${port} is in use. Kill the process: lsof -ti:${port} | xargs kill -9`)
      console.error(`[proxy] Or run: npx kill-port ${port}`)
      process.exit(1)
    }
    throw err
  })
}

startServer(PORT)
