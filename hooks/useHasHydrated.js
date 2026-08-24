import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/** True only after the client has hydrated — safe gate for localStorage-driven UI. */
export function useHasHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}
