import { getMonthlyFile, getMonthlyFiles } from "@/lib/projects"

export function getSiteStaffRegisterFiles(projectId) {
  return getMonthlyFiles(projectId)
}

export function getSiteStaffRegisterFile(projectId, monthId) {
  return getMonthlyFile(projectId, monthId)
}

export function formatSiteStaffRegisterLabel(file) {
  return `Site Staff Attendance - ${file.label}`
}

export function getSiteStaffRegistersHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/site-staff`
}

export function getSiteStaffRegisterHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/safety-health/site-staff/${monthId}`
}
