import { del } from "@vercel/blob"

export function isBlobStorageConfigured() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || "").trim())
}

export function progressPhotoBlobPathname(photoId, mimeType = "image/jpeg") {
  const id = String(photoId || "photo").replace(/[^a-zA-Z0-9._-]/g, "-")
  const type = String(mimeType || "").toLowerCase()
  const ext =
    type.includes("png")
      ? "png"
      : type.includes("webp")
        ? "webp"
        : type.includes("gif")
          ? "gif"
          : "jpg"
  return `progress-photos/${id}.${ext}`
}

export function isVercelBlobUrl(url) {
  const value = String(url || "")
  return (
    value.startsWith("https://") &&
    (value.includes(".blob.vercel-storage.com") || value.includes("blob.vercel-storage.com"))
  )
}

export async function deleteProgressPhotoBlob(url) {
  if (!isBlobStorageConfigured() || !isVercelBlobUrl(url)) return false
  try {
    await del(url)
    return true
  } catch {
    return false
  }
}
