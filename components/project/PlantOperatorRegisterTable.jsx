"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import TableCellInput from "@/components/project/TableCellInput"
import TableExportButtons from "@/components/project/TableExportButtons"
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

/** Sticky left identity cells; header row also sticks to the top like Rate build-up. */
function stickyIdentityStyle(index, { background, isHeader = false } = {}) {
  return {
    position: "sticky",
    left: IDENTITY_LEFT[index],
    top: isHeader ? 0 : undefined,
    width: IDENTITY_COLUMNS[index].width,
    minWidth: IDENTITY_COLUMNS[index].width,
    maxWidth: IDENTITY_COLUMNS[index].width,
    zIndex: isHeader ? 40 - index : 20 - index,
    background,
  }
}

function AttendanceCell({ day, value, onCycle }) {
  const label =
    value === "present" ? `Day ${day} present` : value === "absent" ? `Day ${day} absent` : `Day ${day} not marked`

  return (
    <button
      type="button"
      data-day={day}
      aria-label={label}
      title={`Day ${day}. Click once for a tick. Click again for an X.`}
      onClick={(event) => onCycle(Number(event.currentTarget.dataset.day))}
      className={`flex h-12 w-full min-w-[2.75rem] flex-col items-center justify-center rounded-md border text-sm font-bold leading-none transition hover:border-zinc-400 ${
        value === "present"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : value === "absent"
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600"
      }`}
    >
      <span className="text-[10px] font-semibold leading-none text-zinc-500">{day}</span>
      <span className="mt-1 text-base leading-none">
        {value === "present" ? "✓" : value === "absent" ? "X" : ""}
      </span>
    </button>
  )
}

export default function PlantOperatorRegisterTable({ projectId, projectName, monthId }) {
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

  const setAttendance = (rowId, day) => {
    const current = registerRef.current
    const key = String(day)
    persist(
      {
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) return row
          const nextValue = row.attendance?.[key] === "present" ? "absent" : "present"
          return {
            ...row,
            attendance: {
              ...row.attendance,
              [key]: nextValue,
            },
          }
        }),
      },
      { immediate: true }
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

  const exportColumns = [
    ...IDENTITY_COLUMNS.map((column) => ({
      key: column.field,
      label: column.label,
      align: "left",
      kind: "text",
    })),
    ...dayNumbers.map((day) => ({
      key: `day-${day}`,
      label: String(day),
      align: "center",
      kind: "text",
      total: false,
    })),
  ]

  const exportRows = (register.rows ?? []).map((row) => {
    const next = {
      supplier: row.supplier,
      plant: row.plant,
      operatorName: row.operatorName,
      plantNumber: row.plantNumber,
    }
    for (const day of dayNumbers) {
      const mark = row.attendance?.[String(day)]
      next[`day-${day}`] = mark === "present" ? "✓" : mark === "absent" ? "X" : ""
    }
    return next
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Add an operator, then use the day boxes beside their name.{" "}
          <span className="font-semibold text-emerald-700">Click once for ✓</span>.{" "}
          <span className="font-semibold text-rose-700">Click again for X</span>. The next click
          is a tick again. Supplier, plant name, operator, plant number, and the day headings stay
          fixed while you scroll.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TableExportButtons
            columns={exportColumns}
            rows={exportRows}
            title={`Plant register · ${monthName}`}
            projectName={projectName || "Project"}
            filename={`plant-register-${monthId}`}
            showTotal={false}
          />
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Add operator row
          </button>
        </div>
      </div>

      <div ref={daysScrollRef} className="operator-register-scroll">
        <table className="operator-register-table min-w-max text-sm">
          <thead>
            <tr className="bg-zinc-900 text-white">
              {IDENTITY_COLUMNS.map((column, index) => (
                <th
                  key={column.field}
                  style={stickyIdentityStyle(index, { background: "#18181b", isHeader: true })}
                  className="operator-register-sticky operator-register-sticky-head border border-zinc-700 px-2 py-2.5 text-left font-semibold shadow-[2px_0_0_0_#3f3f46]"
                >
                  {column.label}
                </th>
              ))}
              {dayNumbers.map((day) => (
                <th
                  key={day}
                  className="operator-register-sticky-head min-w-[2.75rem] border border-zinc-700 px-1 py-2.5 text-center text-xs font-semibold"
                >
                  {day}
                </th>
              ))}
              <th className="operator-register-sticky-head border border-zinc-700 px-3 py-2.5 text-left font-semibold">
                {" "}
              </th>
            </tr>
          </thead>
          <tbody>
            {register.rows.length > 0 ? (
              register.rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  {IDENTITY_COLUMNS.map((column, index) => (
                    <td
                      key={column.field}
                      style={stickyIdentityStyle(index, { background: "#ffffff" })}
                      className="operator-register-sticky border border-zinc-200 px-2 py-2 shadow-[2px_0_0_0_#e4e4e7]"
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
                    <td key={`${row.id}-day-${day}`} className="min-w-[2.75rem] border border-zinc-200 p-1 text-center">
                      <AttendanceCell
                        day={day}
                        value={row.attendance?.[String(day)] ?? null}
                        onCycle={(clickedDay) => setAttendance(row.id, clickedDay)}
                      />
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
