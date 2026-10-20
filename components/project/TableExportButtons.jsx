"use client"

import { useState } from "react"
import Icon from "@/components/icon/icon"
import { exportTableExcel, exportTablePdf } from "@/lib/tableExport"

const buttonClass =
  "no-print inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"

export default function TableExportButtons({
  columns,
  rows,
  title,
  projectName,
  filename,
  showTotal = true,
}) {
  const [busy, setBusy] = useState("")
  const payload = { columns, rows, title, projectName, filename, showTotal }

  async function run(kind) {
    if (busy) return
    setBusy(kind)
    try {
      if (kind === "pdf") await exportTablePdf(payload)
      else await exportTableExcel(payload)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not export this table.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void run("pdf")
        }}
        className={buttonClass}
      >
        <Icon name="file-down" size={15} />
        Export PDF
      </button>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void run("excel")
        }}
        className={buttonClass}
      >
        <Icon name="file-spreadsheet" size={15} />
        Export to Excel
      </button>
    </div>
  )
}
