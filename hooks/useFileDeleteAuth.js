"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Delete actions always ask for restricted-area login first, then run the
 * caller's confirm + delete logic after unlock.
 */
export function useFileDeleteAuth() {
  const [loginOpen, setLoginOpen] = useState(false)
  const pendingActionRef = useRef(null)

  const requestDeleteAuth = useCallback((action) => {
    if (typeof action !== "function") return
    pendingActionRef.current = action
    setLoginOpen(true)
  }, [])

  const handleUnlocked = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    setLoginOpen(false)
    action?.()
  }, [])

  const cancelLogin = useCallback(() => {
    pendingActionRef.current = null
    setLoginOpen(false)
  }, [])

  return {
    loginOpen,
    requestDeleteAuth,
    handleUnlocked,
    cancelLogin,
  }
}
