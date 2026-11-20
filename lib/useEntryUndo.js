"use client"

import { useCallback, useRef, useState } from "react"

function cloneRows(rows) {
  return JSON.parse(JSON.stringify(rows ?? []))
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
      setDepth(stackRef.current.length)
    },
    [limit]
  )

  const endEditSession = useCallback(() => {
    sessionRef.current = null
  }, [])

  const undo = useCallback(() => {
    if (stackRef.current.length === 0) return null
    const restored = stackRef.current.pop()
    sessionRef.current = null
    setDepth(stackRef.current.length)
    return restored
  }, [])

  const clear = useCallback(() => {
    stackRef.current = []
    sessionRef.current = null
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
