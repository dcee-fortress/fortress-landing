"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import CellHoverCard, { useCellHoverCard } from "@/components/project/CellHoverCard"
import FormulaAmountInput, { resolveFormulaAmount } from "@/components/project/FormulaAmountInput"
import MemoryTextInput from "@/components/project/MemoryTextInput"
import { useProjects } from "@/components/project/ProjectsProvider"
import { buildCellHistory, searchCellHistory } from "@/lib/cellHistory"
import SiteCameraCapture from "@/components/project/SiteCameraCapture"
import {
  CASH_BOOK_COLUMNS,
  DEFAULT_VAT_RATE,
  formatCashBookDate,
  formatVatDescription,
  parseVatRate,
} from "@/lib/cashBook"
import { getCashBook } from "@/lib/cashBooks"
import {
  formatMaterialCurrencyAmount,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"
import {
  PROGRESS_PHOTO_ACCEPT,
  dedupeProgressPhotos,
  downloadProgressPhoto,
  getProgressPhotoSrc,
  hydrateProgressPhotos,
  openPhotoInNewTab,
  persistProgressPhotos,
  prepareProgressPhoto,
  removeStoredProgressPhoto,
  toPhotoMetadata,
} from "@/lib/progressReportPhotos"
import { isFormula } from "@/lib/materialScheduleFormulas"
import { getCashBookDailyFileHref } from "@/lib/projectRoutes"
import { getDailyFile } from "@/lib/projectFiles"

function formatInputAmount(value) {
  if (value === "" || value === null || value === undefined) return ""
  const parsed = parsePlantCostAmount(value)
  if (parsed === null) return String(value)
  return String(parsed)
}

const HOVER_LABELS = CASH_BOOK_COLUMNS.map((column) =>
  column.key === "date" || column.key === "description" ? null : column.label
)

const CASH_BOOK_MEMORY_KEYS = ["description", "cashIssuedTo", "cashReceived", "amountPaid"]

export default function CashBookEntryView({ projectId, projectName, dayId, bookId }) {
  const book = getCashBook(bookId)
  const {
    createRow,
    getHistoryRows,
    getOpeningBalanceForDay,
    getReceipts,
    getRows,
    isVatRow,
    prepareRows,
    saveReceipts,
    saveRows,
  } = book.data
  const file = getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const [rows, setRows] = useState([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [saveState, setSaveState] = useState("saved")
  const [receipts, setReceipts] = useState([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState("")
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const saveTimerRef = useRef(0)
  const rowsRef = useRef([])
  const hover = useCellHoverCard()
  const { version } = useProjects()

  const savedHistoryRows = useMemo(() => {
    void version
    return getHistoryRows(projectId, dayId)
  }, [dayId, getHistoryRows, projectId, version])

  const history = useMemo(
    () =>
      buildCellHistory(
        [...savedHistoryRows, ...rows.filter((row) => !isVatRow(row))],
        CASH_BOOK_MEMORY_KEYS
      ),
    [isVatRow, rows, savedHistoryRows]
  )

  const suggestFor = (row, key) => (query) =>
    searchCellHistory(history, key, {
      query,
      description: key === "description" ? "" : row.description,
    })
  const photoInputRef = useRef(null)

  const loadRows = useCallback(() => {
    const opening = getOpeningBalanceForDay(projectId, dayId)
    const nextRows = getRows(projectId, dayId)
    setOpeningBalance(opening)
    setRows(
      nextRows.length > 0
        ? nextRows
        : prepareRows([createRow(dayId)], dayId, opening)
    )
  }, [createRow, dayId, getOpeningBalanceForDay, getRows, prepareRows, projectId])

  const loadReceipts = useCallback(async () => {
    const meta = getReceipts(projectId, dayId)
    const hydrated = await hydrateProgressPhotos(meta)
    setReceipts(dedupeProgressPhotos(hydrated))
  }, [dayId, getReceipts, projectId])

  useEffect(() => {
    loadRows()
    void loadReceipts()
  }, [loadRows, loadReceipts])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const persistReceipts = useCallback(
    async (nextReceipts) => {
      setSaveState("saving")
      try {
        await saveReceipts(
          projectId,
          dayId,
          nextReceipts.map(toPhotoMetadata)
        )
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [dayId, projectId, saveReceipts]
  )

  const addReceiptPhotos = async (files) => {
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

      const uploaded = await persistProgressPhotos(prepared)

      const next = dedupeProgressPhotos([...receipts, ...uploaded])
      setReceipts(next)
      await persistReceipts(next)

      if (failures.length > 0) {
        setPhotoUploadError(
          `Added ${uploaded.length} photo${uploaded.length === 1 ? "" : "s"}. ${failures.length} could not be read.`
        )
      }
      if (uploaded.some((photo) => !photo.url)) {
        setPhotoUploadError(
          "Some photos may only be on this device. Shared object storage upload did not finish."
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
    await addReceiptPhotos(files)
  }

  const handleRemovePhoto = (photoId) => {
    const existing = receipts.find((photo) => photo.id === photoId)
    void removeStoredProgressPhoto(photoId, existing?.url)
    const next = receipts.filter((photo) => photo.id !== photoId)
    setReceipts(next)
    void persistReceipts(next)
    if (viewingPhoto?.id === photoId) {
      setViewingPhoto(null)
    }
  }

  const persist = useCallback(
    async (nextRows) => {
      setSaveState("saving")
      try {
        await saveRows(projectId, dayId, nextRows)
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [dayId, projectId, saveRows]
  )

  const schedulePersist = useCallback(
    (nextRows) => {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = window.setTimeout(() => {
        void persist(nextRows)
      }, 450)
    },
    [persist]
  )

  useEffect(() => {
    const flush = () => {
      window.clearTimeout(saveTimerRef.current)
      void saveRows(projectId, dayId, rowsRef.current)
    }
    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush()
    })
    return () => {
      window.clearTimeout(saveTimerRef.current)
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
    }
  }, [dayId, projectId, saveRows])

  function commitRows(updater, { immediate = false } = {}) {
    setRows((current) => {
      const draft = typeof updater === "function" ? updater(current) : updater
      const next = prepareRows(draft, dayId, openingBalance)
      if (immediate) {
        void persist(next)
      } else {
        schedulePersist(next)
      }
      return next
    })
    setSaveState(immediate ? "saving" : "pending")
  }

  function updateRow(rowId, key, value) {
    commitRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row

        if (isVatRow(row)) {
          if (key === "description" || key === "vatRate") {
            const rate =
              key === "vatRate"
                ? Number(value)
                : parseVatRate({ ...row, description: value, vatRate: null })
            const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_VAT_RATE
            return {
              ...row,
              isVat: true,
              vatRate: safeRate,
              description: formatVatDescription(safeRate),
              cashIssuedTo: "",
              cashReceived: "",
              date: formatCashBookDate(dayId),
            }
          }
          return row
        }

        return {
          ...row,
          [key]: value,
          date: formatCashBookDate(dayId),
        }
      })
    )
  }

  function updateAmountFields(rowId, patch) {
    commitRows((current) =>
      current.map((row) =>
        row.id !== rowId || isVatRow(row)
          ? row
          : { ...row, ...patch, date: formatCashBookDate(dayId) }
      )
    )
  }

  function addRow() {
    commitRows((current) => {
      const nonVat = current.filter((row) => !isVatRow(row))
      const vat = current.find((row) => isVatRow(row))
      const nextNonVat = [...nonVat, createRow(dayId)]
      return vat ? [...nextNonVat, vat] : nextNonVat
    }, { immediate: true })
  }

  function deleteRow(rowId) {
    commitRows((current) => {
      const target = current.find((row) => row.id === rowId)
      if (target && isVatRow(target)) return current
      return current.filter((row) => row.id !== rowId)
    }, { immediate: true })
  }

  const selectedRowIndex = selectedCell
    ? rows.findIndex((row) => row.id === selectedCell.rowId)
    : -1
  const selectedRow = selectedRowIndex >= 0 ? rows[selectedRowIndex] : null
  const selectedColumnLabel = selectedCell
    ? CASH_BOOK_COLUMNS.find((column) => column.key === selectedCell.key)?.label || ""
    : ""
  const selectedFormula = selectedRow
    ? String(selectedRow[`${selectedCell.key}Formula`] ?? "")
    : ""
  const formulaBarValue = selectedRow
    ? selectedFormula || String(selectedRow[selectedCell.key] ?? "")
    : ""
  const selectedResult =
    selectedRow && isFormula(selectedFormula) && String(selectedRow[selectedCell.key] ?? "") !== ""
      ? formatMaterialCurrencyAmount(selectedRow[selectedCell.key])
      : ""

  function updateSelectedCellFromBar(text) {
    if (!selectedRow) return
    const next = resolveFormulaAmount(text)
    updateAmountFields(selectedRow.id, {
      [selectedCell.key]: next.value,
      [`${selectedCell.key}Formula`]: next.formula,
    })
  }

  const closingBalance =
    rows.length > 0 ? rows[rows.length - 1].cashBalance ?? openingBalance : openingBalance
  const vatRow = rows.find((row) => isVatRow(row))
  const vatRate = vatRow ? parseVatRate(vatRow) : DEFAULT_VAT_RATE

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getCashBookDailyFileHref(projectId, book.id, dayId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily dashboard
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {book.label} entry
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          {book.data.withVat
            ? `${dayLabel} · When you start entering rows, a VAT@ ${DEFAULT_VAT_RATE}% row is added automatically. Change the % if needed. Cash balance = cash received − amount paid including VAT.`
            : `${dayLabel} · Cash balance = cash received − amount paid.`}
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{book.label} entry table</h2>
            <p className="text-sm text-zinc-500">
              Each day starts at a {formatMaterialCurrencyAmount(openingBalance)} balance
              {vatRow
                ? ` · VAT rate ${vatRate}% applied to total amount paid`
                : ""}
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "pending"
                ? "Editing…"
                : saveState === "error"
                  ? "Save failed"
                  : "Saved"}
          </p>
        </div>

        <div className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
              {selectedRow ? `${selectedColumnLabel} · Row ${selectedRowIndex + 1}` : "Formula"}
            </span>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="enter"
              aria-label="Formula bar"
              value={formulaBarValue}
              disabled={!selectedRow}
              onChange={(event) => updateSelectedCellFromBar(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
              placeholder="Click a cash received or amount paid cell, then type a number or formula such as =250+120"
              className="min-w-[16rem] flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-zinc-50"
            />
            {selectedResult ? (
              <span className="text-sm font-bold tabular-nums text-zinc-900">
                Result: {selectedResult}
              </span>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {CASH_BOOK_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`border-b border-zinc-200 px-3 py-3 ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="border-b border-zinc-200 px-3 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const vat = isVatRow(row)
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-zinc-100 align-top ${
                      vat ? "bg-amber-50/60" : ""
                    }`}
                    {...hover.bindRow(row.description, HOVER_LABELS)}
                  >
                    <td className="px-3 py-2 text-zinc-700">{formatCashBookDate(dayId)}</td>
                    <td className="px-3 py-2">
                      {vat ? (
                        <div className="flex min-w-[14rem] items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-800">VAT@</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label="VAT percentage"
                            value={formatInputAmount(parseVatRate(row))}
                            onChange={(event) =>
                              updateRow(row.id, "vatRate", event.target.value)
                            }
                            className="w-20 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          />
                          <span className="text-sm font-semibold text-zinc-800">%</span>
                        </div>
                      ) : (
                        <MemoryTextInput
                          multiline
                          rows={2}
                          value={row.description}
                          suggest={suggestFor(row, "description")}
                          onChange={(value) => updateRow(row.id, "description", value)}
                          placeholder="Description of transaction"
                          className="w-full min-w-[14rem] rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/15"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {vat ? (
                        <span className="text-sm text-zinc-400">—</span>
                      ) : (
                        <MemoryTextInput
                          value={row.cashIssuedTo}
                          suggest={suggestFor(row, "cashIssuedTo")}
                          onChange={(value) => updateRow(row.id, "cashIssuedTo", value)}
                          placeholder="Name"
                          className="w-full min-w-[10rem] rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/15"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {vat ? (
                        <span className="block text-right text-sm text-zinc-400">—</span>
                      ) : (
                        <FormulaAmountInput
                          ariaLabel="Cash received"
                          value={row.cashReceived}
                          formula={row.cashReceivedFormula}
                          suggest={suggestFor(row, "cashReceived")}
                          isSelected={
                            selectedCell?.rowId === row.id && selectedCell?.key === "cashReceived"
                          }
                          onSelect={() => setSelectedCell({ rowId: row.id, key: "cashReceived" })}
                          onChange={(value, formula) =>
                            updateAmountFields(row.id, {
                              cashReceived: value,
                              cashReceivedFormula: formula,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {vat ? (
                        <span className="block text-right text-sm font-semibold text-zinc-900">
                          {formatMaterialCurrencyAmount(row.amountPaid)}
                        </span>
                      ) : (
                        <FormulaAmountInput
                          ariaLabel="Amount paid"
                          value={row.amountPaid}
                          formula={row.amountPaidFormula}
                          suggest={suggestFor(row, "amountPaid")}
                          isSelected={
                            selectedCell?.rowId === row.id && selectedCell?.key === "amountPaid"
                          }
                          onSelect={() => setSelectedCell({ rowId: row.id, key: "amountPaid" })}
                          onChange={(value, formula) =>
                            updateAmountFields(row.id, {
                              amountPaid: value,
                              amountPaidFormula: formula,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-zinc-900">
                      {formatMaterialCurrencyAmount(row.cashBalance)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {vat ? (
                        <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                          Auto
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label="Delete row"
                          onClick={() => deleteRow(row.id)}
                          className="inline-flex rounded-md p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Icon name="trash-2" size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 font-semibold text-zinc-900">
                <td className="px-3 py-3" colSpan={5}>
                  Cash balance for this day
                </td>
                <td className="px-3 py-3 text-right">
                  {formatMaterialCurrencyAmount(closingBalance)}
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          </table>
          <CellHoverCard card={hover.card} onClose={hover.close} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            <Icon name="plus" size={16} />
            Add row
          </button>
          <p className="text-xs text-zinc-500">
            Entries save as you type. Cash received and amount paid accept formulas like
            =250+120.{book.data.withVat ? " VAT row cannot be deleted." : ""}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Receipt photos
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Upload {book.name} receipt pictures from your files or photo gallery, or take a live
            photo with the camera.
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

          {receipts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                {receipts.length} receipt photo{receipts.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {receipts.map((photo, index) => (
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
                        src={getProgressPhotoSrc(photo)}
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
            <p className="text-xs text-zinc-500">No receipt photos yet</p>
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
                    src={getProgressPhotoSrc(viewingPhoto)}
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
              await addReceiptPhotos([capturedFile])
            }}
          />
        </div>
      </section>
    </div>
  )
}
