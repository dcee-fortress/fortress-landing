"use client"

import Icon from "@/components/icon/icon"

export default function ExportPdfButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={`no-print inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 ${className}`}
    >
      <Icon name="file-down" size={15} />
      Export PDF
    </button>
  )
}
