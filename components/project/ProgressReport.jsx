"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import WorkingHoursWeatherCard from "@/components/project/WorkingHoursWeatherCard"
import RichTextEditor, { countPlainText } from "@/components/project/RichTextEditor"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getEquipmentInUseForDay, getEquipmentInUseForWeek, getOperatorRegisterForDay, getOperatorRegisterForWeek } from "@/lib/equipmentInUse"
import {
  getProjectProgressReport,
  getProjectDailyProgressReport,
  saveProgressReport,
  formatWeekRange,
  formatDayLabelFromId,
  addAttachment,
  removeAttachment,
} from "@/lib/progressReports"
import {
  mergeValuationNotesContent,
  resolveActualProgressUpdateContent,
} from "@/lib/progressReportDemo"
import {
  getActualProgressUpdateHref,
  getDailyFileHref,
  getDailyProgressReportFileHref,
  getProgressReportsHref,
  getWeeklyProgressReportFileHref,
  getWeeklyProgressReportsHref,
  getWeeklyFileHref,
} from "@/lib/projectRoutes"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import SiteCameraCapture from "@/components/project/SiteCameraCapture"
import {
  dedupeProgressPhotos,
  downloadProgressPhoto,
  hydrateProgressPhotos,
  normalizeProgressPhotos,
  openPhotoInNewTab,
  persistProgressPhotos,
  prepareProgressPhoto,
  removeStoredProgressPhoto,
} from "@/lib/progressReportPhotos"
import {
  exportFullProgressReportPdf,
  getDailyReportPdfFilename,
  getWeeklyReportPdfFilename,
} from "@/lib/progressReportPdf"

function buildInitialReport(projectId, reportId, reportType) {
  const reportData = reportType === "daily"
    ? getProjectDailyProgressReport(projectId, reportId)
    : getProjectProgressReport(projectId, reportId)
  if (!reportData) return null

  return {
    ...reportData,
    progressUpdate: {
      ...reportData.progressUpdate,
      photos: dedupeProgressPhotos(normalizeProgressPhotos(reportData.progressUpdate?.photos)),
    },
  }
}

