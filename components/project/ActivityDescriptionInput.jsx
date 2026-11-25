"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  sourceItem = null,
  extraDescriptions = null,
  refreshKey = 0,
  boqOnly = false,
}) {
  const committedRef = useRef(value)
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(value ?? "")

  useEffect(() => {
    if (isEditing) return
    const text = value ?? ""
    if (!boqOnly) return
    const match = findBoqItemForDescription(projectId, text, sourceItem)
    if (match) committedRef.current = match.itemName
  }, [boqOnly, isEditing, projectId, sourceItem, value])

  const extraDescriptionsResolved = useMemo(() => {
    if (extraDescriptions) return extraDescriptions
    void refreshKey

    const fromBoq = getAllBoqItemNames(projectId)
    const fromSlot = getActivityDescriptionsForSlot(projectId, dayId, slotId)
    return [...fromBoq, ...fromSlot]
  }, [projectId, dayId, slotId, refreshKey, extraDescriptions])

  const acceptDescription = (next, selectedItem = null) => {
    if (!boqOnly) {
      setDraftValue(next)
      onChange(next)
      return
    }

    const match = findBoqItemForDescription(projectId, next, selectedItem)
    setIsEditing(false)
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
        value={isEditing ? draftValue : value ?? ""}
        onChange={(event) => {
          const next = event.target.value
          setDraftValue(next)
          if (boqOnly) {
            setIsEditing(true)
          } else {
            onChange(next)
          }
          suggestions.update(next, event.currentTarget)
        }}
        onFocus={(event) => suggestions.update(event.currentTarget.value, event.currentTarget)}
        onBlur={(event) => {
          suggestions.close()
          if (!boqOnly || !isEditing) return
          setIsEditing(false)
          const match = findBoqItemForDescription(projectId, event.currentTarget.value, sourceItem)
          if (match) {
            committedRef.current = match.itemName
            onChange(match.itemName)
            return
          }
          const previous = findBoqItemForDescription(projectId, committedRef.current)
          const restored = previous ? previous.itemName : ""
          committedRef.current = restored
          setDraftValue(restored)
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
