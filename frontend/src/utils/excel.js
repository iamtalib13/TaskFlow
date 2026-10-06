
const HEADER_STYLE = {
  fill: { fgColor: { rgb: '468373' } },
  font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11, name: 'Calibri' },
  alignment: { vertical: 'center', horizontal: 'center', wrapText: false },
  border: {
    top: { style: 'thin', color: { rgb: '356558' } },
    bottom: { style: 'thin', color: { rgb: '356558' } },
    left: { style: 'thin', color: { rgb: '356558' } },
    right: { style: 'thin', color: { rgb: '356558' } },
  },
}

const SECTION_TITLE_STYLE = {
  fill: { fgColor: { rgb: '468373' } },
  font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12, name: 'Calibri' },
  alignment: { vertical: 'center', horizontal: 'left' },
  border: {
    top: { style: 'thin', color: { rgb: '356558' } },
    bottom: { style: 'thin', color: { rgb: '356558' } },
    left: { style: 'thin', color: { rgb: '356558' } },
    right: { style: 'thin', color: { rgb: '356558' } },
  },
}

const TOTAL_ROW_STYLE = {
  fill: { fgColor: { rgb: 'E8F2EF' } },
  font: { bold: true, color: { rgb: '1D4036' }, sz: 10, name: 'Calibri' },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '468373' } },
    bottom: { style: 'double', color: { rgb: '468373' } },
    left: { style: 'thin', color: { rgb: 'D0E2DC' } },
    right: { style: 'thin', color: { rgb: 'D0E2DC' } },
  },
}

const DATA_CELL_STYLE = {
  font: { sz: 10, name: 'Calibri', color: { rgb: '1A1A1A' } },
  alignment: { vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
}

const DATA_CELL_CENTER = {
  ...DATA_CELL_STYLE,
  alignment: { vertical: 'center', horizontal: 'center' },
}

/**
 * Superfast styled multi-sheet XLSX export using SheetJS Style.
 * Sets header color #468373 with white font, auto-filters, and standard row heights.
 *
 * @param {string} filename - e.g. "Task_Report_2026-09-29.xlsx"
 * @param {Array<Object>} sheets - array of { name, isDashboard?, headers?, rows?, aoa?, rowHeight?, headerHeight? }
 * @param {Object} [globalOptions]
 * @param {number} [globalOptions.rowHeight=22] - standard fixed data row height in pt
 * @param {number} [globalOptions.headerHeight=28] - standard fixed header row height in pt
 * @returns {boolean}
 */
export async function downloadWorkbook(filename, sheets = [], globalOptions = {}) {
  // Load the xlsx library only when an export is requested
  const { default: XLSX } = await import('xlsx-js-style')
  const wb = XLSX.utils.book_new()
  const defaultRowHeight = globalOptions.rowHeight || 22
  const defaultHeaderHeight = globalOptions.headerHeight || 28

  for (const sheet of sheets) {
    const isDashboard = sheet.isDashboard || sheet.name === 'Dashboard'
    const aoa = sheet.aoa || [sheet.headers || [], ...(sheet.rows || [])]
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    const totalRows = aoa.length
    const maxCols = aoa.reduce((m, r) => Math.max(m, (r || []).length), 0)

    // 1. Standard Row Heights
    const rowProps = new Array(totalRows)
    for (let r = 0; r < totalRows; r++) {
      if (isDashboard) {
        const firstCell = aoa[r]?.[0]
        if (firstCell === 'Team Status Summary' || firstCell === 'Count of status') {
          rowProps[r] = { hpt: 26 }
        } else if (firstCell === 'Team' || firstCell === 'Guided By') {
          rowProps[r] = { hpt: 26 }
        } else if (firstCell === 'Grand Total') {
          rowProps[r] = { hpt: 24 }
        } else if (!firstCell && (aoa[r] || []).length === 0) {
          rowProps[r] = { hpt: 14 }
        } else {
          rowProps[r] = { hpt: defaultRowHeight }
        }
      } else {
        rowProps[r] = { hpt: r === 0 ? defaultHeaderHeight : defaultRowHeight }
      }
    }
    ws['!rows'] = rowProps

    // 2. Styling (Header: #468373 + White font, Data cells, Grand Total)
    for (let r = 0; r < totalRows; r++) {
      const row = aoa[r] || []
      const firstCell = row[0]

      for (let c = 0; c < row.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c })
        if (!ws[cellRef]) continue

        if (isDashboard) {
          if (firstCell === 'Team Status Summary' || firstCell === 'Count of status') {
            ws[cellRef].s = SECTION_TITLE_STYLE
          } else if (firstCell === 'Team' || firstCell === 'Guided By') {
            ws[cellRef].s = HEADER_STYLE
          } else if (firstCell === 'Grand Total') {
            ws[cellRef].s = TOTAL_ROW_STYLE
          } else {
            ws[cellRef].s = c === 0 ? DATA_CELL_STYLE : DATA_CELL_CENTER
          }
        } else {
          // Team Sheet
          if (r === 0) {
            ws[cellRef].s = HEADER_STYLE
          } else {
            // Data cell: center numbers, dates, statuses, IDs
            const isCenterCol = c === 0 || c === 1 || c === 5 || c === 6 || c === 10 || c === 11 || c === 12 || c === 16 || c === 17 || c === 18 || c === 19 || c === 22
            ws[cellRef].s = isCenterCol ? DATA_CELL_CENTER : DATA_CELL_STYLE
          }
        }
      }
    }

    // 3. Auto-filter on Headers (all header columns get native Excel dropdown filters)
    if (!isDashboard && totalRows > 1 && maxCols > 0) {
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: totalRows - 1, c: maxCols - 1 },
        }),
      }
    }

    // 4. Auto Column Widths
    const sampleRows = Math.min(totalRows, 60)
    const colProps = new Array(maxCols)
    for (let c = 0; c < maxCols; c++) {
      let maxLen = 10
      for (let r = 0; r < sampleRows; r++) {
        const val = aoa[r]?.[c]
        if (val != null) {
          const l = String(val).length
          if (l > maxLen) maxLen = l
        }
      }
      colProps[c] = { wch: Math.min(Math.max(maxLen + 3, 10), 45) }
    }
    ws['!cols'] = colProps

    const sheetName = (sheet.name || 'Sheet').replace(/[\\/?*[\]:]/g, '_').trim().slice(0, 31) || 'Sheet'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  XLSX.writeFile(wb, filename)
  return true
}

/**
 * Superfast single-sheet XLSX export helper.
 */
export function downloadXlsx(filename, headers, rows, options = {}) {
  return downloadWorkbook(filename, [{
    name: options.sheetName || 'Tasks',
    headers,
    rows,
    rowHeight: options.rowHeight,
    headerHeight: options.headerHeight,
  }], options)
}
