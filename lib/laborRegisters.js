import { getMonthlyFile, getMonthlyFiles } from "@/lib/projects"

export function getLaborRegisterFiles(projectId) {
  return getMonthlyFiles(projectId)
}

export function getLaborRegisterFile(projectId, monthId) {
  return getMonthlyFile(projectId, monthId)
}

export function formatLaborRegisterLabel(file) {
  return `Labor register - ${file.label}`
}

export function getLaborRegistersHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/labor-register`
}

export function getLaborRegisterHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/safety-health/labor-register/${monthId}`
}
