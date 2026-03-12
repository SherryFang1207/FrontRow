/**
 * localStorage-based cache with TTL for ticket search results.
 * Keys are namespaced: `frontrow_cache_{type}_{hash}`
 */

const CACHE_PREFIX = 'frontrow_cache_'

// Default TTLs in milliseconds
export const CACHE_TTL = {
  SPEED_RESULT: 10 * 60 * 1000,   // 10 minutes - prices change fast
  VALUE_RESULT: 10 * 60 * 1000,   // 10 minutes
  WATCH_PRICE:  15 * 60 * 1000,   // 15 minutes
  TRENDING:     60 * 60 * 1000,   // 1 hour - homepage data
}

function hashKey(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function cacheKey(type, query) {
  return CACHE_PREFIX + type + '_' + hashKey(query.toLowerCase().trim())
}

export function getCached(type, query) {
  try {
    const key = cacheKey(type, query)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, expiry } = JSON.parse(raw)
    if (Date.now() > expiry) {
      localStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function setCache(type, query, data, ttl) {
  try {
    const key = cacheKey(type, query)
    localStorage.setItem(key, JSON.stringify({
      data,
      expiry: Date.now() + ttl,
      cachedAt: new Date().toISOString(),
    }))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function clearExpiredCache() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
    for (const key of keys) {
      try {
        const { expiry } = JSON.parse(localStorage.getItem(key))
        if (Date.now() > expiry) localStorage.removeItem(key)
      } catch {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }
}
