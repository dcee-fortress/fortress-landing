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
  return metadata
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
}

export async function hydrateProgressPhotos(photos) {
  const list = photos || []

  return Promise.all(
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
        return photo
      }

      const stored = await getProgressPhotoRecord(photo?.id).catch(() => null)
      if (!stored?.data) return photo
      return { ...photo, ...stored }
    })
  )
}

export async function removeStoredProgressPhoto(photoId) {
  await deleteProgressPhotoRecord(photoId).catch(() => {})
}

export function openPhotoInNewTab(photo) {
  if (!photo?.data) return

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
  image.src = photo.data
  image.alt = photo.name || "Site photo"
  image.style.maxWidth = "100%"
  image.style.maxHeight = "100vh"
  image.style.objectFit = "contain"
  popup.document.body.appendChild(image)
}

export function downloadProgressPhoto(photo) {
  const link = document.createElement("a")
  link.href = photo.data
  link.download = photo.name || "site-photo.jpg"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
