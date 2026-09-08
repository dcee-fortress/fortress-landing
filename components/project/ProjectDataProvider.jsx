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

export function ProjectDataProvider({ children }) {
  const pathname = usePathname()
  const projectId = extractProjectId(pathname)
  const [version, setVersion] = useState(0)
  const bootstrappedProjectsRef = useRef(new Set())

  const refresh = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!projectId) return

    const runBootstrap = async () => {
      const [{ initializeGrovePersistence }, { ensureDailyFilesThroughToday }, { getTodayDayId }] =
        await Promise.all([
          import("@/lib/grovePersistence"),
          import("@/lib/dailyFileSync"),
          import("@/lib/dailyFiles"),
        ])
      const { ensureProgressReportsExist } = await import("@/lib/progressReports")
      const dayKey = `${projectId}:${getTodayDayId()}`
      const alreadyBootstrapped = bootstrappedProjectsRef.current.has(dayKey)

      if (!alreadyBootstrapped) {
        initializeGrovePersistence({ projectId })
        bootstrappedProjectsRef.current.add(dayKey)
      }

      const filesChanged = ensureDailyFilesThroughToday(projectId)
      ensureProgressReportsExist(projectId)
      const { ensureHourlyDashboardsForProject } = await import("@/lib/projectData")
      const slotsChanged = ensureHourlyDashboardsForProject(projectId)

      if (!alreadyBootstrapped || filesChanged || slotsChanged) {
        startTransition(() => {
          refresh()
        })
      }
    }

    void runBootstrap()
  }, [projectId, refresh])

  useEffect(() => {
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
          const changed = projectId
            ? ensureDailyFilesThroughToday(projectId)
            : ensureAllActiveProjectsDailyFiles()
          if (changed) {
            startTransition(() => {
              refresh()
            })
          }
        }
      )
    }

    const onSharedStorageChange = () => {
      syncCalendarFiles()
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

    window.addEventListener("grove-shared-storage-change", onSharedStorageChange)
    window.addEventListener("focus", refreshIfFilesChanged)
    document.addEventListener("visibilitychange", refreshIfFilesChanged)

    return () => {
      window.clearTimeout(midnightId)
      window.removeEventListener("grove-shared-storage-change", onSharedStorageChange)
      window.removeEventListener("focus", refreshIfFilesChanged)
      document.removeEventListener("visibilitychange", refreshIfFilesChanged)
    }
  }, [projectId, refresh])

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