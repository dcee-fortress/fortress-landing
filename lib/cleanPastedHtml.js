const REMOVED_TAGS =
  "script, style, meta, link, title, xml, iframe, object, embed, form, input, button, select, textarea"

const KEPT_STYLE_PROPERTIES =
  /^(color|background-color|font-weight|font-style|font-size|font-family|font-variant|text-transform|text-decoration(-line|-color|-style)?|text-align|text-indent|line-height|vertical-align|margin-(top|right|bottom|left)|border-(top|right|bottom|left)-(width|style|color)|border-collapse|padding-(top|right|bottom|left)|list-style-type)$/

const SIZED_TAGS = new Set(["TABLE", "TD", "TH", "COL", "COLGROUP", "IMG"])

const KEPT_ATTRIBUTES = {
  A: ["href"],
  IMG: ["src", "alt", "width", "height"],
  TABLE: ["width"],
  TD: ["colspan", "rowspan", "width"],
  TH: ["colspan", "rowspan", "width"],
  COL: ["width", "span"],
  OL: ["start", "type"],
}

function unwrap(element) {
  element.replaceWith(...element.childNodes)
}

function renameElement(element, tagName) {
  const next = element.ownerDocument.createElement(tagName)
  for (const attribute of [...element.attributes]) next.setAttribute(attribute.name, attribute.value)
  next.append(...element.childNodes)
  element.replaceWith(next)
  return next
}

function removeComments(doc) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT)
  const comments = []
  while (walker.nextNode()) comments.push(walker.currentNode)
  comments.forEach((comment) => comment.remove())
}

function removeOfficeNamespaceTags(body) {
  for (const element of [...body.getElementsByTagName("*")]) {
    if (!element.isConnected || !element.tagName.includes(":")) continue
    if (element.tagName.startsWith("V:")) element.remove()
    else unwrap(element)
  }
}

function getWordListId(element) {
  const style = element.getAttribute("style") || ""
  return style.match(/mso-list\s*:\s*(l\d+)/i)?.[1] || ""
}

function removeEmptyWrappers(element) {
  let current = element
  while (current?.tagName === "SPAN" && !current.textContent.trim() && !current.querySelector("img")) {
    const parent = current.parentElement
    current.remove()
    current = parent
  }
}

/** Word pastes bullet / numbered lists as paragraphs with a fake marker; rebuild real lists. */
function convertWordLists(body) {
  const doc = body.ownerDocument
  const paragraphs = [...body.querySelectorAll("p, h1, h2, h3, h4, h5, h6")].filter(
    getWordListId
  )

  const groups = []
  for (const paragraph of paragraphs) {
    const group = groups.at(-1)
    const continuesGroup =
      group &&
      group.at(-1).nextElementSibling === paragraph &&
      getWordListId(group.at(-1)) === getWordListId(paragraph)
    if (continuesGroup) group.push(paragraph)
    else groups.push([paragraph])
  }

  for (const group of groups) {
    const stack = []
    const roots = []

    for (const paragraph of group) {
      const style = paragraph.getAttribute("style") || ""
      const level = Number(style.match(/level(\d+)/i)?.[1]) || 1
      const marker = paragraph.querySelector('[style*="mso-list:Ignore" i]')
      const markerText = String(marker?.textContent || "").replace(/\u00a0/g, " ").trim()
      const markerParent = marker?.parentElement
      marker?.remove()
      removeEmptyWrappers(markerParent)
      const ordered = /^[([]?([0-9]+|[a-z]|[ivxlcdm]+)[.)\]]/i.test(markerText)

      while (stack.length > 0 && stack.at(-1).level > level) stack.pop()

      if (stack.length === 0 || stack.at(-1).level < level) {
        const list = doc.createElement(ordered ? "ol" : "ul")
        if (stack.length === 0) {
          roots.push(list)
        } else {
          const parentItem = stack.at(-1).list.lastElementChild
          ;(parentItem || stack.at(-1).list).append(list)
        }
        stack.push({ level, list })
      }

      const item = doc.createElement("li")
      item.append(...paragraph.childNodes)
      stack.at(-1).list.append(item)
    }

    group[0].replaceWith(...roots)
    group.slice(1).forEach((paragraph) => paragraph.remove())
  }
}

