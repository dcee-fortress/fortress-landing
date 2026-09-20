"use client"

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { usePathname } from "next/navigation"

import {
  getDaySummary,
  getDaySummaryFromSlots,
  getDayValueEarnedByIds,
  getMonthSummary,
  getMonthValueEarnedByIds,
  getProjectSummary,
  getSlotsForDay,
  getWeekSummary,
  getWeekValueEarnedByIds,
  saveSlotsForDay as persistSlotsForDay,
} from "@/lib/projectData"

import { ensurePeriodFilesForDay } from "@/lib/periodFiles"

import { isSeededProject } from "@/lib/projectList"

const ProjectDataContext = createContext(null)

function extractProjectId(pathname) {
  const match = pathname.match(/^\/project\/([^/]+)/)
  return match?.[1] ?? null
}

/** Hub shells that only show buttons — skip calendar/slot bootstrap so they open instantly. */
function isLightweightDashboardPath(pathname) {
  if (!pathname) return false
  const match = pathname.match(/\/dashboard\/([^/?#]+)/)
  if (!match) return false
  const rest = pathname.slice(pathname.indexOf("/dashboard/") + "/dashboard/".length)
  const parts = rest.split("/").filter(Boolean)

  const root = parts[0]
  if (root === "qs-engineering" || root === "finance") return parts.length === 1
  if (root === "safety-health") {
    if (parts.length === 1) return true
    // PPE hubs + PPE received/issued shells are list/table UIs.
    if (
      parts[1] === "ppe" ||
      parts[1] === "ppe-registers" ||
      parts[1] === "ppe-received" ||
      parts[1] === "ppe-issued" ||
      parts[1] === "safety-reports"
    ) {
      return true
    }
    return false
  }
  if (root === "goods-received" || root === "petty-cash") return true
  return false
}

export function ProjectDataProvider({ children }) {
  const pathname = usePathname()
  const projectId = extractProjectId(pathname)
  const lightweight = isLightweightDashboardPath(pathname)
  const [version, setVersion] = useState(0)
  const bootstrappedProjectsRef = useRef(new Set())

  const refresh = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!projectId || lightweight) return

    const runBootstrap = async () => {
      const [{ initializeGrovePersistence }, { ensureDailyFilesThroughToday }, { getTodayDayId }, { getSharedPersistenceReady }] =
        await Promise.all([
          import("@/lib/grovePersistence"),
          import("@/lib/dailyFileSync"),
          import("@/lib/dailyFiles"),
          import("@/lib/sharedPersistence"),
        ])
      // Bootstrap from cache immediately — do not wait on Postgres.
      const { ensureProgressReportsExist } = await import("@/lib/progressReports")
      const { ensureHourlyDashboardsForProject } = await import("@/lib/projectData")
      const { runSystemStorageWrite } = await import("@/lib/sharedPersistence")
      const dayKey = `${projectId}:${getTodayDayId()}`
      const alreadyBootstrapped = bootstrappedProjectsRef.current.has(dayKey)

      const { filesChanged, slotsChanged } = runSystemStorageWrite(() => {
        if (!alreadyBootstrapped) {
          initializeGrovePersistence({ projectId })
          bootstrappedProjectsRef.current.add(dayKey)
        }

        const nextFilesChanged = ensureDailyFilesThroughToday(projectId)
        ensureProgressReportsExist(projectId)
        const nextSlotsChanged = ensureHourlyDashboardsForProject(projectId)
        return { filesChanged: nextFilesChanged, slotsChanged: nextSlotsChanged }
      })

      if (!alreadyBootstrapped || filesChanged || slotsChanged) {
        startTransition(() => {
          refresh()
        })
      }

      void getSharedPersistenceReady()
        .then(() => {
          // After Postgres/cache hydrate, ensure today's valuation day exists and
          // is sorted to the top — sync can otherwise leave the calendar stale.
          runSystemStorageWrite(() => ensureDailyFilesThroughToday(projectId))
          startTransition(() => refresh())
        })
        .catch(() => {})
    }

    void runBootstrap()
  }, [lightweight, projectId, refresh])

  useEffect(() => {
    if (lightweight) return

    const syncCalendarFiles = () => {
      void import("@/lib/dailyFileSync").then(
        ({ ensureAllActiveProjectsDailyFiles, ensureDailyFilesThroughToday }) => {
          return projectId
            ? ensureDailyFilesThroughToday(projectId)
            : ensureAllActiveProjectsDailyFiles()
        }
      )
    }

    const refreshIfFilesChanged = () => {
      void import("@/lib/dailyFileSync").then(
        ({ ensureAllActiveProjectsDailyFiles, ensureDailyFilesThroughToday }) => {
          return import("@/lib/sharedPersistence").then(({ runSystemStorageWrite }) => {
            const changed = runSystemStorageWrite(() =>
              projectId
                ? ensureDailyFilesThroughToday(projectId)
                : ensureAllActiveProjectsDailyFiles()
            )
            if (changed) {
              startTransition(() => {
                refresh()
              })
            }
          })
        }
      )
    }

    const onSharedStorageChange = () => {
      startTransition(() => {
        refresh()
      })
    }

    const msUntilMidnight = () => {
      const now = new Date()
      return (
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 500
      )
    }

    let midnightId = window.setTimeout(function onNewDay() {
      refreshIfFilesChanged()
      startTransition(() => {
        refresh()
      })
      midnightId = window.setTimeout(onNewDay, msUntilMidnight())
    }, msUntilMidnight())

    const onStorage = (event) => {
      if (!event.key || !String(event.key).startsWith("grove-")) return
      startTransition(() => {
        refresh()
      })
    }

    window.addEventListener("grove-shared-storage-change", onSharedStorageChange)
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", refreshIfFilesChanged)
    document.addEventListener("visibilitychange", refreshIfFilesChanged)

    return () => {
      window.clearTimeout(midnightId)
      window.removeEventListener("grove-shared-storage-change", onSharedStorageChange)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", refreshIfFilesChanged)
      document.removeEventListener("visibilitychange", refreshIfFilesChanged)
    }
  }, [lightweight, projectId, refresh])

  const getSlotsForDayFn = useCallback(
    (dayId) => {
      if (!projectId) return []
      return getSlotsForDay(projectId, dayId)
    },
    [projectId]
  )

  const saveSlotsForDayFn = useCallback(
    (dayId, slots) => {
      if (!projectId) return
      persistSlotsForDay(projectId, dayId, slots)
      ensurePeriodFilesForDay(projectId, dayId)
      refresh()
    },
    [projectId, refresh]
  )

  const getDaySummaryFn = useCallback(
    (dayId) => {
      if (!projectId) return { rows: [], totals: {} }
      return getDaySummary(projectId, dayId)
    },
    [projectId]
  )

  const getDaySummaryFromSlotsFn = useCallback(
    (dayId, slots) => {
      if (!projectId) return { rows: [], totals: {} }
      return getDaySummaryFromSlots(projectId, dayId, slots)
    },
    [projectId]
  )

  const getDayValueEarnedByIdsFn = useCallback(
    (dayIds) => {
      if (!projectId) return {}
      return getDayValueEarnedByIds(projectId, dayIds)
    },
    [projectId]
  )

  const getWeekSummaryFn = useCallback(
    (weekId) => {
      if (!projectId) return { rows: [], totals: {} }
      return getWeekSummary(projectId, weekId)
    },
    [projectId]
  )

  const getWeekValueEarnedByIdsFn = useCallback(
    (weekIds) => {
      if (!projectId) return {}
      return getWeekValueEarnedByIds(projectId, weekIds)
    },
    [projectId]
  )

  const getMonthValueEarnedByIdsFn = useCallback(
    (monthIds) => {
      if (!projectId) return {}
      return getMonthValueEarnedByIds(projectId, monthIds)
    },
    [projectId]
  )

  const getMonthSummaryFn = useCallback(
    (monthId) => {
      if (!projectId) return { rows: [], totals: {} }
      return getMonthSummary(projectId, monthId)
    },
    [projectId]
  )

  const getProjectSummaryFn = useCallback(() => {
    if (!projectId) return { rows: [], totals: {} }
    return getProjectSummary(projectId)
  }, [projectId])

  const value = useMemo(() => {
    const scoped = (fn) => (...args) => {
      if (!projectId) {
        throw new Error("Project context is required for this action")
      }

      return fn(projectId, ...args)
    }

    return {
      projectId,
      isSeeded: projectId ? isSeededProject(projectId) : false,
      version,
      refresh,
      getSlotsForDay: getSlotsForDayFn,
      saveSlotsForDay: saveSlotsForDayFn,
      getDaySummary: getDaySummaryFn,
      getDaySummaryFromSlots: getDaySummaryFromSlotsFn,
      getDayValueEarnedByIds: getDayValueEarnedByIdsFn,
      getWeekSummary: getWeekSummaryFn,
      getWeekValueEarnedByIds: getWeekValueEarnedByIdsFn,
      getMonthSummary: getMonthSummaryFn,
      getMonthValueEarnedByIds: getMonthValueEarnedByIdsFn,
      getProjectSummary: getProjectSummaryFn,
      scoped,
    }
  }, [
    projectId,
    version,
    refresh,
    getSlotsForDayFn,
    saveSlotsForDayFn,
    getDaySummaryFn,
    getDaySummaryFromSlotsFn,
    getDayValueEarnedByIdsFn,
    getWeekSummaryFn,
    getWeekValueEarnedByIdsFn,
    getMonthSummaryFn,
    getMonthValueEarnedByIdsFn,
    getProjectSummaryFn,
  ])

  return <ProjectDataContext.Provider value={value}>{children}</ProjectDataContext.Provider>
}

export function useProjectData() {
  const context = useContext(ProjectDataContext)

  if (!context) {
    throw new Error("useProjectData must be used within ProjectDataProvider")
  }

  return context
}

export function useOptionalProjectData() {
  return useContext(ProjectDataContext)
}