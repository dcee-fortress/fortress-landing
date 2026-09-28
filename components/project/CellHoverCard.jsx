"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"

export default function CellHoverCard({ card, onClose }) {
  useEffect(() => {
    if (!card) return undefined
    window.addEventListener("scroll", onClose, true)
    window.addEventListener("resize", onClose)
    return () => {
      window.removeEventListener("scroll", onClose, true)
      window.removeEventListener("resize", onClose)
    }
  }, [card, onClose])

  if (!card || typeof document === "undefined") return null

  const { rect, description, columnLabel } = card
  const showBelow = rect.top < 72
  const left = Math.min(Math.max(rect.left + rect.width / 2, 140), window.innerWidth - 140)

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[60] max-w-[16rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{
        left,
        top: showBelow ? rect.bottom + 8 : rect.top - 8,
        transform: showBelow ? "translateX(-50%)" : "translate(-50%, -100%)",
      }}
    >
      <span className={`font-semibold ${description ? "text-zinc-900" : "italic text-zinc-400"}`}>
        {description || "No description yet"}
      </span>{" "}
      <span className="text-zinc-500">({columnLabel})</span>
    </div>,
    document.body
  )
}
