"use client"

import { SuggestionCard } from "@/components/project/EntrySuggestionMenu"

export default function FormulaSuggestionMenu({
  suggestions,
  activeIndex,
  onHover,
  onSelect,
  onDismiss,
  rect = null,
  below = false,
}) {
  if (!suggestions?.length) return null

  return (
    <SuggestionCard
      rect={rect}
      below={below}
      title="Saved formulas"
      items={suggestions.map((item) => ({
        key: item.formula,
        value: item.formula,
        mono: true,
        hint: [item.description, item.columnLabel].filter(Boolean).join(" · "),
      }))}
      activeIndex={activeIndex}
      onHover={onHover}
      onSelect={onSelect}
      onDismiss={onDismiss}
      footer="Click a formula or press Tab to use the highlighted one. Esc or X closes."
    />
  )
}
