"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import SiteCameraCapture from "@/components/project/SiteCameraCapture"
import TableCellInput from "@/components/project/TableCellInput"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import {
  PROGRESS_PHOTO_ACCEPT,
  dedupeProgressPhotos,
  downloadProgressPhoto,
  hydrateProgressPhotos,
  openPhotoInNewTab,
  persistProgressPhotos,
  prepareProgressPhoto,
  removeStoredProgressPhoto,
  toPhotoMetadata,
} from "@/lib/progressReportPhotos"
import {
  SHEQ_ALERT_KIND_INCIDENT,
  canTriggerSheqHomeAlert,
  getSheqAlertWeekUsage,
  triggerSheqHomeAlert,
} from "@/lib/sheqHomeAlerts"
import {
  SHEQ_INCIDENT_TYPES,
  SHEQ_INCIDENT_YES_NO,
  createEmptySheqIncidentReport,
  getSheqIncidentDailyFile,
  getSheqIncidentReport,
  parseSheqIncidentFileId,
  saveSheqIncidentReport,
} from "@/lib/sheqIncident"
import { getSheqIncidentReportHref } from "@/lib/projectRoutes"

export default function SheqIncidentEntryView({ projectId, projectName, dayId }) {
  const hasHydrated = useHasHydrated()
  const fileId = dayId
  const file = getSheqIncidentDailyFile(projectId, fileId)
  const calendarDayId = parseSheqIncidentFileId(fileId).dayId
  const dayLabel = file?.label || fileId

  const [report, setReport] = useState(() => createEmptySheqIncidentReport(fileId))
  const [saveState, setSaveState] = useState("saved")
  const [photos, setPhotos] = useState([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState("")
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [alertMessage, setAlertMessage] = useState("")
  const [weekUsage, setWeekUsage] = useState({
    used: 0,
    remaining: 6,
    limit: 6,
  })

  const reportRef = useRef(report)
  const photosRef = useRef([])
  const saveTimerRef = useRef(0)
  const dirtyRef = useRef(false)
  const photoInputRef = useRef(null)

  useEffect(() => {
    if (!hasHydrated) return
    const next = getSheqIncidentReport(projectId, fileId)
    reportRef.current = next
    dirtyRef.current = false
    setReport(next)
    setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
    setAlertMessage("")
    void hydrateProgressPhotos(next.photos || []).then((hydrated) => {
      const list = dedupeProgressPhotos(hydrated)
      photosRef.current = list
      setPhotos(list)
    })
  }, [fileId, hasHydrated, projectId])

  useEffect(() => {
    reportRef.current = report
  }, [report])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  const persist = useCallback(
    async (nextReport, nextPhotos = photosRef.current) => {
      setSaveState("saving")
      try {
        await saveSheqIncidentReport(projectId, fileId, {
          ...nextReport,
          photos: nextPhotos.map(toPhotoMetadata),
        })
        dirtyRef.current = false
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [fileId, projectId]
  )

  useEffect(() => {
    const flush = () => {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = 0
      if (!dirtyRef.current) return
      dirtyRef.current = false
      void saveSheqIncidentReport(projectId, fileId, {
        ...reportRef.current,
        photos: photosRef.current.map(toPhotoMetadata),
      })
    }
    const onHide = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      flush()
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [fileId, projectId])

  useEffect(() => {
    const onStorage = () => {
      if (dirtyRef.current || saveTimerRef.current) return
      const next = getSheqIncidentReport(projectId, fileId)
      const nextAt = Date.parse(next.updatedAt || "") || 0
      const curAt = Date.parse(reportRef.current?.updatedAt || "") || 0
      if (nextAt < curAt) return
      reportRef.current = next
      setReport(next)
      void hydrateProgressPhotos(next.photos || []).then((hydrated) => {
        const list = dedupeProgressPhotos(hydrated)
        photosRef.current = list
        setPhotos(list)
      })
    }
    window.addEventListener("grove-shared-storage-change", onStorage)
    return () => window.removeEventListener("grove-shared-storage-change", onStorage)
  }, [fileId, projectId])

  const schedulePersist = useCallback(
    (nextReport) => {
      reportRef.current = nextReport
      dirtyRef.current = true
      setReport(nextReport)
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = 0
        void persist(nextReport)
      }, 400)
    },
    [persist]
  )

  const updateField = (field, value) => {
    schedulePersist({ ...reportRef.current, [field]: value })
  }

  const addPhotos = async (files) => {
    const selected = Array.from(files || []).filter(Boolean)
    if (selected.length === 0) {
      setPhotoUploadError("No photos were selected from your library")
      return
    }

    setPhotoUploadError("")
    setIsUploadingPhoto(true)

    try {
      const prepared = []
      const failures = []

      for (const fileItem of selected) {
        try {
          prepared.push(await prepareProgressPhoto(fileItem))
        } catch (error) {
          failures.push(
            error instanceof Error
              ? error.message
              : "Could not read one photo from your library"
          )
        }
      }

      if (prepared.length === 0) {
        const message =
          failures[0] || "Could not upload photos from your library. Please try again."
        setPhotoUploadError(message)
        window.alert(message)
        return
      }

      await persistProgressPhotos(prepared)
      const next = dedupeProgressPhotos([...photosRef.current, ...prepared])
      photosRef.current = next
      setPhotos(next)
      dirtyRef.current = true
      await persist(reportRef.current, next)

      if (failures.length > 0) {
        setPhotoUploadError(
          `Added ${prepared.length} photo${prepared.length === 1 ? "" : "s"}. ${failures.length} could not be read.`
        )
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not add these photos. Please try again."
      setPhotoUploadError(message)
      window.alert(message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    if (files.length === 0) return
    await addPhotos(files)
  }

  const handleRemovePhoto = (photoId) => {
    void removeStoredProgressPhoto(photoId)
    const next = photosRef.current.filter((photo) => photo.id !== photoId)
    photosRef.current = next
    setPhotos(next)
    dirtyRef.current = true
    void persist(reportRef.current, next)
    if (viewingPhoto?.id === photoId) setViewingPhoto(null)
  }

  const sendHomeAlert = async () => {
    setAlertMessage("")
    if (!canTriggerSheqHomeAlert(projectId, SHEQ_ALERT_KIND_INCIDENT)) {
      const usage = getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT)
      setAlertMessage(
        `Alert limit reached (${usage.limit} per week). ${usage.used} already used this week.`
      )
      return
    }

    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = 0
    await persist(reportRef.current, photosRef.current)

    const current = reportRef.current
    const result = await triggerSheqHomeAlert({
      projectId,
      projectName: projectName || "Project",
      period: "daily",
      periodId: fileId,
      periodLabel: dayLabel,
      dayId: calendarDayId,
      kind: SHEQ_ALERT_KIND_INCIDENT,
      location: current.locationOnSite,
      date: dayLabel,
      row: {
        id: `incident-${projectId}-${fileId}`,
        injuredName: current.injuredName,
        incidentType: current.incidentType,
        locationOnSite: current.locationOnSite,
      },
      message: undefined,
    })

    setWeekUsage(getSheqAlertWeekUsage(projectId, SHEQ_ALERT_KIND_INCIDENT))
    if (!result.ok) {
      setAlertMessage(result.message || "Could not send alert.")
      return
    }
    setAlertMessage(
      `Alert sent to the home page. ${result.remaining} alert${result.remaining === 1 ? "" : "s"} left this week.`
    )
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"

  const fieldClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Link
              href={getSheqIncidentReportHref(projectId)}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              Back to daily incident files
            </Link>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              SHEQ Incident report · {projectName || "Project"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{dayLabel}</h1>
            <p className="text-sm text-zinc-500" suppressHydrationWarning>
              {hasHydrated
                ? `Alerts left this week: ${weekUsage.remaining} of ${weekUsage.limit} · ${saveLabel}`
                : `Alerts left this week: — · ${saveLabel}`}
            </p>
            {alertMessage ? <p className="text-sm text-amber-800">{alertMessage}</p> : null}
          </div>
          <button
            type="button"
            title={
              weekUsage.remaining > 0
                ? "Push notification to home page"
                : "Weekly incident alert limit reached"
            }
            disabled={weekUsage.remaining <= 0}
            onClick={() => void sendHomeAlert()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="triangle-alert" size={14} />
            Alert home
          </button>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Incident details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Name (of person injured)
            </span>
            <TableCellInput
              value={report.injuredName}
              placeholder="Full name"
              onChange={(value) => updateField("injuredName", value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Location on site
            </span>
            <TableCellInput
              value={report.locationOnSite}
              placeholder="Where on site"
              onChange={(value) => updateField("locationOnSite", value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Type
            </span>
            <select
              value={report.incidentType}
              onChange={(event) => updateField("incidentType", event.target.value)}
              className={fieldClass}
            >
              <option value="">Select type…</option>
              {SHEQ_INCIDENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Description (how it happened)
            </span>
            <textarea
              value={report.description}
              placeholder="Narrative of what happened…"
              rows={4}
              onChange={(event) => updateField("description", event.target.value)}
              className={`${fieldClass} resize-y`}
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Witness names
            </span>
            <TableCellInput
              value={report.witnessNames}
              placeholder="Names of witnesses"
              onChange={(value) => updateField("witnessNames", value)}
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Body part injured / illness symptoms
            </span>
            <TableCellInput
              value={report.bodyPartOrSymptoms}
              placeholder="Body part or symptoms"
              onChange={(value) => updateField("bodyPartOrSymptoms", value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              First aid given
            </span>
            <select
              value={report.firstAidGiven}
              onChange={(event) => updateField("firstAidGiven", event.target.value)}
              className={fieldClass}
            >
              {SHEQ_INCIDENT_YES_NO.map((option) => (
                <option key={option.value || "blank"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Hospital referral
            </span>
            <TableCellInput
              value={report.hospitalReferral}
              placeholder="Hospital / referral details"
              onChange={(value) => updateField("hospitalReferral", value)}
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Reported by
            </span>
            <TableCellInput
              value={report.reportedBy}
              placeholder="Name of person reporting"
              onChange={(value) => updateField("reportedBy", value)}
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Incident photos
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Upload photos from your files or gallery, or take a live photo with the camera.
          </p>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <input
            ref={photoInputRef}
            type="file"
            accept={PROGRESS_PHOTO_ACCEPT}
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="image" size={14} />
              {isUploadingPhoto ? "Uploading..." : "Upload Photos"}
            </button>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              disabled={isUploadingPhoto}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="camera" size={14} />
              Take Picture
            </button>
          </div>

          {photoUploadError ? (
            <p className="text-xs text-rose-600">{photoUploadError}</p>
          ) : null}

          {photos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                {photos.length} photo{photos.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.id}-${index}`}
                    className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                  >
                    <button
                      type="button"
                      onClick={() => setViewingPhoto(photo)}
                      className="block w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.data}
                        alt={photo.name}
                        className="aspect-square w-full object-cover transition group-hover:opacity-90"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:bg-zinc-900"
                      style={{ backgroundColor: "#3f3f46" }}
                      aria-label={`Remove ${photo.name}`}
                    >
                      <Icon name="x" size={12} />
                    </button>
                    <p className="truncate px-2 py-1.5 text-xs text-zinc-600">{photo.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No incident photos yet</p>
          )}

          {viewingPhoto ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: "rgba(9, 9, 11, 0.8)" }}
              onClick={() => setViewingPhoto(null)}
            >
              <div
                className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {viewingPhoto.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPhotoInNewTab(viewingPhoto)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Open in tab
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadProgressPhoto(viewingPhoto)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingPhoto(null)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                      aria-label="Close photo viewer"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </div>
                <div className="max-h-[calc(90vh-4rem)] overflow-auto bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingPhoto.data}
                    alt={viewingPhoto.name}
                    className="mx-auto max-h-[calc(90vh-4rem)] w-full object-contain"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <SiteCameraCapture
            open={isCameraOpen}
            isBusy={isUploadingPhoto}
            onClose={() => setIsCameraOpen(false)}
            onCapture={async (capturedFile) => {
              await addPhotos([capturedFile])
            }}
          />
        </div>
      </section>
    </div>
  )
}
