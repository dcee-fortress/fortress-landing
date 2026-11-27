"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"
import { findBoqItemForDescription, getAllBoqItemNames, searchBoqDescriptions } from "@/lib/boqData"
import { searchDescriptionSuggestions } from "@/lib/boqDescriptionMemory"
import { getActivityDescriptionsForSlot } from "@/lib/materialSchedule"

function resolveBoqMatch(projectId, text, selectedItem = null, sourceItem = null) {
  const exact = findBoqItemForDescription(projectId, text, selectedItem ?? sourceItem)
  if (exact) return exact

  const fromSelected = selectedItem?.value || selectedItem?.itemName
  if (fromSelected) {
    const selectedMatch = findBoqItemForDescription(projectId, fromSelected, selectedItem)
    if (selectedMatch) return selectedMatch
  }

  const suggestions = searchBoqDescriptions(projectId, text || "", 1)
  if (!suggestions[0]) return null
  return findBoqItemForDescription(projectId, suggestions[0].value, suggestions[0])
}

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
    committedRef.current = text
    setDraftValue(text)
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
      setIsEditing(false)
      onChange(next)
      return
    }

    const match = resolveBoqMatch(projectId, next, selectedItem, sourceItem)
    setIsEditing(false)
    if (!match) {
      // Keep what the user typed in the field; do not flash an error or wipe it.
      setDraftValue(next ?? "")
      return
    }
    committedRef.current = match.itemName
    setDraftValue(match.itemName)
    onChange(match.itemName, match)
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

  const commitFromDraft = (text) => {
    if (!boqOnly) {
      setIsEditing(false)
      onChange(text)
      return true
    }
    const match = resolveBoqMatch(projectId, text, null, sourceItem)
    setIsEditing(false)
    if (!match) {
      setDraftValue(text ?? "")
      return false
    }
    committedRef.current = match.itemName
    setDraftValue(match.itemName)
    onChange(match.itemName, match)
    return true
  }

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
          const text = event.currentTarget.value
          if (!commitFromDraft(text) && !String(text ?? "").trim()) {
            const restored = committedRef.current || ""
            setDraftValue(restored)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey) {
            if (suggestions.isOpen) {
              suggestions.handleKeyDown(event)
              return
            }
            const query = isEditing ? draftValue : value ?? ""
            const matches = boqOnly
              ? searchBoqDescriptions(projectId, query)
              : search(query)
            if (matches.length > 0) {
              event.preventDefault()
              acceptDescription(matches[0].value, matches[0])
              suggestions.close()
              return
            }
          }
          suggestions.handleKeyDown(event)
        }}
        placeholder={
          boqOnly
            ? "Type a BOQ number or letters, then press Tab"
            : "Type activity — BOQ matches suggested"
        }
        className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm leading-snug text-zinc-900 break-words whitespace-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        aria-autocomplete="list"
      />
      {suggestions.menu}
    </div>
  )
}
