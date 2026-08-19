import { DAILY_SLOT_TEMPLATES } from "@/lib/dailySlots"
import {
  ACTUAL_COST_SCHEDULE_TYPE,
  readRawMaterialScheduleRows,
} from "@/lib/materialSchedule"

export function getMaterialSchedulePlantNamesForDay(projectId, dayId) {
  if (typeof window === "undefined") return []

  const names = []
  const seen = new Set()

  for (const slot of DAILY_SLOT_TEMPLATES) {
    const rows = readRawMaterialScheduleRows(
      projectId,
      dayId,
      slot.id,
      ACTUAL_COST_SCHEDULE_TYPE
    )

    for (const row of rows) {
      const plantName = String(row.plantName ?? "").trim()
      if (!plantName) continue

      const key = plantName.toLowerCase()
      if (seen.has(key)) continue

      seen.add(key)
      names.push(plantName)
    }
  }

  return names
}

export function resolveEquipmentPlantName(projectId, dayId, registerItem, index, storedEntry = {}) {
  if (storedEntry.plantEdited && String(storedEntry.plant ?? "").trim()) {
    return String(storedEntry.plant).trim()
  }

  const schedulePlants = getMaterialSchedulePlantNamesForDay(projectId, dayId)
  const registerPlant = String(registerItem.plant ?? "").trim()

  if (registerPlant) {
    const match = schedulePlants.find(
      (plantName) => plantName.toLowerCase() === registerPlant.toLowerCase()
    )
    if (match) return match
  }

  const plantNumber = String(registerItem.plantNumber ?? "").trim()
  if (plantNumber) {
    const match = schedulePlants.find((plantName) =>
      plantName.toLowerCase().includes(plantNumber.toLowerCase())
    )
    if (match) return match
  }

  if (schedulePlants[index]) {
    return schedulePlants[index]
  }

  if (schedulePlants.length === 1) {
    return schedulePlants[0]
  }

  return registerPlant
}
