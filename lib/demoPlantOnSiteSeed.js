import { parseDayId, startOfDay } from "@/lib/dailyFiles"
import { shouldSeedLocalDevValuations } from "@/lib/demoMode"
import {
  getDailyEquipmentHoursData,
  saveDailyEquipmentHoursData,
} from "@/lib/equipmentHoursData"
import { getMonthIdForDay, getProjectStartDate } from "@/lib/periodFiles"
import {
  createEmptyRegisterRow,
  ensurePlantOperatorRegistersExist,
  getMonthRegisterMeta,
  getPlantOperatorRegisterData,
  savePlantOperatorRegisterData,
} from "@/lib/plantOperatorRegisterData"
import { getDailyFiles } from "@/lib/projects"

export const DEMO_OPERATOR_ID_PREFIX = "demo-operator-"

export const DEMO_OPERATOR_FLEET = [
  {
    id: `${DEMO_OPERATOR_ID_PREFIX}ex-01`,
    supplier: "Apex Plant Hire",
    plant: "EX-01 20t Excavator",
    plantNumber: "EX-01",
    operatorName: "T. Moyo",
  },
  {
    id: `${DEMO_OPERATOR_ID_PREFIX}cr-01`,
    supplier: "Apex Plant Hire",
    plant: "CR-01 Crawler Crane",
    plantNumber: "CR-01",
    operatorName: "S. Ncube",
  },
  {
    id: `${DEMO_OPERATOR_ID_PREFIX}cp-02`,
    supplier: "BuildRight Hire",
    plant: "CP-02 Concrete Pump",
    plantNumber: "CP-02",
    operatorName: "L. Dube",
  },
  {
    id: `${DEMO_OPERATOR_ID_PREFIX}tl-03`,
    supplier: "BuildRight Hire",
    plant: "TL-03 Telehandler",
    plantNumber: "TL-03",
    operatorName: "P. Chikore",
  },
]

function getDayNumber(dayId, projectId) {
  const projectStart = startOfDay(getProjectStartDate(projectId))
  const day = startOfDay(parseDayId(dayId))
  return Math.max(1, Math.floor((day - projectStart) / (1000 * 60 * 60 * 24)) + 1)
}

function isDemoOperatorRow(row) {
  return Boolean(row?.demo) || String(row?.id ?? "").startsWith(DEMO_OPERATOR_ID_PREFIX)
}

function demoAttendanceForDay(dayId, operatorIndex, projectId) {
  const weekday = parseDayId(dayId).getDay()
  const dayNumber = getDayNumber(dayId, projectId)

  if (weekday === 0) {
    return operatorIndex === 0 ? "present" : "absent"
  }

  if (weekday === 6) {
    return operatorIndex < 2 ? "present" : "absent"
  }

  if ((dayNumber + operatorIndex) % 8 === 0) {
    return "absent"
  }

  return "present"
}

function demoHoursForDay(dayId, operatorIndex, projectId) {
  const dayNumber = getDayNumber(dayId, projectId)
  const startHours = String(7 + (operatorIndex % 2) * 0.5)
  const finishHours = String(16 + ((dayNumber + operatorIndex) % 3) * 0.5)

  return {
    startHours,
    finishHours,
    hoursOperating: "",
    hoursOperatingEdited: false,
    plant: "",
    plantEdited: false,
  }
}

function groupDailyFilesByMonth(projectId) {
  const grouped = new Map()

  for (const file of getDailyFiles(projectId)) {
    const monthId = getMonthIdForDay(file.id)
    const dayIds = grouped.get(monthId) ?? []
    dayIds.push(file.id)
    grouped.set(monthId, dayIds)
  }

  return grouped
}

function buildDemoRegisterRows(monthId, dayIds, projectId) {
  const { daysInMonth } = getMonthRegisterMeta(monthId)

  return DEMO_OPERATOR_FLEET.map((operator, operatorIndex) => {
    const row = {
      ...createEmptyRegisterRow(daysInMonth),
      ...operator,
      demo: true,
    }

    for (const dayId of dayIds) {
      const dayOfMonth = String(parseDayId(dayId).getDate())
      row.attendance[dayOfMonth] = demoAttendanceForDay(dayId, operatorIndex, projectId)
    }

    return row
  })
}

function fillUnmarkedDemoAttendance(rows, dayIds, projectId) {
  let changed = false

  const nextRows = rows.map((row) => {
    if (!isDemoOperatorRow(row)) return row

    const operatorIndex = DEMO_OPERATOR_FLEET.findIndex((operator) => operator.id === row.id)
    const fleetIndex = operatorIndex >= 0 ? operatorIndex : 0
    const attendance = { ...row.attendance }
    let rowChanged = false

    for (const dayId of dayIds) {
      const dayOfMonth = String(parseDayId(dayId).getDate())
      const current = attendance[dayOfMonth]
      if (current === "present" || current === "absent") continue

      attendance[dayOfMonth] = demoAttendanceForDay(dayId, fleetIndex, projectId)
      rowChanged = true
    }

    if (!rowChanged) return row
    changed = true
    return { ...row, attendance }
  })

  return { rows: nextRows, changed }
}

function seedOperatorRegisters(projectId) {
  ensurePlantOperatorRegistersExist(projectId)

  let changed = false

  for (const [monthId, dayIds] of groupDailyFilesByMonth(projectId)) {
    const register = getPlantOperatorRegisterData(projectId, monthId)
    const existingRows = register.rows ?? []

    if (existingRows.length === 0) {
      savePlantOperatorRegisterData(projectId, monthId, {
        ...register,
        rows: buildDemoRegisterRows(monthId, dayIds, projectId),
        demo: true,
      })
      changed = true
      continue
    }

    if (existingRows.some((row) => !isDemoOperatorRow(row))) {
      continue
    }

    const filled = fillUnmarkedDemoAttendance(existingRows, dayIds, projectId)
    if (!filled.changed) continue

    savePlantOperatorRegisterData(projectId, monthId, {
      ...register,
      rows: filled.rows,
      demo: true,
    })
    changed = true
  }

  return changed
}

function seedEquipmentHours(projectId) {
  let changed = false

  for (const file of getDailyFiles(projectId)) {
    const existing = getDailyEquipmentHoursData(projectId, file.id)
    if (Object.keys(existing.entries ?? {}).length > 0) continue

    const monthId = getMonthIdForDay(file.id)
    const dayOfMonth = String(parseDayId(file.id).getDate())
    const register = getPlantOperatorRegisterData(projectId, monthId)
    const entries = {}

    register.rows.forEach((row, operatorIndex) => {
      if (row.attendance?.[dayOfMonth] !== "present") return

      const fleetIndex = DEMO_OPERATOR_FLEET.findIndex((operator) => operator.id === row.id)
      entries[row.id] = demoHoursForDay(
        file.id,
        fleetIndex >= 0 ? fleetIndex : operatorIndex,
        projectId
      )
    })

    if (Object.keys(entries).length === 0) continue

    saveDailyEquipmentHoursData(projectId, file.id, entries)
    changed = true
  }

  return changed
}

/**
 * Local `npm run dev` only. Seeds operator register attendance and equipment
 * hours from project start through today, without overwriting user-entered rows.
 */
export function ensureDemoPlantOnSiteData(projectId) {
  if (typeof window === "undefined") return false
  if (!shouldSeedLocalDevValuations()) return false
  if (!projectId) return false

  const registerChanged = seedOperatorRegisters(projectId)
  const hoursChanged = seedEquipmentHours(projectId)
  return registerChanged || hoursChanged
}
