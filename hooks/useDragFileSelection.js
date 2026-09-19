"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Drag / click multi-select for daily file lists, plus right-click context menu state.
 * @param {string[]} visibleFileIds
 * @param {{ enabled?: boolean, onBlocked?: () => void }} [options]
 * When enabled is false, selection / context menu are blocked and onBlocked is called instead.
 */
export function useDragFileSelection(visibleFileIds, options = {}) {
  const enabled = options.enabled !== false
  const onBlocked = options.onBlocked
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const DRAG_THRESHOLD_PX = 6
  const dragRef = useRef({
    active: false,
    anchorId: null,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  })
  const suppressClickRef = useRef(false)
  const idsRef = useRef(visibleFileIds)
  idsRef.current = visibleFileIds
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const onBlockedRef = useRef(onBlocked)
  onBlockedRef.current = onBlocked

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setContextMenu(null)
  }, [])

  useEffect(() => {
    if (enabled) return
    setSelectedIds(new Set())
    setContextMenu(null)
    dragRef.current.active = false
  }, [enabled])

  const selectOnly = useCallback((id) => {
    setSelectedIds(new Set([id]))
  }, [])

  const toggleId = useCallback((id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectRange = useCallback((fromId, toId) => {
    const ids = idsRef.current
    const fromIndex = ids.indexOf(fromId)
    const toIndex = ids.indexOf(toId)
    if (fromIndex < 0 || toIndex < 0) {
      setSelectedIds(new Set([toId]))
      return
    }
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    setSelectedIds(new Set(ids.slice(start, end + 1)))
  }, [])

  useEffect(() => {
    const valid = new Set(visibleFileIds)
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => valid.has(id)))
      return next.size === current.size ? current : next
    })
  }, [visibleFileIds])

  useEffect(() => {
    function endDrag() {
      const drag = dragRef.current
      if (!drag.active) return
      if (drag.moved) {
        suppressClickRef.current = true
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 0)
      }
      drag.active = false
      drag.anchorId = null
      drag.moved = false
      drag.pointerId = null
      drag.startX = 0
      drag.startY = 0
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setContextMenu(null)
        clearSelection()
      }
    }

    window.addEventListener("mouseup", endDrag)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("mouseup", endDrag)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [clearSelection])

  const onRowMouseDown = useCallback((event, fileId) => {
    if (event.button !== 0) return
    // Allow native interactions on buttons / links with modifiers handled separately.
    if (event.target?.closest?.("button")) return

    if (!enabledRef.current) {
      onBlockedRef.current?.()
      return
    }

    dragRef.current = {
      active: true,
      anchorId: fileId,
      moved: false,
      pointerId: event.pointerId ?? null,
      startX: event.clientX ?? 0,
      startY: event.clientY ?? 0,
    }

    if (event.shiftKey) {
      event.preventDefault()
      const anchor =
        [...selectedIds][selectedIds.size - 1] || dragRef.current.anchorId || fileId
      selectRange(anchor, fileId)
      dragRef.current.moved = true
      return
    }

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      toggleId(fileId)
      dragRef.current.moved = true
      return
    }
  }, [selectRange, selectedIds, toggleId])

  const pastDragThreshold = useCallback((event, drag) => {
    const dx = Math.abs((event.clientX ?? 0) - drag.startX)
    const dy = Math.abs((event.clientY ?? 0) - drag.startY)
    return dx >= DRAG_THRESHOLD_PX || dy >= DRAG_THRESHOLD_PX
  }, [])

  const onRowMouseEnter = useCallback(
    (event, fileId) => {
      if (!enabledRef.current) return
      const drag = dragRef.current
      if (!drag.active || !drag.anchorId) return
      if (event.buttons !== 1 && event.buttons !== 3) return
      if (!drag.moved && !pastDragThreshold(event, drag)) return
      drag.moved = true
      selectRange(drag.anchorId, fileId)
    },
    [pastDragThreshold, selectRange]
  )

  const onRowMouseMove = useCallback(
    (event, fileId) => {
      if (!enabledRef.current) return
      const drag = dragRef.current
      if (!drag.active || !drag.anchorId) return
      if (event.buttons !== 1) return
      if (drag.moved) return
      // Ignore tiny pointer jitter so a normal click still opens the file.
      if (!pastDragThreshold(event, drag)) return
      drag.moved = true
      selectOnly(fileId)
    },
    [pastDragThreshold, selectOnly]
  )

  const shouldSuppressNavigation = useCallback(() => {
    if (suppressClickRef.current) return true
    if (dragRef.current.moved) return true
    return false
  }, [])

  const onRowClickCapture = useCallback(
    (event) => {
      if (!shouldSuppressNavigation()) return
      event.preventDefault()
      event.stopPropagation()
    },
    [shouldSuppressNavigation]
  )

  const onRowContextMenu = useCallback(
    (event, fileId) => {
      event.preventDefault()
      event.stopPropagation()
      if (!enabledRef.current) {
        onBlockedRef.current?.()
        return
      }
      setSelectedIds((current) => {
        if (current.has(fileId) && current.size > 0) return current
        return new Set([fileId])
      })
      setContextMenu({ x: event.clientX, y: event.clientY, fileId })
    },
    []
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return {
    selectedIds,
    contextMenu,
    clearSelection,
    selectOnly,
    closeContextMenu,
    onRowMouseDown,
    onRowMouseEnter,
    onRowMouseMove,
    onRowClickCapture,
    onRowContextMenu,
    selectedCount: selectedIds.size,
  }
}
