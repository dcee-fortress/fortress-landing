"use client"

import { useEffect, useMemo, useRef } from "react"
import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"
import { findBoqItemForDescription, getAllBoqItemNames, searchBoqDescriptions } from "@/lib/boqData"
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
  boqOnly = false,
}) {
  const committedRef = useRef(value)
  const editingRef = useRef(false)

  useEffect(() => {
    if (!boqOnly || editingRef.current) return
    if (findBoqItemForDescription(projectId, value)) {
      committedRef.current = value
    }
  }, [boqOnly, projectId, value])

  const extraDescriptionsResolved = useMemo(() => {
    if (extraDescriptions) return extraDescriptions
    void refreshKey

    const fromBoq = getAllBoqItemNames(projectId)
    const fromSlot = getActivityDescriptionsForSlot(projectId, dayId, slotId)
    return [...fromBoq, ...fromSlot]
  }, [projectId, dayId, slotId, refreshKey, extraDescriptions])

  const acceptDescription = (next) => {
    if (!boqOnly) {
      onChange(next)
      return
    }

    const match = findBoqItemForDescription(projectId, next)
    editingRef.current = false
    if (!match) return
    committedRef.current = match.itemName
    onChange(match.itemName)
  }

  const search = (query) => {
    if (boqOnly) return searchBoqDescriptions(projectId, query)

    return searchDescriptionSuggestions(projectId, query, {
      extraDescriptions: extraDescriptionsResolved,
      limit: 200,
    })
      .filter((text) => text.trim().toLowerCase() !== String(query ?? "").trim().toLowerCase())
      .map((text) => ({ value: text }))
  }

  const suggestions = useEntrySuggestions(search, acceptDescription, {
    enterSelects: true,
    below: true,
    title: boqOnly ? "BOQ descriptions" : "Previous entries",
  })

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
          editingRef.current = true
          onChange(event.target.value)
          suggestions.update(event.target.value, event.currentTarget)
        }}
        onFocus={(event) => suggestions.update(event.currentTarget.value, event.currentTarget)}
        onBlur={(event) => {
          suggestions.close()
          if (!boqOnly || !editingRef.current) return
          editingRef.current = false
          const match = findBoqItemForDescription(projectId, event.currentTarget.value)
          if (match) {
            committedRef.current = match.itemName
            if (match.itemName !== event.currentTarget.value) onChange(match.itemName)
            return
          }
          const previous = findBoqItemForDescription(projectId, committedRef.current)
          onChange(previous ? previous.itemName : "")
        }}
        onKeyDown={(event) => {
          suggestions.handleKeyDown(event)
        }}
        placeholder={
          boqOnly
            ? "Type a BOQ number or letters, then choose the description"
            : "Type activity — BOQ matches suggested"
        }
        className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm leading-snug text-zinc-900 break-words whitespace-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        aria-autocomplete="list"
      />
      {suggestions.menu}
    </div>
  )
}
