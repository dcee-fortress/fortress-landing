import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

function sanitizePdfFilename(value, fallback = "report") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || fallback
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function previewAndSavePdf(doc, filename) {
  const blob = doc.output("blob")
  const url = URL.createObjectURL(blob)
  const preview = window.open(url, "_blank", "noopener,noreferrer")
  if (!preview) {
    window.alert("Allow pop-ups to preview the PDF. The file will still download.")
  }
  doc.save(filename)
}

const UNSUPPORTED_COLOR = /(oklch|oklab|lab|lch|color-mix|color\(|light-dark|hwb)\(/i
const COLOR_FUNCTION_NAMES = ["oklch", "oklab", "lab", "lch", "color-mix", "color", "light-dark", "hwb"]

let colorProbeContext

function getColorProbe() {
  if (colorProbeContext) return colorProbeContext
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  colorProbeContext = canvas.getContext("2d", { willReadFrequently: true })
  return colorProbeContext
}

function cssColorToRgb(value) {
  if (!value || value === "none" || value === "transparent") return value
  if (!UNSUPPORTED_COLOR.test(value) && !/^color-mix/i.test(value)) return value

  const ctx = getColorProbe()
  if (!ctx) return "#000000"

  try {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = "#000000"
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === 0) return "transparent"
    if (a === 255) return `rgb(${r}, ${g}, ${b})`
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  } catch {
    return "#18181b"
  }
}

function replaceColorFunctions(cssText) {
  if (!cssText || !UNSUPPORTED_COLOR.test(cssText)) return cssText

  const source = String(cssText)
  const namePattern = new RegExp(`(?:${COLOR_FUNCTION_NAMES.join("|")})\\(`, "gi")
  let result = ""
  let lastIndex = 0
  let match

  while ((match = namePattern.exec(source))) {
    const start = match.index
    let index = start + match[0].length
    let depth = 1
    while (index < source.length && depth > 0) {
      const char = source[index]
      if (char === "(") depth += 1
      else if (char === ")") depth -= 1
      index += 1
    }

    const full = source.slice(start, index)
    result += source.slice(lastIndex, start) + cssColorToRgb(full)
    lastIndex = index
    namePattern.lastIndex = index
  }

  return result + source.slice(lastIndex)
}

function rewriteStyleSheets(clonedDoc) {
  clonedDoc.querySelectorAll("style").forEach((styleEl) => {
    const next = replaceColorFunctions(styleEl.textContent || "")
    if (next !== styleEl.textContent) styleEl.textContent = next
  })
}

function flattenCloneForPdf(clonedDoc, clonedElement) {
  try {
    clonedDoc.querySelectorAll(".no-print").forEach((node) => node.remove())
    const view = clonedDoc.defaultView || window
    const root = clonedElement || clonedDoc.body

    clonedDoc.documentElement.style.backgroundColor = "#ffffff"
    clonedDoc.body.style.backgroundColor = "#ffffff"
    clonedDoc.body.style.color = "#18181b"

    rewriteStyleSheets(clonedDoc)

    root.querySelectorAll("*").forEach((node) => {
      if (node.nodeType !== 1) return

      const style = view.getComputedStyle(node)
      const tag = node.tagName

      if (tag !== "IMG" && tag !== "CANVAS" && tag !== "SVG" && tag !== "VIDEO") {
        node.style.backgroundImage = "none"
      }
      node.style.backdropFilter = "none"
      node.style.webkitBackdropFilter = "none"
      if (tag !== "IMG") node.style.filter = "none"
      node.style.boxShadow = "none"
      node.style.textShadow = "none"
      node.style.overflow = "visible"
      node.style.maxHeight = "none"

      for (let index = 0; index < style.length; index += 1) {
        const prop = style.item(index)
        const value = style.getPropertyValue(prop)
        if (!value || !UNSUPPORTED_COLOR.test(value)) continue
        node.style.setProperty(prop, replaceColorFunctions(value), style.getPropertyPriority(prop))
      }

      const color = cssColorToRgb(style.color)
      const backgroundColor = cssColorToRgb(style.backgroundColor)
      const borderColor = cssColorToRgb(style.borderColor)
      const outlineColor = cssColorToRgb(style.outlineColor)
      const fill = cssColorToRgb(style.fill)
      const stroke = cssColorToRgb(style.stroke)

      if (color) node.style.color = color
      if (backgroundColor && backgroundColor !== "transparent") node.style.backgroundColor = backgroundColor
      if (borderColor && borderColor !== "transparent") node.style.borderColor = borderColor
      if (outlineColor && outlineColor !== "transparent") node.style.outlineColor = outlineColor
      if (fill && fill !== "none") node.style.fill = fill
      if (stroke && stroke !== "none") node.style.stroke = stroke

      if (tag === "IMG" && node.currentSrc) {
        node.src = node.currentSrc
      }
    })
  } catch {
    /* keep the clone even if some colors cannot be rewritten */
  }
}

function unlockOverflowForCapture(element) {
  const restored = []

  const unlock = (node) => {
    if (!node || node.nodeType !== 1) return
    restored.push([node, node.style.cssText])
    node.style.overflow = "visible"
    node.style.height = "auto"
    node.style.maxHeight = "none"
  }

  let node = element
  while (node && node !== document.documentElement) {
    unlock(node)
    node = node.parentElement
  }

  element.querySelectorAll("*").forEach(unlock)

  return () => {
    restored.forEach(([target, cssText]) => {
      target.style.cssText = cssText
    })
  }
}

function waitForImages(root) {
  const images = [...root.querySelectorAll("img")].filter((image) => image.src)
  return Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve()
            return
          }
          image.onload = () => resolve()
          image.onerror = () => resolve()
        })
    )
  )
}

