"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import TableCellInput from "@/components/project/TableCellInput"
import {
  INDUCTION_REGISTER_COLUMNS,
  createEmptyInductionRow,
  ensureInductionRegistersExist,
  getInductionRegisterData,
  saveInductionRegisterData,
} from "@/lib/inductionRegisterData"

export default function InductionRegisterTable({ projectId, monthId }) {
  const { refresh, version } = useProjectData()
  const [register, setRegister] = useState(() => getInductionRegisterData(projectId, monthId))
  const registerRef = useRef(register)
  const editingCountRef = useRef(0)
  const saveTimerRef = useRef(0)

  const loadRegister = useCallback(() => {
    if (editingCountRef.current > 0) return
    ensureInductionRegistersExist(projectId)
    const next = getInductionRegisterData(projectId, monthId)
    const current = registerRef.current
    if ((current?.rows?.length ?? 0) > (next?.rows?.length ?? 0)) return
    registerRef.current = next
    setRegister(next)
  }, [projectId, monthId])

  useEffect(() => {
    loadRegister()
  }, [loadRegister])

  useEffect(() => {
    if (editingCountRef.current > 0) return
    const next = getInductionRegisterData(projectId, monthId)
    const current = registerRef.current
    if (JSON.stringify(current?.rows) === JSON.stringify(next?.rows)) return
    if ((current?.rows?.length ?? 0) > (next?.rows?.length ?? 0)) return
    registerRef.current = next
    setRegister(next)
  }, [version, projectId, monthId])

  useEffect(() => {
    return () => window.clearTimeout(saveTimerRef.current)
  }, [])

  const persist = useCallback(
    (nextRegister, { refreshAfter = false, immediate = false } = {}) => {
      registerRef.current = nextRegister
      setRegister(nextRegister)

      const write = () => {
        saveInductionRegisterData(projectId, monthId, registerRef.current)
        if (refreshAfter && editingCountRef.current === 0) refresh()
      }

      window.clearTimeout(saveTimerRef.current)
      if (immediate) {
        write()
        return
      }

      saveTimerRef.current = window.setTimeout(write, 400)
    },
    [projectId, monthId, refresh]
  )

  const beginEdit = () => {
    editingCountRef.current += 1
  }

  const endEdit = () => {
    editingCountRef.current = Math.max(0, editingCountRef.current - 1)
    window.clearTimeout(saveTimerRef.current)
    saveInductionRegisterData(projectId, monthId, registerRef.current)
  }

  const updateRow = (rowId, field, value) => {
    const current = registerRef.current
    persist({
      ...current,
      rows: current.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    })
  }

  const addRow = () => {
    const current = registerRef.current ?? getInductionRegisterData(projectId, monthId)
    const nextRegister = {
      ...current,
      rows: [...(current.rows ?? []), createEmptyInductionRow()],
    }
    registerRef.current = nextRegister
    setRegister(nextRegister)
    saveInductionRegisterData(projectId, monthId, nextRegister)
  }

  const removeRow = (rowId) => {
    const current = registerRef.current
    persist(
      {
        ...current,
        rows: current.rows.filter((row) => row.id !== rowId),
      },
      { refreshAfter: true, immediate: true }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Enter each person&apos;s details. Add rows as needed — changes save automatically.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Add row
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              {INDUCTION_REGISTER_COLUMNS.map((column) => (
                <th
                  key={column.field}
                  className="border-b border-zinc-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600"
                >
                  {column.label}
                </th>
              ))}
              <th className="border-b border-zinc-200 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Remove
              </th>
            </tr>
          </thead>
          <tbody>
            {(register?.rows ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={INDUCTION_REGISTER_COLUMNS.length + 1}
                  className="px-3 py-10 text-center text-zinc-500"
                >
                  No induction entries yet. Click Add row to start this month&apos;s register.
                </td>
              </tr>
            ) : (
              register.rows.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-zinc-50/80">
                  {INDUCTION_REGISTER_COLUMNS.map((column) => (
                    <td key={column.field} className="border-t border-zinc-100 px-2 py-1.5">
                      <TableCellInput
                        value={row[column.field] ?? ""}
                        placeholder={column.placeholder}
                        onFocus={beginEdit}
                        onBlur={endEdit}
                        onChange={(value) => updateRow(row.id, column.field, value)}
                        className="w-full min-w-[8rem] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:bg-white"
                      />
                    </td>
                  ))}
                  <td className="border-t border-zinc-100 px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-xs font-medium text-rose-600 transition hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
