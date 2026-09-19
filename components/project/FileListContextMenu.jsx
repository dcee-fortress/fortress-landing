"use client"

import { useEffect, useRef } from "react"
import Icon from "@/components/icon/icon"

export default function FileListContextMenu({
  open,
  x,
  y,
  selectedCount,
  onClose,
  onDelete,
  deleting = false,
}) {
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) return
      onClose()
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  const label =
    selectedCount > 1 ? `Delete ${selectedCount} files` : "Delete file"

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0
  const left = Math.min(x, Math.max(8, viewportWidth - 220))
  const top = Math.min(y, Math.max(8, viewportHeight - 80))

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[80] min-w-[11rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
      style={{ left, top }}
    >
      <button
        type="button"
        role="menuitem"
        disabled={deleting || selectedCount < 1}
        onClick={() => {
          onDelete()
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Icon name="trash-2" size={16} />
        {deleting ? "Deleting…" : label}
      </button>
    </div>
  )
}
