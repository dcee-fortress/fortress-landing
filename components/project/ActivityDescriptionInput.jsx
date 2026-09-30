"use client"

import { useMemo } from "react"
import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"
import { getAllBoqItemNames } from "@/lib/boqData"
import { searchDescriptionSuggestions } from "@/lib/boqDescriptionMemory"
import { getActivityDescriptionsForSlot } from "@/lib/materialSchedule"

export default function ActivityDescriptionInput({
  projectId,
  dayId,
  slotId,
  value,
  onChange,
  extraDescriptions = null,
  refreshKey = 0,
}) {
  const extraDescriptionsResolved = useMemo(() => {
    if (extraDescriptions) return extraDescriptions
    void refreshKey

    const fromBoq = getAllBoqItemNames(projectId)
    const fromSlot = getActivityDescriptionsForSlot(projectId, dayId, slotId)
    return [...fromBoq, ...fromSlot]
  }, [projectId, dayId, slotId, refreshKey, extraDescriptions])

  const search = (query) =>
    searchDescriptionSuggestions(projectId, query, {
      extraDescriptions: extraDescriptionsResolved,
      limit: 200,
    })
      .filter((text) => text.trim().toLowerCase() !== String(query ?? "").trim().toLowerCase())
      .map((text) => ({ value: text }))

  const suggestions = useEntrySuggestions(search, onChange, { enterSelects: true })

  return (
    <div className="relative min-w-[12rem] max-w-[20rem]">
      <textarea
        rows={2}
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        enterKeyHint="enter"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          suggestions.update(event.target.value, event.currentTarget)
        }}
        onFocus={(event) => suggestions.update(event.currentTarget.value, event.currentTarget)}
        onBlur={suggestions.close}
        onKeyDown={(event) => {
          suggestions.handleKeyDown(event)
        }}
        placeholder="Type activity — BOQ matches suggested"
        className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm leading-snug text-zinc-900 break-words whitespace-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        aria-autocomplete="list"
      />
      {suggestions.menu}
    </div>
  )
}
