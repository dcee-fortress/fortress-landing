import { getSlotsForDay } from "@/lib/projectData"
import { getMaterialScheduleRows, MATERIAL_SCHEDULE_TYPES } from "@/lib/materialSchedule"
import { keywordScore, tokenize } from "@/lib/textMatch"

export { keywordScore, tokenize } from "@/lib/textMatch"

export function collectMaterialScheduleEntries(projectId, dayIds) {
  const entries = []

  for (const dayId of dayIds) {
    for (const slot of getSlotsForDay(projectId, dayId)) {
      for (const scheduleType of Object.keys(MATERIAL_SCHEDULE_TYPES)) {
        for (const row of getMaterialScheduleRows(projectId, dayId, slot.id, scheduleType)) {
          if (
            !row.plantName?.trim() &&
            !row.activityDescription?.trim()
          ) {
            continue
          }

          entries.push({
            dayId,
            slotId: slot.id,
            scheduleType,
            description: row.activityDescription?.trim() || "",
            materialEquipment: row.plantName?.trim() || "",
            activityDone: row.activityDescription?.trim() || "",
          })
        }
      }
    }
  }

  return entries
}

export function resolveActivityOnSiteForPlant(projectId, dayIds, plantName) {
  const entries = collectMaterialScheduleEntries(projectId, dayIds)
  const activities = new Set()

  for (const entry of entries) {
    const equipmentScore = keywordScore(plantName, entry.materialEquipment)
    const activityScore = keywordScore(plantName, entry.activityDone)

    if (equipmentScore >= 0.2 || activityScore >= 0.2) {
      activities.add(entry.activityDone || entry.description)
    }
  }

  if (activities.size === 0) {
    return "—"
  }

  return [...activities].join(", ")
}

export function enrichRateAnalysisWithActivity(projectId, dayIds, analysis) {
  return {
    ...analysis,
    rows: analysis.rows.map((row) => ({
      ...row,
      activityOnSite: resolveActivityOnSiteForPlant(projectId, dayIds, row.plantName),
    })),
  }
}
