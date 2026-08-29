"use client"

import { useState, useRef, useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import WeeklyReport from "@/components/project/WeeklyReport"
import EquipmentInUseTable from "@/components/project/EquipmentInUseTable"
import RichTextEditor, { countPlainText } from "@/components/project/RichTextEditor"
import {
  getProjectProgressReport,
  getProjectDailyProgressReport,
  saveProgressReport,
  formatWeekRange,
  addAttachment,
  removeAttachment,
} from "@/lib/progressReports"
import { resolveActualProgressUpdateContent } from "@/lib/progressReportDemo"
import {
  getActualProgressUpdateHref,
  getDailyProgressReportFileHref,
  getProgressReportsHref,
  getWeeklyProgressReportFileHref,
  getWeeklyProgressReportsHref,
  getWeeklyFileHref,
} from "@/lib/projectRoutes"
import { getWeeklyFile } from "@/lib/projects"
import { getPlantOnSitePeriodFileHref } from "@/lib/plantOnSiteModules"
import {
  dedupeProgressPhotos,
  downloadProgressPhoto,
  normalizeProgressPhotos,
  openPhotoInNewTab,
  prepareProgressPhoto,
} from "@/lib/progressReportPhotos"

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
  const [report, setReport] = useState(() => buildInitialReport(projectId, reportId, reportType))
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [showAttachmentForm, setShowAttachmentForm] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [photoUploadError, setPhotoUploadError] = useState("")
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)

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

  const addPhotoToReport = async (file) => {
    setPhotoUploadError("")
    setIsUploadingPhoto(true)

    try {
      const photo = await prepareProgressPhoto(file)

      saveChanges((prev) => ({
        progressUpdate: {
          ...prev.progressUpdate,
          photos: dedupeProgressPhotos([...(prev.progressUpdate?.photos || []), photo]),
          updatedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not upload this photo. Please try again."
      setPhotoUploadError(message)
      window.alert(message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    await addPhotoToReport(file)
  }

  const handleRemovePhoto = (photoId) => {
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

  const weeklyFile = useMemo(
    () => (reportType === "weekly" && projectId && reportId ? getWeeklyFile(projectId, reportId) : null),
    [projectId, reportId, reportType]
  )

  if (!report) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading progress report...</p>
      </div>
    )
  }

  const inProgress = report.status === "in-progress"
  const isActualProgressUpdate = pageVariant === "actual-progress-update"
  const sitePhotos = dedupeProgressPhotos(report.progressUpdate?.photos)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
            {isActualProgressUpdate ? "Actual Progress Update" : "Target Plan"} · {reportType === "daily" ? report.date : formatWeekRange(report.id)}
          </h1>
          <p className="max-w-2xl text-zinc-500">{projectName}</p>
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="save" size={14} />
            Save
          </button>
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

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress Summary Editor */}
        <div className="lg:col-span-2 space-y-6">
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {isActualProgressUpdate ? "Actual Progress Update" : "Progress Summary"}
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                {isActualProgressUpdate
                  ? "This report starts from the target plan saved for this week. Edit freely — your changes are saved separately as the actual progress update."
                  : "Use the Word-style toolbar to format your target plan. Content from the previous week is copied automatically each new week and can be edited freely."}
              </p>
            </div>

            <div className="p-6">
              <RichTextEditor
                editorKey={`${projectId}-${reportId}-${pageVariant}`}
                value={
                  isActualProgressUpdate
                    ? resolveActualProgressUpdateContent(report)
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
                minHeight={320}
              />
              <p className="mt-2 text-xs text-zinc-500">
                {countPlainText(
                  isActualProgressUpdate
                    ? resolveActualProgressUpdateContent(report)
                    : report.progressSummary
                )}{" "}
                characters · Shortcuts: Ctrl+B bold, Ctrl+I italic, Ctrl+U underline, Ctrl+Z undo
              </p>
            </div>
          </section>

          {isActualProgressUpdate && reportType === "weekly" && (
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Weekly Valuation Report
                    </h2>
                    <p className="mt-1 text-xs text-zinc-600">
                      Duplicated from the valuations weekly report for this week. Values update
                      automatically from saved hourly dashboards.
                    </p>
                  </div>
                  {weeklyFile && (
                    <Link
                      href={getWeeklyFileHref(projectId, report.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                    >
                      Open full weekly valuation report
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  )}
                </div>
              </div>
              <div className="p-6">
                {weeklyFile ? (
                  <WeeklyReport
                    embedded
                    projectName={projectName}
                    projectId={projectId}
                    file={weeklyFile}
                  />
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No weekly valuation report exists for this exact week yet. Once the week is
                    created in valuations, it will appear here.
                  </div>
                )}
              </div>
            </section>
          )}

          {isActualProgressUpdate && reportType === "weekly" && (
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Weekly Equipment in Use
                    </h2>
                    <p className="mt-1 text-xs text-zinc-600">
                      Duplicated from the equipment in use weekly dashboard for this week. Data
                      updates automatically from operator register attendance ticks and daily hours.
                    </p>
                  </div>
                  {weeklyFile && (
                    <Link
                      href={getPlantOnSitePeriodFileHref(
                        projectId,
                        "equipment-in-use",
                        "weekly",
                        report.id
                      )}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                    >
                      Open full equipment in use report
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  )}
                </div>
              </div>
              <div className="p-6">
                {weeklyFile ? (
                  <EquipmentInUseTable
                    embedded
                    projectId={projectId}
                    projectName={projectName}
                    period="weekly"
                    fileId={report.id}
                  />
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No weekly equipment in use report exists for this exact week yet.
                  </div>
                )}
              </div>
            </section>
          )}
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
                  Upload photos or take pictures on site to document actual progress (max 10MB each).
                </p>
              </div>

              <div className="p-6 space-y-4">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
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
                    {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
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
                  <div className="grid grid-cols-2 gap-3">
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
                          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-white transition hover:bg-zinc-900"
                          aria-label={`Remove ${photo.name}`}
                        >
                          <Icon name="x" size={12} />
                        </button>
                        <p className="truncate px-2 py-1.5 text-xs text-zinc-600">{photo.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No site photos yet</p>
                )}

                {viewingPhoto ? (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4"
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
                          className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
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
                  <div className="space-y-2 border-t border-zinc-200 pt-4">
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
                    className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-100"
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
                <h3 className="text-xs font-semibold text-blue-900">Week Information</h3>
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
    </div>
  )
}

export default function ProgressReport(props) {
  const { projectId, reportId, reportType } = props

  return <ProgressReportEditor key={`${projectId}-${reportId}-${reportType}`} {...props} />
}
