export function formatHours(val) {
  if (val === null || val === undefined || val === '') return '0.00'
  const n = Number(val)
  if (isNaN(n)) return '0.00'
  return n.toFixed(2)
}
