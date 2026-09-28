/**
 * Clipboard write with a fallback for insecure contexts.
 *
 * `navigator.clipboard` is only exposed in a secure context (HTTPS, or
 * localhost). This deployment is served over plain HTTP on a real hostname, so
 * `navigator.clipboard` is `undefined` there and a bare `navigator.clipboard
 * .writeText(...)` throws a TypeError — which previously meant copy actions
 * died before they could report anything back to the user.
 *
 * The legacy `document.execCommand('copy')` path still works in those contexts,
 * so we use it as the fallback and let callers surface success/failure.
 */

export async function writeToClipboard(text) {
  const value = text == null ? '' : String(text)
  if (!value) throw new Error('Nothing to copy')

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return value
  }

  if (typeof document.execCommand !== 'function') {
    throw new Error('Clipboard is unavailable in this browser/context')
  }

  const ta = document.createElement('textarea')
  ta.value = value
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-1000px'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, ta.value.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    document.body.removeChild(ta)
  }
  if (!ok) throw new Error('execCommand("copy") was rejected')
  return value
}
