/**
 * CSV export helpers.
 *
 * The report is built from the same column definitions the list renders, so
 * everything reaching a spreadsheet passes through `escapeCell` first. Task
 * titles are free text and routinely contain commas, quotes and newlines,
 * which would otherwise shift every following cell one column to the left and
 * quietly corrupt the whole file.
 */

// A value Excel or Sheets would run as a formula rather than show as text.
const FORMULA_LEAD = /^[=+@\t\r]/
// A leading `-` counts too, but not on a number: negative hours and overdue
// day counts are legitimate cell values and must stay numeric.
const NEGATIVE_NUMBER = /^-\d*\.?\d+(?:[eE][-+]?\d+)?$/

/**
 * Quote a single value so it survives a round trip through a spreadsheet.
 *
 * Embedded quotes are doubled and the value is wrapped whenever it holds a
 * delimiter, a quote or a line break. A leading `=`, `+`, `-` or `@` gets a
 * `'` prefix, which those applications read as "treat the rest as text" —
 * without it a task titled `=1+1` is evaluated on open.
 * @param {*} value
 * @returns {string}
 */
function escapeCell(value) {
  if (value === null || value === undefined) return ''

  let text = String(value)
  // Trim only for the formula check: a leading space is stripped by the
  // spreadsheet, so ` =cmd` would otherwise slip past the guard.
  const lead = text.trimStart()
  if (FORMULA_LEAD.test(lead) || (lead.startsWith('-') && !NEGATIVE_NUMBER.test(lead))) {
    text = `'${text}`
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Serialise a header row plus data rows into RFC 4180 CSV text.
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 * @returns {string}
 */
export function buildCsv(headers, rows) {
  const lines = [(headers || []).map(escapeCell).join(',')]
  for (const row of rows || []) {
    lines.push((row || []).map(escapeCell).join(','))
  }
  // CRLF, not \n: the spec's line ending, and what Excel needs to avoid
  // collapsing the file into a single row.
  return lines.join('\r\n')
}

/**
 * Build the CSV and hand it to the browser as a download.
 * @param {string} filename
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 * @returns {boolean} false when there is no DOM to download from
 */
export function downloadCsv(filename, headers, rows) {
  if (typeof document === 'undefined' || !rows || !rows.length) return false

  // The BOM is what makes Excel treat the file as UTF-8. Without it the app
  // decodes as the local codepage and every non-ASCII character in a task
  // title comes out as mojibake.
  const blob = new Blob(['\uFEFF' + buildCsv(headers, rows)], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Revoking the object URL in the same tick aborts the download in some
  // browsers; a short delay lets the navigation actually start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
