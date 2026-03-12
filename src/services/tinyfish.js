// Routes through local proxy (server/index.js) to avoid CORS
const PROXY_ENDPOINT =
  (import.meta.env.VITE_API_BASE ?? 'http://localhost:3001') + '/api/tinyfish'

// Timeout for the initial fetch connection (90s — TinyFish can be slow)
const FETCH_TIMEOUT_MS = 90_000

/**
 * Run a TinyFish automation agent via the local SSE proxy.
 *
 * SSE event types from the API:
 *   STARTED        — ignored
 *   STREAMING_URL  — { streamingUrl }
 *   PROGRESS       — { purpose }
 *   COMPLETE       — { status: 'COMPLETED', resultJson }
 *   ERROR          — { message }
 *
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} opts.goal
 * @param {AbortSignal} [opts.signal]
 * @param {(text: string) => void}   [opts.onProgress]
 * @param {(url: string) => void}    [opts.onStreamUrl]
 * @param {(result: any) => void}    [opts.onComplete]
 * @param {(err: Error) => void}     [opts.onError]
 */
export async function runTinyfishAgent({
  url,
  goal,
  signal,
  onProgress,
  onStreamUrl,
  onComplete,
  onError,
}) {
  // Create a timeout abort if no external signal provided
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS)

  // Combine external signal with timeout
  const combinedSignal = signal
    ? AbortSignal.any
      ? AbortSignal.any([signal, timeoutController.signal])
      : signal // fallback for older browsers
    : timeoutController.signal

  let response
  try {
    response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: 'stealth',
        proxy_config: { enabled: true, country_code: 'US' },
      }),
      signal: combinedSignal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      // Distinguish timeout from user cancel
      if (signal?.aborted) return
      onError?.(new Error('Request timed out'))
      return
    }
    onError?.(err)
    return
  }

  if (!response.ok) {
    clearTimeout(timeoutId)
    onError?.(new Error(`Proxy HTTP ${response.status}`))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        let event
        try {
          event = JSON.parse(line.slice(6))
        } catch {
          continue
        }

        // Log all SSE events and dispatch to DebugPanel
        console.log('[tinyfish]', event.type, event.status ?? '', event.purpose?.slice(0, 60) ?? '')
        window.dispatchEvent(new CustomEvent('tinyfish-debug', { detail: event }))

        const t = event.type
        if (t === 'HEARTBEAT' || t === 'HET') {
          continue
        }
        if (t === 'STREAMING_URL') {
          onStreamUrl?.(event.streamingUrl)
        } else if (t === 'PROGRESS') {
          onProgress?.(event.purpose ?? '')
        } else if (t === 'COMPLETE') {
          clearTimeout(timeoutId)
          if (event.status === 'FAILED') {
            onError?.(new Error(event.error ?? event.message ?? 'Agent failed'))
            return
          }
          if (event.status === 'COMPLETED' || !event.status) {
            onComplete?.(event.resultJson ?? null)
          }
          return
        } else if (t === 'ERROR') {
          clearTimeout(timeoutId)
          onError?.(new Error(event.error ?? event.message ?? 'Agent error'))
          return
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      if (signal?.aborted) return
      onError?.(new Error('Request timed out'))
      return
    }
    onError?.(err)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Check if the proxy server is reachable.
 */
export async function checkProxyHealth() {
  try {
    const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'
    const res = await fetch(base + '/api/health', { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
