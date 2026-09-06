import { isTodayDayId, parseDayId } from "@/lib/dailyFiles"
import {
  enrichEquipmentWithHours,
  sumEquipmentHours,
} from "@/lib/equipmentHoursData"
import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { getMonthIdForDay, isMonthlyFileInProgress, isWeeklyFileInProgress } from "@/lib/periodFiles"
import { getPlantOperatorRegisterData } from "@/lib/plantOperatorRegisterData"
import { getDailyFile, getMonthlyFile, getWeeklyFile } from "@/lib/projects"

function equipmentKey(item) {
  return `${item.supplier}::${item.plant}::${item.plantNumber}::${item.operatorName}`
    .trim()
    .toLowerCase()
}

function mapRegisterRow(row) {
  return {
    id: row.id,
    supplier: row.supplier,
    plant: row.plant,
    plantNumber: row.plantNumber,
    operatorName: row.operatorName,
  }
}

export function getOperatorRegisterForDay(projectId, dayId) {
  const monthId = getMonthIdForDay(dayId)
  const dayOfMonth = parseDayId(dayId).getDate()
  const register = getPlantOperatorRegisterData(projectId, monthId)
  const dailyFile = getDailyFile(projectId, dayId)
  const dayKey = String(dayOfMonth)

  const operators = register.rows
    .map((row) => ({
      ...mapRegisterRow(row),
      attendance: row.attendance?.[dayKey] ?? null,
    }))
    .filter((row) => row.attendance === "present" || row.attendance === "absent")
    .sort((left, right) => {
      const plantCompare = left.plantNumber.localeCompare(right.plantNumber)
      if (plantCompare !== 0) return plantCompare
      return left.plant.localeCompare(right.plant)
    })

  return {
    period: "daily",
    fileId: dayId,
    dayId,
    dateLabel: dailyFile?.label ?? dayId,
    operators,
    presentCount: operators.filter((row) => row.attendance === "present").length,
    absentCount: operators.filter((row) => row.attendance === "absent").length,
  }
}

export function getEquipmentInUseForDay(projectId, dayId) {
  const monthId = getMonthIdForDay(dayId)
  const dayOfMonth = parseDayId(dayId).getDate()
  const register = getPlantOperatorRegisterData(projectId, monthId)
  const dailyFile = getDailyFile(projectId, dayId)

  const equipment = enrichEquipmentWithHours(
    projectId,
    dayId,
    register.rows
      .filter((row) => row.attendance[String(dayOfMonth)] === "present")
      .map(mapRegisterRow)
      .sort((left, right) => {
        const plantCompare = left.plantNumber.localeCompare(right.plantNumber)
        if (plantCompare !== 0) return plantCompare
        return left.plant.localeCompare(right.plant)
      })
  )

  return {
    period: "daily",
    fileId: dayId,
    dayId,
    dateLabel: dailyFile?.label ?? dayId,
    dateShort: dailyFile?.date ?? dayId,
    equipment,
    totalCount: equipment.length,
    totalHours: sumEquipmentHours(equipment),
  }
}

function aggregateEquipmentAcrossDays(dayResults) {
  const grouped = new Map()

  for (const dayResult of dayResults) {
    for (const item of dayResult.equipment) {
      const key = equipmentKey(item)
      const existing = grouped.get(key) ?? {
        ...item,
        daysUsed: [],
        dayCount: 0,
        totalHoursOperating: 0,
        startHours: "",
        finishHours: "",
        hoursOperating: null,
      }

      if (!existing.daysUsed.includes(dayResult.dateShort)) {
        existing.daysUsed.push(dayResult.dateShort)
        existing.dayCount += 1
      }

      existing.totalHoursOperating =
        Math.round((existing.totalHoursOperating + (item.hoursOperating ?? 0)) * 100) / 100

      grouped.set(key, existing)
    }
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      hoursOperating: item.totalHoursOperating,
    }))
    .sort((left, right) => {
      const plantCompare = left.plantNumber.localeCompare(right.plantNumber)
      if (plantCompare !== 0) return plantCompare
      return left.plant.localeCompare(right.plant)
    })
}

export function getOperatorRegisterForWeek(projectId, weekId) {
  const weekFile = getWeeklyFile(projectId, weekId)
  const dayIds = getDayIdsInWeek(projectId, weekId)
  const grouped = new Map()
  let daysWithMarks = 0

  for (const dayId of dayIds) {
    const day = getOperatorRegisterForDay(projectId, dayId)
    if (day.operators.length > 0) {
      daysWithMarks += 1
    }

    for (const operator of day.operators) {
      const key = equipmentKey(operator)
      const existing = grouped.get(key) ?? {
        ...mapRegisterRow(operator),
        presentDays: 0,
        absentDays: 0,
        daysMarked: 0,
      }

      if (operator.attendance === "present") existing.presentDays += 1
      if (operator.attendance === "absent") existing.absentDays += 1
      existing.daysMarked += 1
      grouped.set(key, existing)
    }
  }

  const operators = [...grouped.values()].sort((left, right) => {
    const plantCompare = left.plantNumber.localeCompare(right.plantNumber)
    if (plantCompare !== 0) return plantCompare
    return left.plant.localeCompare(right.plant)
  })

  return {
    period: "weekly",
    fileId: weekId,
    periodLabel: weekFile?.label ?? weekId,
    operators,
    presentCount: operators.reduce((sum, row) => sum + (row.presentDays ?? 0), 0),
    absentCount: operators.reduce((sum, row) => sum + (row.absentDays ?? 0), 0),
    daysWithMarks,
  }
}

