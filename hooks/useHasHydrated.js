import { useEffect, useState } from "react"

/** True only after the client has hydrated — safe gate for localStorage-driven UI. */
export function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    setHasHydrated(true)
  }, [])

  return hasHydrated
}
