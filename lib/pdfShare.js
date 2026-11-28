/**
 * Download a PDF blob, or share it to WhatsApp / the system share sheet.
 */

export function downloadPdfBlob(blob, filename) {
  const name = String(filename || "export.pdf").endsWith(".pdf")
    ? String(filename || "export.pdf")
    : `${filename}.pdf`
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  return name
}

export async function sharePdfToWhatsApp(blob, filename, message = "") {
  const name = String(filename || "export.pdf").endsWith(".pdf")
    ? String(filename || "export.pdf")
    : `${filename}.pdf`
  const file = new File([blob], name, { type: "application/pdf" })
  const text =
    String(message || "").trim() ||
    `Rodcroft PDF: ${name}`

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: name,
          text,
        })
        return { shared: true, method: "navigator.share" }
      }
    } catch (error) {
      if (error?.name === "AbortError") return { shared: false, method: "cancelled" }
      // Fall through to WhatsApp web + download.
    }
  }

  downloadPdfBlob(blob, name)
  const waUrl = `https://wa.me/?text=${encodeURIComponent(
    `${text}\n\nThe PDF “${name}” was downloaded on this device — attach it in WhatsApp.`
  )}`
  window.open(waUrl, "_blank", "noopener,noreferrer")
  return { shared: true, method: "whatsapp-link" }
}

export async function saveOrShareJsPdf(doc, filename, mode = "download", message = "") {
  const name = String(filename || "export.pdf").endsWith(".pdf")
    ? String(filename || "export.pdf")
    : `${filename}.pdf`
  const blob = doc.output("blob")
  if (mode === "whatsapp") {
    return sharePdfToWhatsApp(blob, name, message)
  }
  downloadPdfBlob(blob, name)
  return { shared: false, method: "download" }
}
