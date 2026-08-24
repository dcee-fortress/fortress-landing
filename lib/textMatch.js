export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

export function keywordScore(sourceText, targetText) {
  const sourceTokens = new Set(tokenize(sourceText))
  const targetTokens = tokenize(targetText)

  if (sourceTokens.size === 0 || targetTokens.length === 0) {
    return 0
  }

  let matches = 0
  for (const token of targetTokens) {
    if (sourceTokens.has(token)) {
      matches += 1
    }
  }

  return matches / targetTokens.length
}
