export function formatHours(val) {
  if (val === null || val === undefined || val === '') return '0.00'
  const n = Number(val)
  if (isNaN(n)) return '0.00'
  return n.toFixed(2)
}

// Format decimal hours as hours and minutes, e.g. 1.5 -> "1h 30m", 0.17 -> "10m"
export function formatDuration(val) {
  const n = Number(val)
  if (!n || isNaN(n)) return '0h'
  const totalMins = Math.round(n * 60)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}
