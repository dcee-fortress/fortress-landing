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

async function canvasToMultiPagePdf(canvas, filename) {
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

  previewAndSavePdf(pdf, filename)
}

const UNSUPPORTED_COLOR = /(oklch|oklab|lab|lch|color-mix|color\()/i

function cssColorToRgb(value) {
  if (!value || value === "none" || value === "transparent") return value
  if (!UNSUPPORTED_COLOR.test(value)) return value

  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return "#000000"

  try {
    ctx.fillStyle = "#000000"
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === 0) return "transparent"
    if (a === 255) return `rgb(${r}, ${g}, ${b})`
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  } catch {
    return "#000000"
  }
}

function flattenCloneForPdf(clonedDoc) {
  clonedDoc.querySelectorAll(".no-print").forEach((node) => node.remove())
  const HTMLEl = clonedDoc.defaultView?.HTMLElement || HTMLElement

  clonedDoc.querySelectorAll("*").forEach((node) => {
    if (!(node instanceof HTMLEl)) return

    const view = clonedDoc.defaultView || window
    const style = view.getComputedStyle(node)
    node.style.backgroundImage = "none"
    node.style.backdropFilter = "none"
    node.style.webkitBackdropFilter = "none"
    node.style.filter = "none"
    node.style.boxShadow = "none"
    node.style.textShadow = "none"
    node.style.overflow = "visible"
    node.style.maxHeight = "none"

    const color = cssColorToRgb(style.color)
    const backgroundColor = cssColorToRgb(style.backgroundColor)
    const borderColor = cssColorToRgb(style.borderColor)

    if (color) node.style.color = color
    if (backgroundColor && backgroundColor !== "transparent") node.style.backgroundColor = backgroundColor
    if (borderColor && borderColor !== "transparent") node.style.borderColor = borderColor
  })
}

function unlockOverflowForCapture(element) {
  const restored = []
  let node = element

  while (node && node !== document.documentElement) {
    restored.push([node, node.style.cssText])
    node.style.overflow = "visible"
    node.style.height = "auto"
    node.style.maxHeight = "none"
    node = node.parentElement
  }

  return () => {
    restored.forEach(([target, cssText]) => {
      target.style.cssText = cssText
    })
  }
}

async function captureElement(element) {
  const html2canvas = (await import("html2canvas")).default
  const restoreOverflow = unlockOverflowForCapture(element)

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, element.clientWidth, 794),
      windowHeight: Math.max(element.scrollHeight, element.clientHeight),
      ignoreElements: (node) => node.classList?.contains("no-print"),
      onclone: (clonedDoc) => flattenCloneForPdf(clonedDoc),
    })
  } finally {
    restoreOverflow()
  }
}

export async function exportElementToPdf(element, filename) {
  if (!element) {
    throw new Error("Nothing to export yet.")
  }

  const canvas = await captureElement(element)
  await canvasToMultiPagePdf(canvas, filename)
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
