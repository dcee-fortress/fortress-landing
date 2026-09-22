import {
  deleteProgressPhotoRecord,
  getProgressPhotoRecord,
  putProgressPhotoRecord,
} from "@/lib/progressReportPhotoStore"

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.78

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "avif",
  "heic",
  "heif",
  "tif",
  "tiff",
])

/**
 * Keep this as plain image/* so phones open the Photo Library.
 * Long extension lists force the desktop-style Files picker on iOS/Android.
 */
export const PROGRESS_PHOTO_ACCEPT = "image/*"

function getFileExtension(file) {
  const name = String(file?.name || "")
  const dot = name.lastIndexOf(".")
  if (dot < 0) return ""
  return name.slice(dot + 1).toLowerCase()
}

function guessImageMimeType(file) {
  const type = String(file?.type || "").toLowerCase()
  if (type.startsWith("image/")) return type

  switch (getFileExtension(file)) {
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "webp":
      return "image/webp"
    case "gif":
      return "image/gif"
    case "bmp":
      return "image/bmp"
    case "avif":
      return "image/avif"
    case "heic":
      return "image/heic"
    case "heif":
      return "image/heif"
    default:
      return ""
  }
}

async function sniffLooksLikeHeic(file) {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (bytes.length < 12) return false
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase()
    return brand === "heic" || brand === "heif" || brand === "mif1" || brand === "msf1"
  } catch {
    return false
  }
}

/**
 * Photo-library picks often omit MIME type. Accept anything the gallery returned
 * unless it clearly looks like a non-image document.
 */
export function isLikelyImageFile(file) {
  if (!file) return false
  const type = String(file.type || "").toLowerCase()
  if (type.startsWith("image/")) return true
  if (!type || type === "application/octet-stream") return true
  return IMAGE_EXTENSIONS.has(getFileExtension(file))
}

export function createPhotoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `photo-${crypto.randomUUID()}`
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function dedupeProgressPhotos(photos) {
  const seenIds = new Set()

  return (photos || []).filter((photo) => {
    const id = photo?.id
    if (!id || seenIds.has(id)) {
      return false
    }

    seenIds.add(id)
    return true
  })
}

export function normalizeProgressPhotos(photos) {
  const seenIds = new Set()

  return (photos || []).map((photo) => {
    let id = photo?.id
    if (!id || seenIds.has(id)) {
      do {
        id = createPhotoId()
      } while (seenIds.has(id))
    }

    seenIds.add(id)
    return id === photo?.id ? photo : { ...photo, id }
  })
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.decoding = "async"

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Could not read this image file"))
    }

    image.src = objectUrl
  })
}

async function loadBitmapFromFile(file) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Bitmap decode unavailable")
  }
  return createImageBitmap(file)
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not process this image"))
          return
        }

        resolve(blob)
      },
      type,
      quality
    )
  })
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("Could not read processed image"))
    reader.readAsDataURL(blob)
  })
}

async function drawSourceToDataUrl(source, mimeType) {
  const sourceWidth = source.width || source.naturalWidth || 0
  const sourceHeight = source.height || source.naturalHeight || 0
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Could not process this image")
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Could not process this image")
  }

  context.drawImage(source, 0, 0, width, height)

  const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg"
  const blob = await canvasToBlob(
    canvas,
    outputType,
    outputType === "image/jpeg" ? JPEG_QUALITY : undefined
  )

  return readBlobAsDataUrl(blob)
}

async function compressImageFile(file, mimeType) {
  try {
    const image = await loadImageFromFile(file)
    return await drawSourceToDataUrl(image, mimeType)
  } catch {
    const bitmap = await loadBitmapFromFile(file)
    try {
      return await drawSourceToDataUrl(bitmap, mimeType)
    } finally {
      if (typeof bitmap.close === "function") bitmap.close()
    }
  }
}

