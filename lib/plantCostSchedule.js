export function getPlantCostScheduleHref(projectId, dayId, slotId) {
  return `/project/${projectId}/dashboard/plant-on-site/plant-cost/daily/${dayId}/hourly/${slotId}/plant-cost-schedule`
}

export function getPlantCostHourlyDashboardHref(projectId, dayId) {
  return `/project/${projectId}/dashboard/plant-on-site/plant-cost/daily/${dayId}`
}

export const PLANT_COST_SCHEDULE_LABEL = "Plant Cost Material Schedule"
