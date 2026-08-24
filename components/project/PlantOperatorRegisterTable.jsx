"use client"

import { useCallback, useEffect, useState } from "react"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  createEmptyRegisterRow,
  cycleAttendanceValue,
  ensurePlantOperatorRegistersExist,
  getMonthRegisterMeta,
  getPlantOperatorRegisterData,
  savePlantOperatorRegisterData,
} from "@/lib/plantOperatorRegisterData"

function AttendanceCell({ value, onToggle }) {
  const label =
    value === "present" ? "Present" : value === "absent" ? "Absent" : "Not marked"

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold transition hover:border-zinc-400 ${
        value === "present"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : value === "absent"
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-zinc-200 bg-white text-zinc-300 hover:text-zinc-500"
      }`}
    >
      {value === "present" ? "✓" : value === "absent" ? "✗" : "·"}
    </button>
  )
}

function RegisterTextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full min-w-[120px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
    />
  )
}

export default function PlantOperatorRegisterTable({ projectId, monthId }) {
  const { refresh } = useProjectData()
  const { daysInMonth, monthName } = getMonthRegisterMeta(monthId)
  const [register, setRegister] = useState(() => getPlantOperatorRegisterData(projectId, monthId))

  useEffect(() => {
    ensurePlantOperatorRegistersExist(projectId)
    setRegister(getPlantOperatorRegisterData(projectId, monthId))
  }, [projectId, monthId])

  const persist = useCallback(
    (nextRegister) => {
      setRegister(nextRegister)
      savePlantOperatorRegisterData(projectId, monthId, nextRegister)
      refresh()
    },
    [projectId, monthId, refresh]
  )

  const updateRow = (rowId, field, value) => {
    persist({
      ...register,
      rows: register.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    })
  }

  const toggleAttendance = (rowId, day) => {
    persist({
      ...register,
      rows: register.rows.map((row) => {
        if (row.id !== rowId) return row
        const key = String(day)
        return {
          ...row,
          attendance: {
            ...row.attendance,
            [key]: cycleAttendanceValue(row.attendance[key]),
          },
        }
      }),
    })
  }

  const addRow = () => {
    persist({
      ...register,
      rows: [...register.rows, createEmptyRegisterRow(daysInMonth)],
    })
  }

  const removeRow = (rowId) => {
    persist({
      ...register,
      rows: register.rows.filter((row) => row.id !== rowId),
    })
  }

  const dayNumbers = Array.from({ length: daysInMonth }, (_, index) => index + 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Tick <span className="font-semibold text-emerald-700">✓</span> when present, mark{" "}
          <span className="font-semibold text-rose-700">✗</span> when absent. Click a day box to
          cycle through empty, present, and absent.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Add operator row
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 border border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-700"
              >
                Supplier
              </th>
              <th
                rowSpan={2}
                className="sticky left-[140px] z-20 border border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-700"
              >
                Plant
              </th>
              <th
                rowSpan={2}
                className="sticky left-[280px] z-20 border border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-700"
              >
                Plant number
              </th>
              <th
                rowSpan={2}
                className="sticky left-[420px] z-20 border border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-700"
              >
                Operator&apos;s name
              </th>
              <th
                colSpan={daysInMonth}
                className="border border-zinc-200 px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide text-zinc-700"
              >
                {monthName}
              </th>
              <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Actions
              </th>
            </tr>
            <tr className="bg-zinc-50">
              {dayNumbers.map((day) => (
                <th
                  key={day}
                  className="min-w-[44px] border border-zinc-200 px-1 py-2 text-center text-xs font-semibold text-zinc-600"
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
                  <td className="sticky left-0 z-10 border border-zinc-200 bg-white px-2 py-2">
                    <RegisterTextInput
                      value={row.supplier}
                      onChange={(value) => updateRow(row.id, "supplier", value)}
                      placeholder="Supplier"
                    />
                  </td>
                  <td className="sticky left-[140px] z-10 border border-zinc-200 bg-white px-2 py-2">
                    <RegisterTextInput
                      value={row.plant}
                      onChange={(value) => updateRow(row.id, "plant", value)}
                      placeholder="Plant"
                    />
                  </td>
                  <td className="sticky left-[280px] z-10 border border-zinc-200 bg-white px-2 py-2">
                    <RegisterTextInput
                      value={row.plantNumber}
                      onChange={(value) => updateRow(row.id, "plantNumber", value)}
                      placeholder="Plant number"
                    />
                  </td>
                  <td className="sticky left-[420px] z-10 border border-zinc-200 bg-white px-2 py-2">
                    <RegisterTextInput
                      value={row.operatorName}
                      onChange={(value) => updateRow(row.id, "operatorName", value)}
                      placeholder="Operator's name"
                    />
                  </td>
                  {dayNumbers.map((day) => (
                    <td key={day} className="border border-zinc-200 px-1 py-1 text-center">
                      <div className="flex justify-center">
                        <AttendanceCell
                          value={row.attendance[String(day)]}
                          onToggle={() => toggleAttendance(row.id, day)}
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
                  No operators added yet. Click &quot;Add operator row&quot; to start recording
                  attendance for {monthName}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
