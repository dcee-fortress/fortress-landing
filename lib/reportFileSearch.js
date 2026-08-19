export function filterReportFiles(files, query) {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return files

  return files.filter((file) => {
    const haystack = [file.label, file.id, file.completedAt, file.date]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(trimmed)
  })
}
