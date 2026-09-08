export function parseJsonText(text, fallback = null) {
  if (typeof text !== "string" || !text.trim()) {
    return fallback
  }

  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

export async function readResponseJson(response, fallback = null) {
  const text = await response.text()
  return parseJsonText(text, fallback)
}

export async function readRequestJson(request, fallback = null) {
  try {
    const text = await request.text()
    return parseJsonText(text, fallback)
  } catch {
    return fallback
  }
}