async function convertHeicToJpegFile(file) {
  const heic2any = (await import("heic2any")).default
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: JPEG_QUALITY,
  })
  const blob = Array.isArray(result) ? result[0] : result
  if (!blob) {
    throw new Error("Could not convert this phone photo")
  }

  const baseName = String(file.name || "site-photo").replace(/\.(heic|heif)$/i, "")
  return new File([blob], `${baseName || "site-photo"}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  })
}

function withImageMime(file, mimeType) {
  if (file.type === mimeType) return file
  return new File([file], file.name || `site-photo-${Date.now()}.jpg`, {
    type: mimeType,
    lastModified: file.lastModified || Date.now(),
  })
}

export async function prepareProgressPhoto(file) {
  if (!file) {
    throw new Error("Please select an image file")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo size must be less than 50MB")
  }

  let working = file
  let mimeType = guessImageMimeType(working) || "image/jpeg"
  const namedHeic = mimeType.includes("heic") || mimeType.includes("heif")
  const sniffedHeic = !namedHeic && (await sniffLooksLikeHeic(working))

  if (namedHeic || sniffedHeic) {
    working = await convertHeicToJpegFile(working)
    mimeType = "image/jpeg"
  } else if (!working.type) {
    working = withImageMime(working, mimeType)
  }

  let data
  try {
    data = await compressImageFile(working, mimeType)
  } catch {
    // Last resort: keep the original bytes so gallery uploads still land.
    data = await readBlobAsDataUrl(working)
  }

  if (!data || typeof data !== "string" || !data.startsWith("data:")) {
    throw new Error("Could not read this photo from your library")
  }

  const outputType = data.startsWith("data:image/png")
    ? "image/png"
    : data.startsWith("data:image/")
      ? data.slice(5, data.indexOf(";"))
      : "image/jpeg"

  return {
    id: createPhotoId(),
    name: working.name || file.name || `site-photo-${Date.now()}.jpg`,
    type: outputType,
    size: working.size || file.size,
    uploadedAt: new Date().toISOString(),
    data,
  }
}

export function toPhotoMetadata(photo) {
  if (!photo) return photo
  const { data, ...metadata } = photo
  void data
  const id = metadata.id
  return {
    ...metadata,
    // Shared URL so other devices/browsers can load the image from Postgres.
    url:
      metadata.url ||
      (id ? `/api/progress-photos?id=${encodeURIComponent(String(id))}` : undefined),
  }
}

/** Prefer in-memory data, then shared API URL, then ID-based API path. */
export function getProgressPhotoSrc(photo) {
  if (!photo) return ""
  if (typeof photo.data === "string" && photo.data) return photo.data
  if (typeof photo.url === "string" && photo.url) return photo.url
  if (photo.id) return `/api/progress-photos?id=${encodeURIComponent(String(photo.id))}`
  return ""
}

export function stripPhotosForStorage(report) {
  const photos = report?.progressUpdate?.photos
  if (!Array.isArray(photos)) return report

  return {
    ...report,
    progressUpdate: {
      ...report.progressUpdate,
      photos: photos.map(toPhotoMetadata),
    },
  }
}

async function uploadProgressPhotosToSharedStore(photos) {
  const list = (photos || []).filter((photo) => photo?.id && photo?.data)
  if (list.length === 0 || typeof window === "undefined") return

  // Upload one-by-one to stay under serverless body limits on mobile networks.
  for (const photo of list) {
    try {
      const response = await fetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: {
            id: photo.id,
            name: photo.name,
            type: photo.type,
            size: photo.size,
            uploadedAt: photo.uploadedAt,
            data: photo.data,
          },
        }),
      })
      if (!response.ok) {
        // Keep local IndexedDB copy; shared sync can retry on next save/hydrate.
        continue
      }
    } catch {
      // Offline / transient network — local copy remains.
    }
  }
}

async function fetchProgressPhotosFromSharedStore(ids) {
  const photoIds = [...new Set((ids || []).map((id) => String(id || "")).filter(Boolean))]
  if (photoIds.length === 0 || typeof window === "undefined") return []

  try {
    const response = await fetch(
      `/api/progress-photos?format=json&ids=${encodeURIComponent(photoIds.join(","))}`,
      { cache: "no-store" }
    )
    if (!response.ok) return []
    const data = await response.json().catch(() => ({}))
    return Array.isArray(data.photos) ? data.photos : []
  } catch {
    return []
  }
}

export async function persistProgressPhotos(photos) {
  const list = (photos || []).filter((photo) => photo?.id && photo?.data)
  await Promise.all(
    list.map((photo) =>
      putProgressPhotoRecord({
        id: photo.id,
        name: photo.name,
        type: photo.type,
        size: photo.size,
        uploadedAt: photo.uploadedAt,
        data: photo.data,
      }).catch(() => {})
    )
  )
  await uploadProgressPhotosToSharedStore(list)
}

export async function hydrateProgressPhotos(photos) {
  const list = photos || []
  const missingIds = []

  const withLocal = await Promise.all(
    list.map(async (photo) => {
      if (photo?.data) {
        await putProgressPhotoRecord({
          id: photo.id,
          name: photo.name,
          type: photo.type,
          size: photo.size,
          uploadedAt: photo.uploadedAt,
          data: photo.data,
        }).catch(() => {})
        return { ...photo, url: getProgressPhotoSrc(photo) }
      }

      const stored = await getProgressPhotoRecord(photo?.id).catch(() => null)
      if (stored?.data) {
        return { ...photo, ...stored, url: getProgressPhotoSrc({ ...photo, ...stored }) }
      }

      if (photo?.id) missingIds.push(photo.id)
      return {
        ...photo,
        url: getProgressPhotoSrc(photo),
      }
    })
  )

  if (missingIds.length === 0) return withLocal

  const remote = await fetchProgressPhotosFromSharedStore(missingIds)
  if (remote.length === 0) return withLocal

  const remoteById = new Map(remote.map((photo) => [photo.id, photo]))
  return Promise.all(
    withLocal.map(async (photo) => {
      if (photo?.data) return photo
      const shared = remoteById.get(photo?.id)
      if (!shared?.data) return photo

      await putProgressPhotoRecord({
        id: shared.id,
        name: shared.name,
        type: shared.type,
        size: shared.size,
        uploadedAt: shared.uploadedAt,
        data: shared.data,
      }).catch(() => {})

      return {
        ...photo,
        ...shared,
        url: getProgressPhotoSrc(shared),
      }
    })
  )
}

export async function removeStoredProgressPhoto(photoId) {
  await deleteProgressPhotoRecord(photoId).catch(() => {})
  if (typeof window === "undefined" || !photoId) return
  try {
    await fetch("/api/progress-photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photoId }),
    })
  } catch {
    // Ignore network failures on delete.
  }
}

export function openPhotoInNewTab(photo) {
  const src = getProgressPhotoSrc(photo)
  if (!src) return

  const popup = window.open("", "_blank", "noopener,noreferrer")
  if (!popup) {
    window.alert("Allow pop-ups to open this photo in a new tab.")
    return
  }

  popup.document.title = photo.name || "Site photo"
  popup.document.body.style.margin = "0"
  popup.document.body.style.background = "#111"
  popup.document.body.style.display = "flex"
  popup.document.body.style.minHeight = "100vh"
  popup.document.body.style.alignItems = "center"
  popup.document.body.style.justifyContent = "center"

  const image = popup.document.createElement("img")
  image.src = src
  image.alt = photo.name || "Site photo"
  image.style.maxWidth = "100%"
  image.style.maxHeight = "100vh"
  image.style.objectFit = "contain"
  popup.document.body.appendChild(image)
}

export function downloadProgressPhoto(photo) {
  const src = getProgressPhotoSrc(photo)
  if (!src) return
  const link = document.createElement("a")
  link.href = src
  link.download = photo.name || "site-photo.jpg"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