async function captureElement(element) {
  const restoreOverflow = unlockOverflowForCapture(element)
  await waitForImages(element)

  const width = Math.max(element.scrollWidth, element.offsetWidth, 794)
  const height = Math.max(element.scrollHeight, element.offsetHeight, 1)

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      ignoreElements: (node) => node.classList?.contains("no-print"),
      onclone: (clonedDoc, clonedElement) => flattenCloneForPdf(clonedDoc, clonedElement),
    })
  } finally {
    restoreOverflow()
  }
}

function imageFormatFromDataUrl(dataUrl) {
  if (String(dataUrl).startsWith("data:image/png")) return "PNG"
  if (String(dataUrl).startsWith("data:image/webp")) return "WEBP"
  return "JPEG"
}

function loadImageSize(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve(null)
    image.src = dataUrl
  })
}

async function appendPhotoPages(pdf, photos) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 12

  for (const photo of photos || []) {
    if (!photo?.data) continue

    const size = await loadImageSize(photo.data)
    pdf.addPage()
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(12)
    pdf.setTextColor(24, 24, 27)
    pdf.text(String(photo.name || "Site photo").replace(/[^\x20-\x7E]/g, " ").slice(0, 90), margin, 12)

    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - 22
    let drawWidth = maxWidth
    let drawHeight = maxHeight

    if (size?.width && size?.height) {
      const ratio = size.width / size.height
      drawWidth = maxWidth
      drawHeight = drawWidth / ratio
      if (drawHeight > maxHeight) {
        drawHeight = maxHeight
        drawWidth = drawHeight * ratio
      }
    }

    const x = margin + (maxWidth - drawWidth) / 2
    const y = 16 + (maxHeight - drawHeight) / 2

    try {
      pdf.addImage(photo.data, imageFormatFromDataUrl(photo.data), x, y, drawWidth, drawHeight, undefined, "FAST")
    } catch {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(11)
      pdf.text("This site photo could not be embedded in the PDF.", margin, 28)
    }
  }
}

