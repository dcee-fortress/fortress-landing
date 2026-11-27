"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"
import { findBoqItemForDescription, getAllBoqItemNames, searchBoqDescriptions } from "@/lib/boqData"
import { searchDescriptionSuggestions } from "@/lib/boqDescriptionMemory"
import { getActivityDescriptionsForSlot } from "@/lib/materialSchedule"

function normalizeMatch(match, fallbackText = "") {
  if (!match || typeof match !== "object") return null
  const itemName = String(match.itemName || match.value || fallbackText || "").trim()
  const boqId = String(match.boqId ?? "").trim()
  const boqItemId = String(match.boqItemId || match.id || "").trim()
  if (!itemName || (!boqId && !boqItemId)) return null
  // Plain fields only — never spread `match` (avoids circular graphs → stack overflow).
  return {
    itemName,
    value: itemName,
    boqId,
    boqItemId,
    id: boqItemId,
    itemNo: match.itemNo ?? "",
    unit: String(match.unit ?? "").trim(),
  }
}

function lookupBoq(projectId, text, source = null) {
  if (typeof findBoqItemForDescription !== "function") return null
  try {
    return findBoqItemForDescription(projectId, text, source)
  } catch {
    return null
  }
}

function resolveBoqMatch(projectId, text, selectedItem = null, sourceItem = null) {
  // Click/Tab often already carries boqId — use it without another lookup.
  const fromPayload = normalizeMatch(selectedItem, text)
  if (fromPayload) return fromPayload

  if (selectedItem?.boqId && (selectedItem.boqItemId || selectedItem.value || selectedItem.itemName)) {
    const selectedText = selectedItem.itemName || selectedItem.value || text
    const fromSelected = normalizeMatch(lookupBoq(projectId, selectedText, selectedItem), selectedText)
    if (fromSelected) return fromSelected
  }

  // Typed text must match an uploaded BOQ item exactly — no free-text, no fuzzy first-hit.
  return normalizeMatch(lookupBoq(projectId, text, sourceItem), text)
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
  const committedRef = useRef(value ?? "")
  const [draftValue, setDraftValue] = useState(value ?? "")
  const editingRef = useRef(false)

  useEffect(() => {
    if (editingRef.current) return
    const text = value ?? ""
    committedRef.current = text
    setDraftValue(text)
  }, [value])

  const extraDescriptionsResolved = useMemo(() => {
    if (extraDescriptions) return extraDescriptions
    void refreshKey

    const fromBoq = getAllBoqItemNames(projectId)
    const fromSlot = getActivityDescriptionsForSlot(projectId, dayId, slotId)
    return [...fromBoq, ...fromSlot]
  }, [projectId, dayId, slotId, refreshKey, extraDescriptions])

  const acceptDescription = (next, selectedItem = null) => {
    if (!boqOnly) {
      editingRef.current = false
      setDraftValue(next)
      committedRef.current = next
      onChange(next)
      return true
    }

    const match = resolveBoqMatch(projectId, next, selectedItem, sourceItem)
    if (!match) {
      // Valuations entry accepts only uploaded BOQ descriptions.
      editingRef.current = false
      setDraftValue(committedRef.current || "")
      return false
    }

    editingRef.current = false
    committedRef.current = match.itemName
    setDraftValue(match.itemName)
    onChange(match.itemName, match)
    return true
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

  const fillFromTab = () => {
    const query = draftValue
    let matches = boqOnly ? searchBoqDescriptions(projectId, query) : search(query)
    if (!matches.length && boqOnly) {
      matches = searchBoqDescriptions(projectId, "")
    }
    if (!matches.length) return false
    return acceptDescription(matches[0].value, matches[0])
  }

  return (
    <div className="relative w-full min-w-[12rem] max-w-[22rem]">
      <textarea
        rows={3}
        wrap="soft"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        enterKeyHint="enter"
        value={draftValue}
        onChange={(event) => {
          const next = event.target.value
          editingRef.current = true
          setDraftValue(next)
          if (!boqOnly) onChange(next)
          suggestions.update(next, event.currentTarget)
        }}
        onFocus={(event) => suggestions.update(event.currentTarget.value, event.currentTarget)}
        onBlur={() => {
          suggestions.close()
          if (!boqOnly) {
            editingRef.current = false
            return
          }
          if (!editingRef.current) return
          const text = draftValue
          if (!String(text ?? "").trim()) {
            editingRef.current = false
            setDraftValue(committedRef.current || "")
            return
          }
          acceptDescription(text, null)
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey) {
            if (suggestions.isOpen) {
              suggestions.handleKeyDown(event)
              return
            }
            if (fillFromTab()) {
              event.preventDefault()
              suggestions.close()
              return
            }
          }
          suggestions.handleKeyDown(event)
        }}
        placeholder={
          boqOnly
            ? "Choose a BOQ description (Tab or pick from list)"
            : "Type activity — BOQ matches suggested"
        }
        className="box-border block w-full min-h-[4.5rem] resize-y overflow-x-hidden whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm leading-snug text-zinc-900 outline-none [overflow-wrap:anywhere] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        aria-autocomplete="list"
      />
      {suggestions.menu}
    </div>
  )
}
