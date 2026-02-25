const PROXY_ENDPOINT =
  (import.meta.env.VITE_API_BASE ?? 'http://localhost:3001') + '/api/tinyfish'

/**
 * Standalone TinyFish query runner.
 * Handles SSE parsing. No timeout — TinyFish can take 2–5 minutes.
 */
export async function runTinyfishQuery({ url, goal, onProgress, onStreamUrl, onComplete, onError, signal: externalSignal }) {
  const controller = new AbortController()

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: 'stealth',
        proxy_config: { enabled: true, country_code: 'US' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

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

        console.log('[useTinyfish]', event.type, event.status ?? '')
        window.dispatchEvent(new CustomEvent('tinyfish-debug', { detail: event }))

        if (event.type === 'HEARTBEAT' || event.type === 'HET') continue
        if (event.type === 'STREAMING_URL') onStreamUrl?.(event.streamingUrl)
        else if (event.type === 'PROGRESS') onProgress?.(event.purpose ?? '')
        else if (event.type === 'COMPLETE') {
          if (event.status === 'FAILED') {
            onError?.(new Error(event.error ?? event.message ?? 'Agent failed'))
            return
          }
          if (event.status === 'COMPLETED' || !event.status) {
            onComplete?.(event.resultJson)
          }
          return
        } else if (event.type === 'ERROR') {
          onError?.(new Error(event.error ?? event.message ?? 'Agent error'))
          return
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return
    onError?.(err)
  }
}
