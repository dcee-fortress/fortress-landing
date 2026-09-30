/**
 * Carries the list of people / plant from the latest earlier monthly register into a new month.
 * Only the identity fields move across; attendance starts blank for ticking.
 */

const CARRIED_ID_SEPARATOR = "--"

function hasIdentity(row, identityFields) {
  return identityFields.some((field) => String(row?.[field] ?? "").trim())
}

/**
 * Row ids are derived from the source row, so two devices opening the new month at the
 * same time produce identical rows and the shared-store merge keeps a single copy.
 */
function carriedRowId(sourceId, monthId) {
  const baseId = String(sourceId).split(CARRIED_ID_SEPARATOR)[0]
  return `${baseId}${CARRIED_ID_SEPARATOR}${monthId}`
}

function emptyAttendance(daysInMonth) {
  const attendance = {}
  for (let day = 1; day <= daysInMonth; day += 1) {
    attendance[String(day)] = null
  }
  return attendance
}

/** Latest month before `monthId` whose register has at least one named row. */
function findSourceMonth(projectRegisters, monthId, identityFields) {
  return Object.keys(projectRegisters ?? {})
    .filter((id) => id < monthId)
    .sort()
    .reverse()
    .find((id) => (projectRegisters[id]?.rows ?? []).some((row) => hasIdentity(row, identityFields)))
}

/** A register that was never edited or filled, so it can safely receive the carried list. */
export function isUntouchedRegister(register) {
  if (!register) return true
  if (register.userEdited || register.carriedOverFrom) return false
  return !Array.isArray(register.rows) || register.rows.length === 0
}

export function buildCarriedOverRows(projectRegisters, monthId, { identityFields, daysInMonth }) {
  const sourceMonthId = findSourceMonth(projectRegisters, monthId, identityFields)
  if (!sourceMonthId) return null

  const rows = projectRegisters[sourceMonthId].rows
    .filter((row) => row?.id && hasIdentity(row, identityFields))
    .map((row) => {
      const next = { id: carriedRowId(row.id, monthId) }
      for (const field of identityFields) next[field] = row[field] ?? ""
      next.attendance = emptyAttendance(daysInMonth)
      return next
    })

  return { sourceMonthId, rows }
}