function ProgressReportEditor({ projectName, projectId, reportId, reportType = "weekly", pageVariant = "target-plan" }) {
  const { getProject } = useProjects()
  const { getDaySummary, getWeekSummary, version } = useProjectData()
  const displayProjectName = getProject(projectId)?.name || projectName
  const [report, setReport] = useState(() => buildInitialReport(projectId, reportId, reportType))
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [showAttachmentForm, setShowAttachmentForm] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [photoUploadError, setPhotoUploadError] = useState("")
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)
  const pageRef = useRef(null)
  const weatherRef = useRef(null)
  const documentSectionRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const initial = buildInitialReport(projectId, reportId, reportType)
      if (!initial) return

      const photos = await hydrateProgressPhotos(initial.progressUpdate?.photos)
      if (cancelled) return

      setReport((prev) => {
        const current = prev || initial
        const hydratedById = new Map(photos.map((photo) => [photo.id, photo]))
        const mergedPhotos = (current.progressUpdate?.photos || photos).map((photo) =>
          photo?.data ? photo : hydratedById.get(photo.id) || photo
        )

        return {
          ...current,
          progressUpdate: {
            ...current.progressUpdate,
            photos: dedupeProgressPhotos(mergedPhotos),
          },
        }
      })
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [projectId, reportId, reportType])

  const handleProgressSummaryChange = (newContent) => {
    setReport((prev) => ({
      ...prev,
      progressSummary: newContent,
    }))

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveChanges({ progressSummary: newContent })
    }, 1000)
  }

  const handleProgressUpdateChange = (newContent) => {
    setReport((prev) => {
      const progressUpdate = {
        ...prev.progressUpdate,
        content: newContent,
        userEdited: true,
        updatedAt: new Date().toISOString(),
      }

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveChanges({ progressUpdate })
      }, 1000)

      return {
        ...prev,
        progressUpdate,
      }
    })
  }

  const saveChanges = (getUpdates) => {
    setReport((prev) => {
      if (!prev) return prev

      const updates = typeof getUpdates === "function" ? getUpdates(prev) : getUpdates
      const next = { ...prev, ...updates }

      setIsSaving(true)

      try {
        if (!saveProgressReport(projectId, { ...next, reportType })) {
          throw new Error("Could not save progress report.")
        }

        setLastSaved(new Date())
        setIsSaving(false)
        return next
      } catch (error) {
        console.error("Failed to save progress report:", error)
        setIsSaving(false)
        window.alert(
          error instanceof Error
            ? error.message
            : "Failed to save changes. Storage may be full — try removing older photos."
        )
        return prev
      }
    })
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB")
      return
    }

    // Create file reader to convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      const attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        data: base64,
      }

      if (addAttachment(projectId, reportId, attachment)) {
        setReport((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), attachment],
        }))
        setShowAttachmentForm(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    reader.readAsDataURL(file)
  }

  const handleRemoveAttachment = (attachmentId) => {
    if (removeAttachment(projectId, reportId, attachmentId)) {
      setReport((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== attachmentId),
      }))
    }
  }

  const handleDownloadAttachment = (attachment) => {
    const link = document.createElement("a")
    link.href = attachment.data
    link.download = attachment.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const addPhotosToReport = async (files) => {
    const imageFiles = (files || []).filter((file) => file?.type?.startsWith("image/"))
    if (imageFiles.length === 0) {
      setPhotoUploadError("Please select image files")
      return
    }

    setPhotoUploadError("")
    setIsUploadingPhoto(true)

    try {
      const prepared = []
      for (const file of imageFiles) {
        prepared.push(await prepareProgressPhoto(file))
      }

      await persistProgressPhotos(prepared)

      saveChanges((prev) => ({
        progressUpdate: {
          ...prev.progressUpdate,
          photos: dedupeProgressPhotos([...(prev.progressUpdate?.photos || []), ...prepared]),
          updatedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not add these photos. Please try again."
      setPhotoUploadError(message)
      window.alert(message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (files.length === 0) return
    await addPhotosToReport(files)
  }

  const handleRemovePhoto = (photoId) => {
    void removeStoredProgressPhoto(photoId)

    saveChanges((prev) => ({
      progressUpdate: {
        ...prev.progressUpdate,
        photos: (prev.progressUpdate?.photos || []).filter((photo) => photo.id !== photoId),
        updatedAt: new Date().toISOString(),
      },
    }))

    if (viewingPhoto?.id === photoId) {
      setViewingPhoto(null)
    }
  }

  const valuationSummary = useMemo(() => {
    if (!reportId) return null
    if (reportType === "daily") return getDaySummary(reportId)
    if (reportType === "weekly") return getWeekSummary(reportId)
    return null
  }, [getDaySummary, getWeekSummary, reportId, reportType, version])

  const equipmentReport = useMemo(() => {
    if (!projectId || !reportId) return null
    if (reportType === "daily") return getEquipmentInUseForDay(projectId, reportId)
    if (reportType === "weekly") return getEquipmentInUseForWeek(projectId, reportId)
    return null
  }, [projectId, reportId, reportType, version])

  const operatorRegister = useMemo(() => {
    if (!projectId || !reportId) return null
    if (reportType === "daily") return getOperatorRegisterForDay(projectId, reportId)
    if (reportType === "weekly") return getOperatorRegisterForWeek(projectId, reportId)
    return null
  }, [projectId, reportId, reportType, version])

  const actualProgressContent = useMemo(
    () =>
      resolveActualProgressUpdateContent(
        report,
        valuationSummary,
        equipmentReport,
        operatorRegister
      ),
    [report, valuationSummary, equipmentReport, operatorRegister]
  )

  useEffect(() => {
    if (pageVariant !== "actual-progress-update") return

    setReport((prev) => {
      if (!prev) return prev

      const userEdited = Boolean(prev.progressUpdate?.userEdited)
      const nextContent = mergeValuationNotesContent(
        prev.progressUpdate?.content,
        valuationSummary,
        equipmentReport,
        operatorRegister,
        { userEdited }
      )
      if (nextContent === (prev.progressUpdate?.content || "")) return prev

      const next = {
        ...prev,
        progressUpdate: {
          ...prev.progressUpdate,
          content: nextContent,
          updatedAt: new Date().toISOString(),
        },
      }

      saveProgressReport(projectId, { ...next, reportType })
      return next
    })
  }, [pageVariant, projectId, reportType, valuationSummary, equipmentReport, operatorRegister])

  if (!report) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading progress report...</p>
      </div>
    )
  }

  const inProgress = report.status === "in-progress"
  const isActualProgressUpdate = pageVariant === "actual-progress-update"
  const isDailyReport = reportType === "daily"
  const dateHeading = isDailyReport ? formatDayLabelFromId(report.id) : formatWeekRange(report.id)
  const sitePhotos = dedupeProgressPhotos(report.progressUpdate?.photos)

  const exportFullReportPdf = async () => {
    const liveHtml =
      documentSectionRef.current?.querySelector(".rich-text-editor__content")?.innerHTML ||
      (isActualProgressUpdate ? actualProgressContent : report.progressSummary)

    setIsExportingPdf(true)
    try {
      saveChanges((currentReport) => currentReport)
      const filename = reportType === "weekly"
        ? getWeeklyReportPdfFilename(displayProjectName, reportId)
        : getDailyReportPdfFilename(displayProjectName, reportId)

      const weatherWaitStarted = Date.now()
      while (
        weatherRef.current &&
        Date.now() - weatherWaitStarted < 8000 &&
        /Loading forecast/i.test(weatherRef.current.textContent || "")
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, 250))
      }

      await exportFullProgressReportPdf({
        filename,
        projectName: displayProjectName,
        title: isActualProgressUpdate ? "Actual Progress Update" : "Target Plan",
        dateLabel: dateHeading,
        weatherElement: weatherRef.current,
        documentHtml: liveHtml,
        photos: await hydrateProgressPhotos(sitePhotos),
      })
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : `Could not export this ${reportType === "weekly" ? "weekly" : "daily"} report to PDF.`
      )
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div ref={pageRef} className="space-y-6 p-2 md:p-4" style={{ backgroundColor: "#f4f4f5" }}>
      <div className="flex items-start justify-between gap-4 rounded-none border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <header className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <Link
              href={reportType === "daily"
                ? getProgressReportsHref(projectId)
                : getWeeklyProgressReportsHref(projectId)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <Icon name="chevron-left" size={18} />
            </Link>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Progress Report
            </p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {isActualProgressUpdate ? "Actual Progress Update" : "Target Plan"}
          </h1>
          <p className="text-xl font-medium tracking-tight text-zinc-800">
            {dateHeading}
            {displayProjectName ? ` · ${displayProjectName}` : ""}
          </p>
        </header>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-amber-600">Saving...</span>
          )}
          {lastSaved && !isSaving && (
            <span className="text-xs text-zinc-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => saveChanges((currentReport) => currentReport)}
            disabled={isSaving}
            className="no-print inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="save" size={14} />
            Save
          </button>
          {isActualProgressUpdate && (
            <ExportPdfButton
              className={`px-3 py-1.5 text-xs ${isExportingPdf ? "pointer-events-none opacity-60" : ""}`}
              onClick={exportFullReportPdf}
            />
          )}
          {reportType === "daily" && (
            <Link
              href={getDailyFileHref(projectId, reportId)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              Daily Valuation
            </Link>
          )}
          {reportType === "weekly" && (
            <Link
              href={getWeeklyFileHref(projectId, reportId)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              Weekly Valuation
            </Link>
          )}
          {!isActualProgressUpdate && (
            <Link
              href={reportType === "daily"
                ? `${getDailyProgressReportFileHref(projectId, reportId)}/actual-progress-update`
                : `${getWeeklyProgressReportFileHref(projectId, reportId)}/actual-progress-update`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              Actual Progress Update
            </Link>
          )}
          {isActualProgressUpdate && (
            <Link
              href={reportType === "daily"
                ? getDailyProgressReportFileHref(projectId, reportId)
                : getWeeklyProgressReportFileHref(projectId, reportId)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              Target Plan
            </Link>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              inProgress
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {inProgress ? "In progress" : "Completed"}
          </span>
        </div>
      </div>

      {(isActualProgressUpdate || reportType === "daily" || reportType === "weekly") ? (
        <div ref={weatherRef}>
          <WorkingHoursWeatherCard
            projectName={displayProjectName}
            reportType={reportType}
            reportId={reportId}
          />
        </div>
      ) : null}

      <div className={isDailyReport ? "space-y-6" : "grid gap-6 lg:grid-cols-3"}>
        <div className={isDailyReport ? "space-y-6" : "lg:col-span-2 space-y-6"}>
          <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm min-h-[720px]">
            <div className="border-b border-zinc-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    {isActualProgressUpdate ? "Actual Progress Update" : "Progress Summary"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-600">
                    {isActualProgressUpdate
                      ? "Tables are filled from this project's valuations, operator register, and equipment in use. You can edit the document anytime."
                      : "Use the Word-style toolbar to format your target plan. Content from the previous week is copied automatically each new week and can be edited freely."}
                  </p>
                </div>

                {isActualProgressUpdate && (
                  <ExportPdfButton
                    className={isExportingPdf ? "pointer-events-none opacity-60" : ""}
                    onClick={exportFullReportPdf}
                  />
                )}
              </div>
            </div>

            <div ref={documentSectionRef} className="p-4 md:p-6">
              <RichTextEditor
                editorKey={`${projectId}-${reportId}-${pageVariant}`}
                value={
                  isActualProgressUpdate
                    ? actualProgressContent
                    : report.progressSummary
                }
                onChange={
                  isActualProgressUpdate
                    ? handleProgressUpdateChange
                    : handleProgressSummaryChange
                }
                placeholder={
                  isActualProgressUpdate
                    ? "Document actual progress, milestones, and updates for this week…"
                    : "Type your progress summary for this week…"
                }
                minHeight={640}
              />
              <p className="no-print mt-2 text-xs text-zinc-500">
                {countPlainText(
                  isActualProgressUpdate
                    ? actualProgressContent
                    : report.progressSummary
                )}{" "}
                characters · Shortcuts: Ctrl+B bold, Ctrl+I italic, Ctrl+U underline, Ctrl+Z undo
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {isActualProgressUpdate ? (
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Site Photos
                </h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Upload from files or gallery, or take a live photo with the camera. There is no
                  photo count limit — add as many as you need.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="no-print grid grid-cols-2 gap-2">
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

                {sitePhotos.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">
                      {sitePhotos.length} site photo{sitePhotos.length === 1 ? "" : "s"}
                    </p>
                    <div className={isDailyReport ? "" : "max-h-[32rem] overflow-y-auto pr-1"}>
                      <div className={`grid gap-3 ${isDailyReport ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2"}`}>
                    {sitePhotos.map((photo, index) => (
                      <div
                        key={`${photo.id}-${index}`}
                        className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                      >
                        <button
                          type="button"
                          onClick={() => setViewingPhoto(photo)}
                          className="block w-full"
                        >
                          {/* Base64 uploads from local storage — next/image does not apply */}
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
                          className="no-print absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:bg-zinc-900"
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
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No site photos yet</p>
                )}

                {viewingPhoto ? (
                  <div
                    className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
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
                  onCapture={async (file) => {
                    await addPhotosToReport([file])
                  }}
                />
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Upload Site Plan pdf
                </h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Upload the site plan PDF for this Target Plan (max 10MB)
                </p>
              </div>

              <div className="p-6 space-y-4">
                {report.attachments && report.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {report.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon
                            name={
                              attachment.type === "application/pdf"
                                ? "file"
                                : "paperclip"
                            }
                            size={16}
                            className="shrink-0 text-zinc-500"
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="truncate text-xs font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                            >
                              {attachment.name}
                            </button>
                            <p className="text-xs text-zinc-500">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="no-print shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                        >
                          <Icon name="x" size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No site plan uploaded</p>
                )}

                {showAttachmentForm ? (
                  <div className="no-print space-y-2 border-t border-zinc-200 pt-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="block w-full text-xs text-zinc-500 file:mr-2 file:rounded file:border file:border-zinc-300 file:bg-zinc-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-100"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAttachmentForm(false)}
                        className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowAttachmentForm(true)
                      setTimeout(() => fileInputRef.current?.click(), 0)
                    }}
                    className="no-print w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-100"
                  >
                    <Icon name="plus" size={14} className="mr-1 inline" />
                    Upload Site Plan PDF
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Info Card */}
          <section className="rounded-xl border border-zinc-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Icon name="info" size={18} className="shrink-0 text-blue-600" />
              <div>
                <h3 className="text-xs font-semibold text-blue-900">
                  {isDailyReport ? "Day information" : "Week Information"}
                </h3>
                <p className="mt-1 text-xs text-blue-700">
                  Created {new Date(report.createdAt).toLocaleDateString()}
                </p>
                {report.completedAt && (
                  <p className="text-xs text-blue-700">
                    Completed {new Date(report.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {reportType === "daily" || reportType === "weekly" ? (
        <div className="no-print flex flex-col items-center gap-2 border-t border-zinc-200 pt-4 pb-2">
          <p className="text-xs text-zinc-500">
            {isActualProgressUpdate
              ? reportType === "weekly"
                ? "Export the full weekly report page, including weather, the document, and site photos."
                : "Export the full daily report page, including weather, the document, and site photos."
              : reportType === "weekly"
                ? "Export the full weekly target plan page."
                : "Export the full daily target plan page."}
          </p>
          <ExportPdfButton
            className={isExportingPdf ? "pointer-events-none opacity-60" : "px-4 py-2.5"}
            onClick={exportFullReportPdf}
          />
        </div>
      ) : null}
    </div>
  )
}

export default function ProgressReport(props) {
  const { projectId, reportId, reportType } = props

  return <ProgressReportEditor key={`${projectId}-${reportId}-${reportType}`} {...props} />
}
