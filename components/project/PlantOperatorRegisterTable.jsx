"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import TableCellInput from "@/components/project/TableCellInput"
import {
  createEmptyRegisterRow,
  ensurePlantOperatorRegistersExist,
  getMonthRegisterMeta,
  getPlantOperatorRegisterData,
  savePlantOperatorRegisterData,
} from "@/lib/plantOperatorRegisterData"

const IDENTITY_COLUMNS = [
  { field: "supplier", label: "Supplier", placeholder: "Supplier", width: 148 },
  { field: "plant", label: "Plant name", placeholder: "Plant name", width: 148 },
  { field: "operatorName", label: "Operator", placeholder: "Operator", width: 148 },
  { field: "plantNumber", label: "Plant number", placeholder: "Plant number", width: 132 },
]

const IDENTITY_LEFT = IDENTITY_COLUMNS.reduce((offsets, column, index) => {
  offsets.push(index === 0 ? 0 : offsets[index - 1] + IDENTITY_COLUMNS[index - 1].width)
  return offsets
}, [])

function stickyStyle(index, background) {
  return {
    position: "sticky",
    left: IDENTITY_LEFT[index],
    width: IDENTITY_COLUMNS[index].width,
    minWidth: IDENTITY_COLUMNS[index].width,
    maxWidth: IDENTITY_COLUMNS[index].width,
    zIndex: 40 - index,
    background,
  }
}

function AttendanceCell({ value, onPresent, onAbsent }) {
  const clickTimerRef = useRef(0)
  const label =
    value === "present" ? "Present" : value === "absent" ? "Absent" : "Not marked"

  useEffect(() => {
    return () => window.clearTimeout(clickTimerRef.current)
  }, [])

  return (
    <button
      type="button"
      aria-label={label}
      title="Click for present. Double-click for absent (X)."
      onClick={(event) => {
        window.clearTimeout(clickTimerRef.current)
        if (event.detail >= 2) {
          onAbsent()
          return
        }
        clickTimerRef.current = window.setTimeout(() => {
          onPresent()
        }, 280)
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold leading-none transition hover:border-zinc-400 ${
        value === "present"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : value === "absent"
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-zinc-200 bg-white text-zinc-300 hover:text-zinc-500"
      }`}
    >
      {value === "present" ? "✓" : value === "absent" ? "X" : ""}
    </button>
  )
}

export default function PlantOperatorRegisterTable({ projectId, monthId }) {
  const { refresh, version } = useProjectData()
  const { daysInMonth, monthName } = getMonthRegisterMeta(monthId)
  const [register, setRegister] = useState(() => getPlantOperatorRegisterData(projectId, monthId))
  const registerRef = useRef(register)
  const editingCountRef = useRef(0)
  const saveTimerRef = useRef(0)
  const daysScrollRef = useRef(null)

  const loadRegister = useCallback(() => {
    if (editingCountRef.current > 0) return
    ensurePlantOperatorRegistersExist(projectId)
    const next = getPlantOperatorRegisterData(projectId, monthId)
    const current = registerRef.current
    // Don't let a stale reload wipe rows that were just added locally.
    if ((current?.rows?.length ?? 0) > (next?.rows?.length ?? 0)) {
      return
    }
    registerRef.current = next
    setRegister(next)
  }, [projectId, monthId])

  useEffect(() => {
    loadRegister()
  }, [loadRegister, version])

  useEffect(() => {
    return () => window.clearTimeout(saveTimerRef.current)
  }, [])

  const persist = useCallback(
    (nextRegister, { refreshAfter = false, immediate = false } = {}) => {
      registerRef.current = nextRegister
      setRegister(nextRegister)

      const write = () => {
        savePlantOperatorRegisterData(projectId, monthId, registerRef.current)
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
    savePlantOperatorRegisterData(projectId, monthId, registerRef.current)
  }

  const updateRow = (rowId, field, value) => {
    const current = registerRef.current
    persist({
      ...current,
      rows: current.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    })
  }

  const setAttendance = (rowId, day, nextValue) => {
    const current = registerRef.current
    persist(
      {
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) return row
          return {
            ...row,
            attendance: {
              ...row.attendance,
              [String(day)]: nextValue,
            },
          }
        }),
      },
      { refreshAfter: true, immediate: true }
    )
  }

  const addRow = () => {
    const current = registerRef.current ?? getPlantOperatorRegisterData(projectId, monthId)
    const nextRegister = {
      ...current,
      rows: [...(current.rows ?? []), createEmptyRegisterRow(daysInMonth)],
    }
    registerRef.current = nextRegister
    setRegister(nextRegister)
    savePlantOperatorRegisterData(projectId, monthId, nextRegister)
    window.requestAnimationFrame(() => {
      daysScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" })
    })
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

  const dayNumbers = Array.from({ length: daysInMonth }, (_, index) => index + 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Add an operator, then use the day boxes beside their name.{" "}
          <span className="font-semibold text-emerald-700">Click ✓</span> for present.{" "}
          <span className="font-semibold text-rose-700">Double-click X</span> for absent.
          Scroll sideways to see every day of {monthName}.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Add operator row
        </button>
      </div>

      <div ref={daysScrollRef} className="operator-register-scroll">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              {IDENTITY_COLUMNS.map((column, index) => (
                <th
                  key={column.field}
                  rowSpan={2}
                  style={stickyStyle(index, "#fafafa")}
                  className="operator-register-sticky border border-zinc-200 px-2 py-2 text-left font-semibold text-zinc-800 shadow-[1px_0_0_0_#e4e4e7]"
                >
                  {column.label}
                </th>
              ))}
              <th
                colSpan={daysInMonth}
                className="border border-zinc-200 bg-zinc-100 px-3 py-2 text-center text-sm font-semibold tracking-wide text-zinc-800"
              >
                {monthName}
              </th>
              <th
                rowSpan={2}
                className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-800"
              >
                {" "}
              </th>
            </tr>
            <tr className="bg-zinc-50">
              {dayNumbers.map((day) => (
                <th
                  key={day}
                  className="min-w-[2.75rem] border border-zinc-200 px-1 py-2 text-center text-xs font-semibold text-zinc-600"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {register.rows.length > 0 ? (
              register.rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  {IDENTITY_COLUMNS.map((column, index) => (
                    <td
                      key={column.field}
                      style={stickyStyle(index, "#ffffff")}
                      className="operator-register-sticky border border-zinc-200 px-2 py-2 shadow-[1px_0_0_0_#e4e4e7]"
                    >
                      <TableCellInput
                        value={row[column.field]}
                        onChange={(value) => updateRow(row.id, column.field, value)}
                        placeholder={column.placeholder}
                        onFocus={beginEdit}
                        onBlur={endEdit}
                      />
                    </td>
                  ))}
                  {dayNumbers.map((day) => (
                    <td key={day} className="min-w-[2.75rem] border border-zinc-200 px-1 py-1 text-center">
                      <div className="flex justify-center">
                        <AttendanceCell
                          value={row.attendance[String(day)]}
                          onPresent={() => setAttendance(row.id, day, "present")}
                          onAbsent={() => setAttendance(row.id, day, "absent")}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="border border-zinc-200 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-sm font-medium text-rose-600 transition hover:text-rose-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={daysInMonth + 5}
                  className="border border-zinc-200 px-6 py-10 text-center text-zinc-500"
                >
                  Click &quot;Add operator row&quot; to create a supplier and operator. Tick boxes
                  for {monthName} appear on the same row.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
