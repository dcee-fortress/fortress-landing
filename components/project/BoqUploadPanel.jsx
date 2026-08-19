"use client"

import { useRef, useState } from "react"
import Icon from "@/components/icon/icon"
import BoqViewerModal from "@/components/project/BoqViewerModal"
import { addProjectBoq, getProjectBoqs, parseBoqFile, removeProjectBoq, updateProjectBoqItems } from "@/lib/boqData"

function defaultBoqName(fileName) {
  return fileName?.replace(/\.[^.]+$/, "") ?? ""
}

function buildPreviewBoq({ name, fileName, items }) {
  return {
    id: "preview",
    name: name.trim() || defaultBoqName(fileName) || "BOQ preview",
    fileName,
    items,
  }
}

export default function BoqUploadPanel({ projectId, projectName = "Project", onUploaded, version = 0 }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)
  const [boqName, setBoqName] = useState("")
  const [viewBoq, setViewBoq] = useState(null)

  void version
  const projectBoqs = getProjectBoqs(projectId)

  const resetPending = () => {
    setPendingUpload(null)
    setBoqName("")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setStatus("")

    try {
      const items = await parseBoqFile(file)

      if (items.length === 0) {
        setStatus("No BOQ rows found. Include item name and rate columns in your file.")
        resetPending()
        return
      }

      setPendingUpload({ fileName: file.name, items })
      setBoqName(defaultBoqName(file.name))
      setStatus(`Found ${items.length} item${items.length === 1 ? "" : "s"} in ${file.name}. Name this BOQ to add it.`)
    } catch (error) {
      setStatus(error.message || "Could not read BOQ file.")
      resetPending()
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveBoq = () => {
    if (!pendingUpload) return

    const trimmedName = boqName.trim()
    if (!trimmedName) {
      setStatus("Enter a name for this BOQ before saving.")
      return
    }

    addProjectBoq(projectId, {
      name: trimmedName,
      fileName: pendingUpload.fileName,
      items: pendingUpload.items,
    })

    setStatus(`Added "${trimmedName}" with ${pendingUpload.items.length} BOQ items.`)
    resetPending()
    onUploaded?.()
  }

  const handleBoqSave = (items) => {
    if (!viewBoq) return

    if (viewBoq.id === "preview") {
      setPendingUpload((current) => (current ? { ...current, items } : current))
      setViewBoq((current) => (current ? { ...current, items } : null))
      setStatus(`Updated parsed BOQ (${items.length} item${items.length === 1 ? "" : "s"}). Save when ready.`)
      return
    }

    updateProjectBoqItems(projectId, viewBoq.id, items)
    setViewBoq((current) => (current ? { ...current, items } : null))
    setStatus(`Saved changes to "${viewBoq.name}".`)
    onUploaded?.()
  }

  const handleRemoveBoq = (boq) => {
    const confirmed = window.confirm(
      `Remove "${boq.name}" from this project? Its rate analysis report will be deleted.`
    )

    if (!confirmed) return

    removeProjectBoq(projectId, boq.id)

    if (viewBoq?.id === boq.id) {
      setViewBoq(null)
    }

    setStatus(`Removed "${boq.name}".`)
    onUploaded?.()
  }

  const handleViewBoqPdf = async (boq) => {
    const { openBoqPdf } = await import("@/lib/boqPdf")
    openBoqPdf({ projectName, boq })
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-200 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
              Excel BOQ
            </h2>
            <p className="mt-1 text-sm text-emerald-950/80">
              Add Excel or CSV BOQ files from your PC or phone. Name each BOQ — a separate rate analysis
              report is created for every BOQ you add. Actual measured rates update daily; BOQ rates stay
              as your reference point.
            </p>
            {projectBoqs.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {projectBoqs.map((boq) => (
                  <li
                    key={boq.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-white/70 px-3 py-2"
                  >
                    <div className="min-w-0 text-xs text-emerald-900/80">
                      <span className="font-semibold text-emerald-950">{boq.name}</span>
                      {boq.demo ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Demo
                        </span>
                      ) : null}
                      {boq.fileName ? (
                        <>
                          {" "}
                          · <span className="font-medium">{boq.fileName}</span>
                        </>
                      ) : null}
                      {" · "}
                      {boq.items.length} item{boq.items.length === 1 ? "" : "s"}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setViewBoq(boq)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-50"
                      >
                        <Icon name="table" size={14} />
                        Open BOQ data
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewBoqPdf(boq)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-50"
                      >
                        <Icon name="file-down" size={14} />
                        View BOQ PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBoq(boq)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <Icon name="trash-2" size={14} />
                        Remove BOQ
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              <Icon name="file-down" size={16} />
              {isUploading ? "Reading BOQ…" : "Add Excel BOQ"}
            </button>
          </div>
        </div>

        {pendingUpload ? (
          <div className="space-y-3 border-b border-emerald-200 px-6 py-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-emerald-950">BOQ name</span>
              <input
                type="text"
                value={boqName}
                onChange={(event) => setBoqName(event.target.value)}
                placeholder="e.g. Main contract BOQ, Variation 3"
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-600/20 focus:ring-2"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleSaveBoq()
                  }
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setViewBoq(
                    buildPreviewBoq({
                      name: boqName,
                      fileName: pendingUpload.fileName,
                      items: pendingUpload.items,
                    })
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
              >
                <Icon name="table" size={16} />
                Open parsed BOQ data
              </button>
              <button
                type="button"
                onClick={() =>
                  handleViewBoqPdf(
                    buildPreviewBoq({
                      name: boqName,
                      fileName: pendingUpload.fileName,
                      items: pendingUpload.items,
                    })
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
              >
                <Icon name="file-down" size={16} />
                View BOQ PDF
              </button>
              <button
                type="button"
                onClick={handleSaveBoq}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                Save BOQ
              </button>
              <button
                type="button"
                onClick={() => {
                  resetPending()
                  setStatus("")
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {status ? (
          <div className="px-6 py-3 text-sm text-emerald-950/90">{status}</div>
        ) : null}
      </section>

      <BoqViewerModal
        boq={viewBoq}
        onClose={() => setViewBoq(null)}
        onSave={handleBoqSave}
        onViewPdf={handleViewBoqPdf}
      />
    </>
  )
}
