"use client"

import { useEffect, useRef, useState } from "react"
import Icon from "@/components/icon/icon"

/**
 * Export PDF control with an inner Share to WhatsApp action.
 * onClick() downloads. onShareWhatsApp() shares when provided; otherwise WhatsApp opens after download.
 */
export default function ExportPdfButton({
  onClick,
  onShareWhatsApp,
  className = "",
  disabled = false,
  label = "Export PDF",
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const run = async (mode) => {
    if (busy || disabled) return
    setBusy(true)
    setOpen(false)
    try {
      if (mode === "whatsapp") {
        if (typeof onShareWhatsApp === "function") {
          await onShareWhatsApp()
        } else if (typeof onClick === "function") {
          await onClick()
          window.open(
            `https://wa.me/?text=${encodeURIComponent(
              "Rodcroft PDF exported. Attach the downloaded file in WhatsApp."
            )}`,
            "_blank",
            "noopener,noreferrer"
          )
        }
      } else if (typeof onClick === "function") {
        await onClick()
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not export the PDF.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className={`no-print relative inline-flex ${className}`}>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void run("download")
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-l-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Icon name="file-down" size={15} />
        {busy ? "Working…" : label}
      </button>
      <button
        type="button"
        disabled={busy || disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title="More export options"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex items-center rounded-r-lg border border-l-0 border-zinc-300 bg-white px-2 py-2 text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Icon name="chevron-down" size={14} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={(event) => {
              event.preventDefault()
              void run("download")
            }}
          >
            <Icon name="file-down" size={15} />
            Download {label === "Export report" ? "report" : "PDF"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={(event) => {
              event.preventDefault()
              void run("whatsapp")
            }}
          >
            <Icon name="share-2" size={15} />
            Share to WhatsApp
          </button>
        </div>
      ) : null}
    </div>
  )
}
