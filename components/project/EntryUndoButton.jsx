"use client"

import { useEffect } from "react"
import Icon from "@/components/icon/icon"

export default function EntryUndoButton({ canUndo, onUndo, className = "" }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      const key = String(event.key || "").toLowerCase()
      const isUndo = (event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey
      if (!isUndo || !canUndo) return
      const target = event.target
      const tag = String(target?.tagName || "").toLowerCase()
      // Still allow Ctrl+Z while typing in entry cells — it undoes the last table change.
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        // Prefer table undo over native text undo for entry workflows.
      }
      event.preventDefault()
      onUndo?.()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [canUndo, onUndo])

  return (
    <button
      type="button"
      onClick={() => onUndo?.()}
      disabled={!canUndo}
      title="Undo last change (Ctrl+Z)"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 ${className}`.trim()}
    >
      <Icon name="undo" size={15} />
      Undo
    </button>
  )
}
