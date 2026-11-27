/** Builds a CSV that Excel in Spanish opens correctly (semicolon separator, UTF-8 BOM) and downloads it. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    const text = value === null ? '' : String(value)
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const body = [header, ...rows].map((r) => r.map(escape).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
