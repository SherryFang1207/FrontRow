/**
 * Last.fm API — Artist avatar lookup
 * Uses artist.getinfo to fetch artist images. No auth required (api_key only).
 */

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const API_URL = 'https://ws.audioscrobbler.com/2.0/'

const IMAGE_SIZE_ORDER = ['mega', 'extralarge', 'large', 'medium', 'small']
const ARTIST_CACHE_MS = 24 * 60 * 60 * 1000 // 24h

// Last.fm returns this URL when artist has no custom image (gray circle with star)
const LASTFM_PLACEHOLDER_ID = '2a96cbd8b46e442fc41c2b86b821562f'

const artistCache = new Map()

function isPlaceholderUrl(url) {
  return !url || typeof url !== 'string' || url.includes(LASTFM_PLACEHOLDER_ID)
}

function getBestImageUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null
  for (const size of IMAGE_SIZE_ORDER) {
    const img = images.find(i => i?.size === size)
    const url = img?.['#text'] || img?.url
    if (url && url.trim().length > 0 && !isPlaceholderUrl(url)) return url
  }
  return null
}

async function fetchArtistInfo(artistName) {
  const artist = encodeURIComponent(artistName.trim())
  const params = new URLSearchParams({
    method: 'artist.getinfo',
    artist,
    api_key: LASTFM_API_KEY,
    format: 'json',
    autocorrect: 1,
  })
  const url = `${API_URL}?${params}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.error) {
    const err = new Error(data.message || `Last.fm error: ${data.error}`)
    err.code = data.error
    err.status = res.status
    err.notFound = data.error === 6 || /not found/i.test(data.message || '')
    throw err
  }

  if (!res.ok) {
    throw new Error(`Last.fm HTTP ${res.status}`)
  }

  return data
}

export async function getArtistAvatar(artistName) {
  if (!artistName || typeof artistName !== 'string') {
    return null
  }

  const trimmed = artistName.trim()
  if (!trimmed) {
    return null
  }

  const key = trimmed.toLowerCase()
  const cached = artistCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  try {
    const data = await fetchArtistInfo(trimmed)
    const artistData = data?.artist

    if (!artistData) {
      const result = { name: trimmed, imageUrl: null, source: 'lastfm' }
      artistCache.set(key, { data: result, expiresAt: Date.now() + ARTIST_CACHE_MS })
      return result
    }

    const imageUrl = getBestImageUrl(artistData.image)
    const name = artistData.name || trimmed
    const result = { name, imageUrl, source: 'lastfm' }

    artistCache.set(key, { data: result, expiresAt: Date.now() + ARTIST_CACHE_MS })
    return result
  } catch (err) {
    console.error('[lastfm] getArtistAvatar error:', err.message)
    throw err
  }
}

export function isLastFmConfigured() {
  return !!LASTFM_API_KEY
}
