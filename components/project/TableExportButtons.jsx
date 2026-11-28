"use client"

import { useState } from "react"
import Icon from "@/components/icon/icon"
import ExportPdfButton from "@/components/project/ExportPdfButton"
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

  async function runExcel() {
    if (busy) return
    setBusy("excel")
    try {
      await exportTableExcel(payload)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not export this table.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExportPdfButton
        disabled={Boolean(busy)}
        onClick={async () => {
          setBusy("pdf")
          try {
            await exportTablePdf({ ...payload, mode: "download" })
          } finally {
            setBusy("")
          }
        }}
        onShareWhatsApp={async () => {
          setBusy("whatsapp")
          try {
            await exportTablePdf({ ...payload, mode: "whatsapp" })
          } finally {
            setBusy("")
          }
        }}
      />
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void runExcel()
        }}
        className={buttonClass}
      >
        <Icon name="file-spreadsheet" size={15} />
        Export to Excel
      </button>
    </div>
  )
}
