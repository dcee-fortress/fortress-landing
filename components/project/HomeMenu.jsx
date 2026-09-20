"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { isDeletedProjectId } from "@/lib/projectRegistry"
import {
  PROJECT_HOME_HUBS,
  getDashboardHref,
  getSheqIncidentDailyFileHref,
  getSheqSiteInspectionFileHref,
} from "@/lib/projectRoutes"
import {
  SHEQ_ALERT_KIND_INCIDENT,
  SHEQ_ALERT_KIND_INSPECTION,
  SHEQ_HOME_BANNER_STAGGER_MS,
  SHEQ_HOME_BANNER_VISIBLE_MS,
  dismissSheqHomeAlert,
  getSheqHomeAlerts,
} from "@/lib/sheqHomeAlerts"

const TOAST_WIDTH = "w-[min(100%-2rem,13.5rem)]"

function SheqToast({
  tone,
  title,
  message,
  extraCount,
  onOpen,
  onDismiss,
  canOpen,
}) {
  const isIncident = tone === "red"
  return (
    <div
      role="status"
      className={`${TOAST_WIDTH} rounded-md border p-2 shadow-sm backdrop-blur-sm ${
        isIncident
          ? "border-red-300/70 bg-red-50/95 shadow-red-500/10"
          : "border-amber-300/60 bg-amber-50/95 shadow-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <Icon
          name="triangle-alert"
          size={13}
          className={`mt-0.5 shrink-0 ${isIncident ? "text-red-600" : "text-amber-600"}`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={`text-[11px] font-semibold leading-tight ${
              isIncident ? "text-red-950" : "text-amber-950"
            }`}
          >
            {title}
            {extraCount > 0 ? ` (+${extraCount})` : ""}
          </p>
          <p
            className={`line-clamp-2 text-[10px] leading-snug ${
              isIncident ? "text-red-900/90" : "text-amber-900/90"
            }`}
          >
            {message}
          </p>
          <div className="flex items-center gap-1 pt-0.5">
            {canOpen ? (
              <button
                type="button"
                onClick={onOpen}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white transition ${
                  isIncident
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                Open
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDismiss}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                isIncident
                  ? "text-red-800/80 hover:bg-red-100 hover:text-red-950"
                  : "text-amber-800/80 hover:bg-amber-100 hover:text-amber-950"
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeMenu({ projectId }) {
  const hasHydrated = useHasHydrated()
  const pathname = usePathname()
  const router = useRouter()
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const deleted = hasHydrated && isDeletedProjectId(projectId)
  const [incidentAlerts, setIncidentAlerts] = useState([])
  const [inspectionAlerts, setInspectionAlerts] = useState([])
  const [showIncident, setShowIncident] = useState(false)
  const [showInspection, setShowInspection] = useState(false)
  const incidentHideRef = useRef(0)
  const inspectionShowRef = useRef(0)
  const inspectionHideRef = useRef(0)

  const clearBannerTimers = useCallback(() => {
    window.clearTimeout(incidentHideRef.current)
    window.clearTimeout(inspectionShowRef.current)
    window.clearTimeout(inspectionHideRef.current)
  }, [])

  const loadAlerts = useCallback(() => {
    if (!projectId || !hasHydrated) {
      return { incident: [], inspection: [] }
    }
    const incident = getSheqHomeAlerts(projectId, SHEQ_ALERT_KIND_INCIDENT)
    const inspection = getSheqHomeAlerts(projectId, SHEQ_ALERT_KIND_INSPECTION)
    setIncidentAlerts(incident)
    setInspectionAlerts(inspection)
    return { incident, inspection }
  }, [hasHydrated, projectId])

  const startBannerSequence = useCallback(
    (next) => {
      clearBannerTimers()
      const hasIncident = next.incident.length > 0
      const hasInspection = next.inspection.length > 0

      if (!hasIncident && !hasInspection) {
        setShowIncident(false)
        setShowInspection(false)
        return
      }

      if (hasIncident) {
        setShowIncident(true)
        incidentHideRef.current = window.setTimeout(() => {
          setShowIncident(false)

          if (!hasInspection) return

          // 1 second after the red incident toast is gone, show inspection for 3s.
          inspectionShowRef.current = window.setTimeout(() => {
            setShowInspection(true)
            inspectionHideRef.current = window.setTimeout(() => {
              setShowInspection(false)
            }, SHEQ_HOME_BANNER_VISIBLE_MS)
          }, SHEQ_HOME_BANNER_STAGGER_MS)
        }, SHEQ_HOME_BANNER_VISIBLE_MS)
      } else {
        setShowIncident(false)
      }

      if (hasInspection && !hasIncident) {
        setShowInspection(true)
        inspectionHideRef.current = window.setTimeout(() => {
          setShowInspection(false)
        }, SHEQ_HOME_BANNER_VISIBLE_MS)
      } else if (!hasInspection) {
        setShowInspection(false)
      } else {
        // Inspection waits until after the incident toast finishes (+ 1s gap).
        setShowInspection(false)
      }
    },
    [clearBannerTimers]
  )

  useEffect(() => {
    if (!hasHydrated || !projectId) return undefined
    const next = {
      incident: getSheqHomeAlerts(projectId, SHEQ_ALERT_KIND_INCIDENT),
      inspection: getSheqHomeAlerts(projectId, SHEQ_ALERT_KIND_INSPECTION),
    }
    setIncidentAlerts(next.incident)
    setInspectionAlerts(next.inspection)
    startBannerSequence(next)
    return () => clearBannerTimers()
  }, [hasHydrated, projectId, pathname, startBannerSequence, clearBannerTimers])

  useEffect(() => {
    if (!projectId) return undefined
    const onStorage = () => loadAlerts()
    const onNewAlert = () => {
      const next = loadAlerts()
      startBannerSequence(next)
    }
    window.addEventListener("grove-shared-storage-change", onStorage)
    window.addEventListener("sheq-home-alert", onNewAlert)
    return () => {
      window.removeEventListener("grove-shared-storage-change", onStorage)
      window.removeEventListener("sheq-home-alert", onNewAlert)
    }
  }, [projectId, loadAlerts, startBannerSequence])

  useEffect(() => {
    return () => clearBannerTimers()
  }, [clearBannerTimers])

  useEffect(() => {
    if (!projectId) return
    for (const hub of PROJECT_HOME_HUBS) {
      try {
        router.prefetch(getDashboardHref(projectId, hub.view))
      } catch {
        // Prefetch is best-effort.
      }
    }
  }, [projectId, router])

  if (deleted) {
    return (
      <div className="app-content-shell">
        <p className="text-sm text-zinc-500">This project was permanently deleted and will not return.</p>
      </div>
    )
  }

  if (!hasHydrated) {
    return <PageLoadingShell />
  }

  if (!project) {
    return (
      <div className="app-content-shell">
        <p className="text-sm text-zinc-500">This project is not available.</p>
      </div>
    )
  }

  const topIncident = incidentAlerts[0]
  const topInspection = inspectionAlerts[0]
  const showStack = (showIncident && topIncident) || (showInspection && topInspection)

  return (
    <div className="app-content-shell flex flex-col gap-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{project.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Select a department
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          Open QS &amp; Engineering for current project tools, or Finance and Safety &amp; Health for
          upcoming modules.
        </p>
      </header>

      {showStack ? (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-50 flex flex-col gap-1.5">
          {showIncident && topIncident ? (
            <SheqToast
              tone="red"
              title="SHEQ incident"
              message={topIncident.message}
              extraCount={incidentAlerts.length - 1}
              canOpen={Boolean(topIncident.dayId || topIncident.periodId)}
              onOpen={() =>
                router.push(
                  getSheqIncidentDailyFileHref(
                    projectId,
                    topIncident.dayId || topIncident.periodId
                  )
                )
              }
              onDismiss={() => {
                void dismissSheqHomeAlert(topIncident.id).then(() => {
                  const next = loadAlerts()
                  if (next.incident.length === 0) setShowIncident(false)
                })
              }}
            />
          ) : null}
          {showInspection && topInspection ? (
            <SheqToast
              tone="amber"
              title="SHEQ inspection"
              message={topInspection.message}
              extraCount={inspectionAlerts.length - 1}
              canOpen={Boolean(topInspection.period && topInspection.periodId)}
              onOpen={() =>
                router.push(
                  getSheqSiteInspectionFileHref(
                    projectId,
                    topInspection.period,
                    topInspection.periodId
                  )
                )
              }
              onDismiss={() => {
                void dismissSheqHomeAlert(topInspection.id).then(() => {
                  const next = loadAlerts()
                  if (next.inspection.length === 0) setShowInspection(false)
                })
              }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="app-choice-grid">
        {PROJECT_HOME_HUBS.map((hub) => (
          <ChoiceCard
            key={hub.view}
            href={getDashboardHref(projectId, hub.view)}
            icon={hub.icon}
            iconClassName={hub.iconClassName}
            title={hub.label}
            description={hub.description}
          />
        ))}
      </div>
    </div>
  )
}
