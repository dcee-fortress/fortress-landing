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

async function captureElement(element) {
  const html2canvas = (await import("html2canvas")).default

  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    windowHeight: Math.max(element.scrollHeight, element.clientHeight),
    ignoreElements: (node) => node.classList?.contains("no-print"),
    onclone: (clonedDoc) => {
      clonedDoc.querySelectorAll(".no-print").forEach((node) => node.remove())
      clonedDoc.querySelectorAll(".overflow-hidden").forEach((node) => {
        node.style.overflow = "visible"
      })
    },
  })
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