function cleanStyle(element) {
  const style = element.style
  if (!style || style.length === 0) {
    element.removeAttribute("style")
    return
  }

  const kept = []
  for (const property of [...style]) {
    const allowed =
      KEPT_STYLE_PROPERTIES.test(property) || (property === "width" && SIZED_TAGS.has(element.tagName))
    if (allowed) kept.push(`${property}: ${style.getPropertyValue(property)}`)
  }

  if (kept.length > 0) element.setAttribute("style", kept.join("; "))
  else element.removeAttribute("style")
}

function cleanAttributes(element) {
  const align = element.getAttribute("align")
  if (align && !element.style.textAlign && element.tagName !== "TABLE") {
    element.style.textAlign = align
  }

  cleanStyle(element)

  const allowed = new Set(["style", ...(KEPT_ATTRIBUTES[element.tagName] || [])])
  for (const attribute of [...element.attributes]) {
    if (!allowed.has(attribute.name.toLowerCase())) element.removeAttribute(attribute.name)
  }

  if (element.tagName === "A" && /^\s*javascript:/i.test(element.getAttribute("href") || "")) {
    element.removeAttribute("href")
  }
}

function styleTables(body) {
  for (const table of body.querySelectorAll("table")) {
    table.style.borderCollapse = "collapse"
    table.style.margin = "12px 0"
    for (const cell of table.querySelectorAll("td, th")) {
      const hasBorderSetting = ["Top", "Right", "Bottom", "Left"].some(
        (side) => cell.style[`border${side}Style`]
      )
      if (!hasBorderSetting) cell.style.border = "1px solid #d4d4d8"
      if (!cell.style.paddingTop) cell.style.padding = "6px 8px"
    }
  }
}

function hexToBase64(hex) {
  let binary = ""
  for (let index = 0; index + 1 < hex.length; index += 2) {
    binary += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16))
  }
  return btoa(binary)
}

const RTF_PICTURE_HEADER =
  /{\\pict[\s\S]+?\\bliptag-?\d+(\\blipupi-?\d+)?({\\\*\\blipuid\s?[\da-fA-F]+)?[\s}]*?/
const RTF_PICTURE = new RegExp(`(?:(${RTF_PICTURE_HEADER.source}))([\\da-fA-F\\s]+)\\}`, "g")

/**
 * Word's HTML clipboard only links pictures to temporary files on the PC; the RTF copy on the
 * clipboard carries the real bytes. Returns them as data URLs in document order.
 */
export function extractRtfImages(rtf) {
  if (typeof window === "undefined" || !rtf) return []

  const images = []
  for (const picture of rtf.match(RTF_PICTURE) || []) {
    const type = picture.includes("\\pngblip")
      ? "image/png"
      : picture.includes("\\jpegblip")
        ? "image/jpeg"
        : ""
    if (!type) continue
    const hex = picture.replace(RTF_PICTURE_HEADER, "").replace(/[^\da-fA-F]/g, "")
    if (hex) images.push(`data:${type};base64,${hexToBase64(hex)}`)
  }
  return images
}

/**
 * Cleans HTML pasted from MS Word (or Excel, Google Docs, web pages) so headings, bold /
 * italic / underline, colours, alignment, spacing, lists, tables and pictures survive, while
 * Office-only markup and scripts are dropped. `localImages` (from `extractRtfImages`) replace
 * Word's local file pictures in order.
 */
export function cleanPastedHtml(html, { localImages = [] } = {}) {
  if (typeof window === "undefined" || !html) return ""

  const doc = new DOMParser().parseFromString(html, "text/html")
  const body = doc.body

  removeComments(doc)
  body.querySelectorAll(REMOVED_TAGS).forEach((element) => element.remove())
  removeOfficeNamespaceTags(body)

  let localIndex = 0
  body.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") || ""
    if (/^(data:image\/|https?:)/i.test(src)) return
    const replacement = /^file:/i.test(src) ? localImages[localIndex++] : ""
    if (replacement) image.setAttribute("src", replacement)
    else image.remove()
  })

  body.querySelectorAll("p.MsoTitle").forEach((element) => renameElement(element, "h1"))
  body.querySelectorAll("p.MsoSubtitle").forEach((element) => renameElement(element, "h2"))
  body.querySelectorAll('b[id^="docs-internal-guid"]').forEach(unwrap)

  convertWordLists(body)

  for (const element of [...body.getElementsByTagName("*")]) cleanAttributes(element)

  styleTables(body)

  for (const element of [...body.querySelectorAll("span, font")]) {
    if (element.tagName === "FONT" || element.attributes.length === 0) unwrap(element)
  }

  return body.innerHTML.trim()
}
