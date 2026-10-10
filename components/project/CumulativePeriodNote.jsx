"use client"

import { useHasHydrated } from "@/hooks/useHasHydrated"
import { formatCumulativePeriod } from "@/lib/cumulativePeriod"

export default function CumulativePeriodNote({ projectId }) {
  const hasHydrated = useHasHydrated()
  if (!projectId || !hasHydrated) return null

  return (
    <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
      {formatCumulativePeriod(projectId)}. These figures add every daily entry from the project
      start through today, and the end date moves forward each new day.
    </p>
  )
}
