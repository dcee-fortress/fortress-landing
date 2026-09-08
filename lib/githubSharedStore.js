function githubRepo() {
  const owner = process.env.VERCEL_GIT_REPO_OWNER || "dcee-fortress"
  const slug = process.env.VERCEL_GIT_REPO_SLUG || "fortress-landing"
  return `${owner}/${slug}`
}

function githubRef() {
  return process.env.GROVE_SHARED_DATA_REF || "shared-data"
}

function snapshotUrls() {
  const repo = githubRepo()
  const refs = [githubRef(), process.env.VERCEL_GIT_COMMIT_REF || "main", "main"]
  return [...new Set(refs)].map(
    (ref) => `https://raw.githubusercontent.com/${repo}/${ref}/data/grove-shared-storage.json`
  )
}

const CACHE_MS = 15000

function githubCache() {
  if (!globalThis.__groveGithubStorageCache) {
    globalThis.__groveGithubStorageCache = { at: 0, data: null }
  }
  return globalThis.__groveGithubStorageCache
}

export async function readGithubSharedStore() {
  const cache = githubCache()
  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    return cache.data
  }

  try {
    for (const url of snapshotUrls()) {
      try {
        const response = await fetch(`${url}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })
        if (!response.ok) continue
        const parsed = await response.json()
        if (!parsed || typeof parsed !== "object" || parsed.error) continue
        cache.data = parsed
        cache.at = Date.now()
        return parsed
      } catch {
        // Try the next snapshot location.
      }
    }
    return cache.data
  } catch {
    return cache.data
  }
}

export async function writeGithubSharedStore(storage) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.SHARED_STORAGE_GITHUB_TOKEN
  if (!token) return false

  const repo = githubRepo()
  const ref = githubRef()
  const path = "data/grove-shared-storage.json"
  const api = `https://api.github.com/repos/${repo}/contents/${path}`

  try {
    const current = await fetch(`${api}?ref=${ref}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
    const currentJson = current.ok ? await current.json() : {}
    const sha = typeof currentJson.sha === "string" ? currentJson.sha : undefined
    const content = Buffer.from(`${JSON.stringify(storage, null, 2)}\n`, "utf8").toString("base64")

    const response = await fetch(api, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Persist live Rodcroft project data for every device.",
        content,
        sha,
        branch: ref,
      }),
    })

    if (!response.ok) return false
    githubCache().data = storage
    githubCache().at = Date.now()
    return true
  } catch {
    return false
  }
}
