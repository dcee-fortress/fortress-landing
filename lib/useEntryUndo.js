"use client"

import { useCallback, useRef, useState } from "react"

function cloneRows(rows) {
  const list = Array.isArray(rows) ? rows : []
  try {
    if (typeof structuredClone === "function") return structuredClone(list)
  } catch {
    // Fall through to JSON clone.
  }
  try {
    return JSON.parse(JSON.stringify(list))
  } catch {
    // Circular / oversized rows — shallow copy so undo still works for plain cells.
    return list.map((row) => (row && typeof row === "object" ? { ...row } : row))
  }
}

/**
 * Office-style undo for entry tables. Call `trackBeforeChange(currentRows)` before
 * applying an edit (optionally with a sessionKey so keystrokes in one cell share
 * one undo step), then `undo()` returns the previous rows to restore.
 */
export function useEntryUndo({ limit = 40 } = {}) {
  const stackRef = useRef([])
  const sessionRef = useRef(null)
  const [depth, setDepth] = useState(0)
  const depthTimerRef = useRef(0)

  const syncDepth = useCallback(() => {
    // Never call setState synchronously from inside another setState updater —
    // that nested update path can blow the call stack (Max call stack exceeded).
    if (typeof window === "undefined") {
      setDepth(stackRef.current.length)
      return
    }
    window.clearTimeout(depthTimerRef.current)
    depthTimerRef.current = window.setTimeout(() => {
      setDepth(stackRef.current.length)
    }, 0)
  }, [])

  const trackBeforeChange = useCallback(
    (currentRows, sessionKey = null) => {
      if (sessionKey != null) {
        if (sessionRef.current === sessionKey) return
        sessionRef.current = sessionKey
      } else {
        sessionRef.current = null
      }
      stackRef.current.push(cloneRows(currentRows))
      if (stackRef.current.length > limit) {
        stackRef.current = stackRef.current.slice(stackRef.current.length - limit)
      }
      syncDepth()
    },
    [limit, syncDepth]
  )

  const endEditSession = useCallback(() => {
    sessionRef.current = null
  }, [])

  const undo = useCallback(() => {
    if (stackRef.current.length === 0) return null
    const restored = stackRef.current.pop()
    sessionRef.current = null
    syncDepth()
    return restored
  }, [syncDepth])

  const clear = useCallback(() => {
    stackRef.current = []
    sessionRef.current = null
    if (typeof window !== "undefined") window.clearTimeout(depthTimerRef.current)
    setDepth(0)
  }, [])

  return {
    canUndo: depth > 0,
    trackBeforeChange,
    endEditSession,
    undo,
    clear,
  }
}
