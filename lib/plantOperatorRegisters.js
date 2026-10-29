import { getMonthlyFile, getMonthlyFiles } from "@/lib/projects"

export function getPlantOperatorRegisterFiles(projectId) {
  return getMonthlyFiles(projectId)
}

export function getPlantOperatorRegisterFile(projectId, monthId) {
  return getMonthlyFile(projectId, monthId)
}

export function formatPlantOperatorRegisterLabel(file) {
  return `Operator Register - ${file.label}`
}

export function getPlantOperatorsHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/plant-register`
}

export function getPlantOperatorRegisterHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/safety-health/plant-register/${monthId}`
}
