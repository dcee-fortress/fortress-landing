const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82

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

async function compressImageFile(file) {
  const image = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Could not process this image")
  }

  context.drawImage(image, 0, 0, width, height)

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
  const blob = await canvasToBlob(
    canvas,
    outputType,
    outputType === "image/jpeg" ? JPEG_QUALITY : undefined
  )

  return readBlobAsDataUrl(blob)
}

export async function prepareProgressPhoto(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please select an image file")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo size must be less than 10MB")
  }

  let data
  try {
    data = await compressImageFile(file)
  } catch {
    data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error("Could not read this image file"))
      reader.readAsDataURL(file)
    })
  }

  return {
    id: createPhotoId(),
    name: file.name,
    type: file.type.startsWith("image/") ? file.type : "image/jpeg",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    data,
  }
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
