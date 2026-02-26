import { useState, useEffect } from 'react'

// Use relative /api so Vite proxy forwards to backend (avoids CORS + wrong server)
const API_BASE = ''

/**
 * Fetches artist avatar URL from Last.fm via our backend.
 * Returns { imageUrl, loading, error }. Use imageUrl when present, else fall back to initials.
 *
 * Backend: GET /api/artist-avatar?name=<artistName>
 * Response: { name, imageUrl, source: "lastfm" } — imageUrl is null if no image.
 *
 * Frontend usage:
 *   fetch(`${API_BASE}/api/artist-avatar?name=${encodeURIComponent('Ariana Grande')}`)
 *     .then(res => res.json())
 *     .then(({ name, imageUrl, source }) => console.log(imageUrl || 'use initials'))
 */
export function useArtistAvatar(artistName) {
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!artistName?.trim()) {
      setLoading(false)
      setImageUrl(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const name = encodeURIComponent(artistName.trim())
    fetch(`${API_BASE}/api/artist-avatar?name=${name}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setImageUrl(data?.imageUrl ?? null)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setImageUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [artistName])

  return { imageUrl, loading, error }
}