export function getEquipmentInUseForWeek(projectId, weekId) {
  const weekFile = getWeeklyFile(projectId, weekId)
  const dayIds = getDayIdsInWeek(projectId, weekId)
  const dayResults = dayIds.map((dayId) => getEquipmentInUseForDay(projectId, dayId))
  const equipment = aggregateEquipmentAcrossDays(dayResults)
  const daysWithEquipment = dayResults.filter((day) => day.totalCount > 0).length

  return {
    period: "weekly",
    fileId: weekId,
    periodLabel: weekFile?.label ?? weekId,
    equipment,
    totalCount: equipment.length,
    daysWithEquipment,
    totalHours: Math.round(
      equipment.reduce((sum, item) => sum + (item.hoursOperating ?? 0), 0) * 100
    ) / 100,
    dayResults,
  }
}

export function getEquipmentInUseForMonth(projectId, monthId) {
  const monthFile = getMonthlyFile(projectId, monthId)
  const dayIds = getDayIdsInMonth(projectId, monthId)
  const dayResults = dayIds.map((dayId) => getEquipmentInUseForDay(projectId, dayId))
  const equipment = aggregateEquipmentAcrossDays(dayResults)
  const daysWithEquipment = dayResults.filter((day) => day.totalCount > 0).length

  return {
    period: "monthly",
    fileId: monthId,
    periodLabel: monthFile?.label ?? monthId,
    equipment,
    totalCount: equipment.length,
    daysWithEquipment,
    totalHours: Math.round(
      equipment.reduce((sum, item) => sum + (item.hoursOperating ?? 0), 0) * 100
    ) / 100,
    dayResults,
  }
}

export function getEquipmentInUseReport(projectId, period, fileId) {
  if (period === "weekly") return getEquipmentInUseForWeek(projectId, fileId)
  if (period === "monthly") return getEquipmentInUseForMonth(projectId, fileId)
  return getEquipmentInUseForDay(projectId, fileId)
}

export function getEquipmentInUseDailyFileStatus(projectId, file) {
  const report = getEquipmentInUseForDay(projectId, file.id)
  const isToday = isTodayDayId(file.id)
  const hasEquipment = report.totalCount > 0

  if (isToday && !hasEquipment) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Mark operators present in the register to list equipment in use",
    }
  }

  if (isToday && hasEquipment) {
    return {
      key: "in-progress",
      label: "In progress",
      description: `${report.totalCount} item${report.totalCount === 1 ? "" : "s"} in use today · enter start and finish hours`,
    }
  }

  if (hasEquipment) {
    return {
      key: "completed",
      label: "Completed",
      description: `${report.totalCount} item${report.totalCount === 1 ? "" : "s"} in use · ${file.completedAt}`,
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "No equipment marked present in the register for this day",
  }
}

export function getEquipmentInUsePeriodFileStatus(projectId, period, file) {
  const report = getEquipmentInUseReport(projectId, period, file.id)
  const inProgress =
    period === "weekly" ? isWeeklyFileInProgress(file) : isMonthlyFileInProgress(file)

  if (report.totalCount === 0) {
    return {
      label: inProgress ? "In progress" : "Completed",
      description: inProgress
        ? "No equipment marked present yet this period"
        : `No equipment marked present · ${file.completedAt}`,
    }
  }

  return {
    label: inProgress ? "In progress" : "Completed",
    description: inProgress
      ? `${report.totalCount} item${report.totalCount === 1 ? "" : "s"} used · ${report.daysWithEquipment} day${report.daysWithEquipment === 1 ? "" : "s"} with register ticks`
      : `${report.totalCount} item${report.totalCount === 1 ? "" : "s"} used · Completed ${file.completedAt}`,
  }
}

export function getEquipmentInUseDetailDescription(period) {
  if (period === "daily") {
    return "Equipment listed here is copied from the operator register for operators marked present on this date (supplier, plant name, and plant number). Enter start and finish hours, or type hours operating directly. When both start and finish are filled, hours operating calculates automatically."
  }

  if (period === "weekly") {
    return "Weekly equipment hours cumulate from daily start and finish hour entries across this project week."
  }

  return "Monthly equipment hours cumulate from daily start and finish hour entries across this calendar month."
}
