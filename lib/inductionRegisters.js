import { getMonthlyFile, getMonthlyFiles } from "@/lib/projects"

export function getInductionRegisterFiles(projectId) {
  return getMonthlyFiles(projectId)
}

export function getInductionRegisterFile(projectId, monthId) {
  return getMonthlyFile(projectId, monthId)
}

export function formatInductionRegisterLabel(file) {
  return `Induction Register - ${file.label}`
}

export function getInductionRegistersHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/induction`
}

export function getInductionRegisterHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/safety-health/induction/${monthId}`
}