export async function exportElementToPdf(element, filename, { photos } = {}) {
  if (!element) {
    throw new Error("Nothing to export yet.")
  }

  const canvas = await captureElement(element)
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const imageData = canvas.toDataURL("image/jpeg", 0.92)

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imageData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST")
  heightLeft -= pageHeight

  while (heightLeft > 8) {
    position -= pageHeight
    pdf.addPage()
    pdf.addImage(imageData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST")
    heightLeft -= pageHeight
  }

  await appendPhotoPages(pdf, photos)
  previewAndSavePdf(pdf, filename)
}

export async function exportFullProgressReportPdf({
  filename,
  projectName,
  title,
  dateLabel,
  weatherElement,
  documentHtml,
  photos,
}) {
  const host = document.createElement("div")
  host.setAttribute("data-progress-pdf-report", "true")
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:794px",
    "background:#ffffff",
    "color:#18181b",
    "padding:28px 32px 40px",
    "box-sizing:border-box",
    "z-index:2147483646",
    "pointer-events:none",
  ].join(";")

  host.innerHTML = `
    <p style="margin:0 0 6px; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#71717a;">Progress Report</p>
    <h1 style="margin:0 0 6px; font-size:26px; line-height:1.25;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 20px; font-size:16px; font-weight:600; color:#27272a;">${dateLabel ? `${escapeHtml(dateLabel)}${projectName ? ` · ${escapeHtml(projectName)}` : ""}` : escapeHtml(projectName)}</p>
  `

  if (weatherElement) {
    const weatherWrap = document.createElement("div")
    weatherWrap.style.cssText = "margin:0 0 24px;"
    weatherWrap.appendChild(weatherElement.cloneNode(true))
    weatherWrap.querySelectorAll(".no-print").forEach((node) => node.remove())
    host.appendChild(weatherWrap)
  }

  const documentWrap = document.createElement("div")
  documentWrap.className = "rich-text-editor__content"
  documentWrap.style.cssText = "margin:0; color:#18181b;"
  documentWrap.innerHTML = documentHtml || "<p></p>"
  host.appendChild(documentWrap)

  const embeddablePhotos = (photos || []).filter((photo) => photo?.data)

  document.body.appendChild(host)
  await waitForImages(host)

  try {
    await exportElementToPdf(host, filename, { photos: embeddablePhotos })
  } finally {
    host.remove()
  }
}

export async function exportProgressDocumentPdf({
  projectName,
  title,
  dateLabel,
  html,
}) {
  const host = document.createElement("div")
  host.setAttribute("data-progress-pdf-document", "true")
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    "width:794px",
    "background:#ffffff",
    "color:#18181b",
    "padding:36px 40px",
    "box-sizing:border-box",
  ].join(";")

  host.innerHTML = `
    <p style="margin:0 0 6px; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#71717a;">Progress Report</p>
    <h1 style="margin:0 0 6px; font-size:26px; line-height:1.25;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 20px; font-size:16px; font-weight:600; color:#27272a;">${dateLabel ? `${escapeHtml(dateLabel)}${projectName ? ` · ${escapeHtml(projectName)}` : ""}` : escapeHtml(projectName)}</p>
    <div class="rich-text-editor__content">${html || "<p></p>"}</div>
  `

  document.body.appendChild(host)

  try {
    const filename = `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(title, "document")}.pdf`
    await exportElementToPdf(host, filename)
  } finally {
    host.remove()
  }
}

export function getDailyReportPdfFilename(projectName, reportId) {
  return `${sanitizePdfFilename(projectName, "project")}-daily-report-${sanitizePdfFilename(reportId, "day")}.pdf`
}

export function getWeeklyReportPdfFilename(projectName, reportId) {
  return `${sanitizePdfFilename(projectName, "project")}-weekly-report-${sanitizePdfFilename(reportId, "week")}.pdf`
}
