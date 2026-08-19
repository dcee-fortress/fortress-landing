"use client"

import {
  calculateDailyPlantCost,
  calculateFuelCost,
  formatPlantCost,
  parsePlantCostAmount,
} from "@/lib/plantCostData"

const ENTRY_HEADERS = [
  "Date",
  "Name of equipment",
  "Fuel allocated",
  "Fuel price",
  "Fuel cost",
  "Plant hire cost",
  "Daily plant cost",
  "Production",
]

function TextInput({ value, onChange, placeholder, type = "text", align = "left" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full min-w-[110px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 ${
        align === "right" ? "text-right tabular-nums" : ""
      }`}
    />
  )
}

export default function PlantCostEntryTable({
  rows,
  onRowsChange,
  onAddRow,
  onSavedMessageClear,
}) {
  const updateRow = (rowId, field, value) => {
    onSavedMessageClear?.()
    onRowsChange(
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    )
  }

  const removeRow = (rowId) => {
    onSavedMessageClear?.()
    onRowsChange(rows.filter((row) => row.id !== rowId))
  }

  const addRow = () => {
    onSavedMessageClear?.()
    onAddRow()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Enter fuel allocated, fuel price, plant hire cost, and production. Fuel cost and daily
          plant cost calculate automatically. Daily rate on the report is daily plant cost ÷
          production.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Add entry
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              {ENTRY_HEADERS.map((header) => (
                <th
                  key={header}
                  className={`border border-zinc-200 px-3 py-2 font-semibold text-zinc-700 ${
                    header === "Date" || header === "Name of equipment"
                      ? "text-left"
                      : "text-right"
                  }`}
                >
                  {header}
                </th>
              ))}
              <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const fuelCost = calculateFuelCost(row.fuelAllocated, row.fuelPrice)
                const parsedPlantHireCost = parsePlantCostAmount(row.plantHireCost)
                const dailyPlantCost = calculateDailyPlantCost(fuelCost, parsedPlantHireCost)

                return (
                  <tr key={row.id} className="bg-white">
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.date}
                        onChange={(value) => updateRow(row.id, "date", value)}
                        placeholder="Date"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.equipmentName}
                        onChange={(value) => updateRow(row.id, "equipmentName", value)}
                        placeholder="Plant name"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.fuelAllocated}
                        onChange={(value) => updateRow(row.id, "fuelAllocated", value)}
                        placeholder="0.00"
                        type="number"
                        align="right"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.fuelPrice}
                        onChange={(value) => updateRow(row.id, "fuelPrice", value)}
                        placeholder="0.00"
                        type="number"
                        align="right"
                      />
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 text-right font-medium tabular-nums text-zinc-900">
                      {formatPlantCost(fuelCost)}
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.plantHireCost ?? ""}
                        onChange={(value) => updateRow(row.id, "plantHireCost", value)}
                        placeholder="0.00"
                        type="number"
                        align="right"
                      />
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 text-right font-semibold tabular-nums text-zinc-900">
                      {formatPlantCost(dailyPlantCost)}
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">
                      <TextInput
                        value={row.production}
                        onChange={(value) => updateRow(row.id, "production", value)}
                        placeholder="0.00"
                        type="number"
                        align="right"
                      />
                    </td>
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
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={ENTRY_HEADERS.length + 1}
                  className="border border-zinc-200 px-6 py-10 text-center text-zinc-500"
                >
                  Awaiting entry — add plant cost and production rows, then save.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
