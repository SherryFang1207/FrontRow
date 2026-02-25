/**
 * Defensively parse a TinyFish resultJson into a normalized ticket object.
 * Handles: string-encoded JSON, missing/zero fields, found:false responses.
 * Returns null if no valid ticket found.
 * Price/fees/total that parse to 0 or NaN should be shown as "—" in UI.
 */
export function parseTicketResult(resultJson) {
  if (!resultJson) return null

  let data = resultJson
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return null
    }
  }

  // Array case: pick first found item
  if (Array.isArray(data)) {
    const found = data.find(item => item?.found !== false && item != null)
    if (!found) return null
    data = found
  }

  if (!data?.found) return null

  const parseNum = v => {
    if (typeof v === 'number' && !isNaN(v)) return v
    const n = parseFloat(String(v ?? '0').replace(/[^0-9.]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const price = parseNum(data.price)
  const fees = parseNum(data.fees)
  const total = parseNum(data.total)

  return {
    found: true,
    section: data.section || 'General',
    row: data.row ?? null,
    price,
    fees,
    total,
    venue: data.venue || 'Unknown venue',
    event_date: data.event_date || 'Date TBD',
    seat_zone: data.seat_zone || '',
    availability: data.availability || '',
  }
}
