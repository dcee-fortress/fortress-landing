"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Icon from "@/components/icon/icon"
import BoqViewerModal from "@/components/project/BoqViewerModal"
import {
  applyRateBuildUpRates,
  readActualCostAnalysisRows,
  syncRateBuildUpFromBoq,
} from "@/lib/actualCostAnalysis"
import { rememberRateBuildUpRows } from "@/lib/rateBuildUpMemory"
import { subscribeGroveStore } from "@/lib/groveClientStore"
import {
  BOQ_STORAGE_KEY,
  addProjectBoq,
  formatBoqRate,
  getProjectBoqs,
  parseBoqFile,
  removeProjectBoq,
  updateProjectBoqItems,
  updateProjectBoqName,
} from "@/lib/boqData"

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

function templateBoq(projectId, boq) {
  if (!boq) return null
  return { ...boq, items: applyRateBuildUpRates(projectId, boq.items) }
}

const UPLOADED_RATE_KEYS = new Set(["rate", "billRate", "allowableRate", "actualRate", "cost"])

function stripUploadedRates(items) {
  return items.map((item) =>
    Object.fromEntries(Object.entries(item).filter(([key]) => !UPLOADED_RATE_KEYS.has(key)))
  )
}

export default function BoqUploadPanel({ projectId, projectName = "Project", onUploaded, version = 0 }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)
  const [boqName, setBoqName] = useState("")
  const [savedBoqId, setSavedBoqId] = useState(null)
  const [viewBoq, setViewBoq] = useState(null)
  const [listRevision, setListRevision] = useState(0)

  const projectBoqs = useMemo(() => {
    void version
    void listRevision
    return getProjectBoqs(projectId)
  }, [projectId, version, listRevision])
  const pendingBoqItems =
    projectBoqs.find((boq) => boq.id === savedBoqId)?.items ?? pendingUpload?.items ?? []

  useEffect(
    () =>
      subscribeGroveStore((key) => {
        if (key === BOQ_STORAGE_KEY) setListRevision((current) => current + 1)
      }),
    []
  )

  const resetPending = () => {
    setPendingUpload(null)
    setSavedBoqId(null)
    setBoqName("")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const keepBoq = (fileName, items, name) => {
    const saved = addProjectBoq(projectId, {
      name: name || defaultBoqName(fileName),
      fileName,
      items,
    })
    syncRateBuildUpFromBoq(projectId)
    setSavedBoqId(saved.id)
    onUploaded?.()
    return saved
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setStatus("")

    try {
      const items = stripUploadedRates(await parseBoqFile(file))

      if (items.length === 0) {
        setStatus(
          "No BOQ rows found. The PDF needs text descriptions and rates. A scanned picture will not read — upload the Excel file instead."
        )
        resetPending()
        return
      }

      const nextUpload = { fileName: file.name, items }
      const saved = keepBoq(file.name, items, defaultBoqName(file.name))
      setPendingUpload(nextUpload)
      setBoqName(saved.name)
      setViewBoq(templateBoq(projectId, saved))
      setStatus(
        `Saved ${items.length} item${items.length === 1 ? "" : "s"} from ${file.name}. Each BOQ item number is its own row with the full description. Rate build up matches those rows.`
      )
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

    if (savedBoqId) {
      updateProjectBoqName(projectId, savedBoqId, trimmedName)
      updateProjectBoqItems(projectId, savedBoqId, pendingBoqItems)
      syncRateBuildUpFromBoq(projectId)
      setStatus(`Saved "${trimmedName}". Rate build up uses these BOQ descriptions for Daily Cost and Daily Production.`)
      resetPending()
      onUploaded?.()
      return
    }

    addProjectBoq(projectId, {
      name: trimmedName,
      fileName: pendingUpload.fileName,
      items: pendingBoqItems,
    })
    syncRateBuildUpFromBoq(projectId)

    setStatus(`Added "${trimmedName}" with ${pendingBoqItems.length} BOQ items.`)
    resetPending()
    onUploaded?.()
  }

  const handleBoqSave = (items) => {
    if (!viewBoq) return

    if (viewBoq.id === "preview") {
      setPendingUpload((current) => (current ? { ...current, items } : current))
      setViewBoq((current) => (current ? { ...current, items: applyRateBuildUpRates(projectId, items) } : null))
      if (savedBoqId) {
        updateProjectBoqItems(projectId, savedBoqId, items)
        syncRateBuildUpFromBoq(projectId)
        setListRevision((current) => current + 1)
        onUploaded?.()
      }
      setStatus(`Updated BOQ (${items.length} item${items.length === 1 ? "" : "s"}). Rate build up follows these rows.`)
      return
    }

    updateProjectBoqItems(projectId, viewBoq.id, items)
    syncRateBuildUpFromBoq(projectId)
    setViewBoq((current) =>
      current ? { ...current, items: applyRateBuildUpRates(projectId, items) } : null
    )
    setListRevision((current) => current + 1)
    setStatus(
      `Saved "${viewBoq.name}" (${items.length} item${items.length === 1 ? "" : "s"}). Rate build up and BOQ-linked pages updated.`
    )
    onUploaded?.()
  }

  const handleRemoveBoq = (boq) => {
    const confirmed = window.confirm(
      `Remove "${boq.name}" from this project? Its rate analysis report will be deleted.`
    )

    if (!confirmed) return

    // Snapshot this project's rate build-up before BOQ removal so re-upload restores cells.
    Promise.resolve(
      rememberRateBuildUpRows(projectId, readActualCostAnalysisRows(projectId))
    ).catch(() => {})

    const removed = removeProjectBoq(projectId, boq.id)
    if (!removed) {
      setStatus(`Could not find "${boq.name}" to remove. Refresh the page and try again.`)
      return
    }

    syncRateBuildUpFromBoq(projectId)

    if (viewBoq?.id === boq.id) {
      setViewBoq(null)
    }
    if (savedBoqId === boq.id) {
      resetPending()
    }

    setListRevision((current) => current + 1)
    setStatus(`Removed "${boq.name}".`)
    onUploaded?.()
  }

  const handleViewBoqPdf = async (boq) => {
    const { openBoqPdf } = await import("@/lib/boqPdf")
    openBoqPdf({ projectName, boq: templateBoq(projectId, boq) })
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-200 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
              Upload a BOQ
            </h2>
            <p className="mt-1 text-sm text-emerald-950/80">
              Upload a bill of quantities as PDF or Excel. The app reads bill number, description, unit, and
              BOQ quantity. Enter daily production separately in Rate build up.
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
                        onClick={() => setViewBoq(templateBoq(projectId, boq))}
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
              accept=".pdf,.xlsx,.xls,.csv,application/pdf"
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
              {isUploading ? "Reading BOQ…" : "Upload PDF or Excel"}
            </button>
          </div>
        </div>

        {pendingUpload ? (
          <div className="space-y-3 border-b border-emerald-200 px-6 py-4">
            <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white">
              <div className="border-b border-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-950">
                BOQ template
              </div>
              <p className="border-b border-emerald-100 px-3 py-2 text-xs text-emerald-900/80">
                Uploaded values are bill number, description, unit, and BOQ quantity. Rates come from Rate
                build up; Bill cost = bill rate × BOQ quantity.
              </p>
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-emerald-50 text-left">
                      <th className="border-b border-emerald-100 px-3 py-2 font-semibold text-emerald-950">
                        Bill No.
                      </th>
                      <th className="border-b border-emerald-100 px-3 py-2 font-semibold text-emerald-950">
                        Description
                      </th>
                      <th className="border-b border-emerald-100 px-3 py-2 font-semibold text-emerald-950">
                        Unit
                      </th>
                      <th className="border-b border-emerald-100 px-3 py-2 text-right font-semibold text-emerald-950">
                        Quantity
                      </th>
                      <th className="border-b border-emerald-100 px-3 py-2 text-right font-semibold text-emerald-950">
                        Allowable rate
                      </th>
                      <th className="border-b border-emerald-100 px-3 py-2 text-right font-semibold text-emerald-950">
                        Bill rate
                      </th>
                      <th className="border-b border-emerald-100 px-3 py-2 text-right font-semibold text-emerald-950">
                        Bill cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applyRateBuildUpRates(projectId, pendingBoqItems).map((item) => (
                      <tr key={item.id}>
                        <td className="border-b border-emerald-50 px-3 py-2 tabular-nums text-zinc-900">
                          {item.itemNo || "—"}
                        </td>
                        <td className="whitespace-pre-wrap border-b border-emerald-50 px-3 py-2 text-zinc-900">{item.itemName}</td>
                        <td className="border-b border-emerald-50 px-3 py-2 text-zinc-700">{item.unit || "—"}</td>
                        <td className="border-b border-emerald-50 px-3 py-2 text-right tabular-nums text-zinc-900">
                          {item.quantity == null || item.quantity === "" ? "—" : item.quantity}
                        </td>
                        <td className="border-b border-emerald-50 px-3 py-2 text-right tabular-nums text-zinc-900">
                          {formatBoqRate(item.allowableRate)}
                        </td>
                        <td className="border-b border-emerald-50 px-3 py-2 text-right tabular-nums text-zinc-900">
                          {formatBoqRate(item.billRate)}
                        </td>
                        <td className="border-b border-emerald-50 px-3 py-2 text-right tabular-nums font-semibold text-zinc-900">
                          {formatBoqRate(item.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                    templateBoq(
                      projectId,
                      buildPreviewBoq({
                        name: boqName,
                        fileName: pendingUpload.fileName,
                        items: pendingBoqItems,
                      })
                    )
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
                      items: pendingBoqItems,
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
                  setStatus("The BOQ stays on this project. Use Remove BOQ if you do not want it.")
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
