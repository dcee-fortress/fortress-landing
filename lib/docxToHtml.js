import { strFromU8, unzipSync } from "fflate"

const HIGHLIGHT_COLORS = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#c0c0c0",
  black: "#000000",
  white: "#ffffff",
}

const IMAGE_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
}

const LIST_TYPES = {
  decimal: "1",
  decimalZero: "1",
  lowerLetter: "a",
  upperLetter: "A",
  lowerRoman: "i",
  upperRoman: "I",
}

const EMU_PER_PX = 9525

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function elements(node, name) {
  return [...(node?.childNodes || [])].filter(
    (child) => child.nodeType === 1 && (!name || child.nodeName === name)
  )
}

function first(node, name) {
  return elements(node, name)[0] || null
}

function attr(node, name) {
  return node?.getAttribute?.(name) ?? null
}

function val(node) {
  return attr(node, "w:val")
}

function isOn(node) {
  const value = val(node)
  return !(value === "0" || value === "false" || value === "off" || value === "none")
}

function hexColor(value) {
  return /^[0-9a-f]{6}$/i.test(String(value || "")) ? `#${value}` : ""
}

function twipsToPt(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round((number / 20) * 100) / 100 : null
}

function twipsToPx(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number / 15) : null
}

function bytesToBase64(bytes) {
  let binary = ""
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function parseXml(text) {
  if (!text) return null
  const doc = new DOMParser().parseFromString(text, "application/xml")
  return doc.getElementsByTagName("parsererror").length > 0 ? null : doc
}

function resolvePartPath(basePath, target) {
  if (target.startsWith("/")) return target.slice(1)
  const parts = basePath.split("/").slice(0, -1)
  for (const segment of target.split("/")) {
    if (segment === "..") parts.pop()
    else if (segment && segment !== ".") parts.push(segment)
  }
  return parts.join("/")
}

function readRelationships(readText, partPath) {
  const slash = partPath.lastIndexOf("/")
  const relsPath = `${partPath.slice(0, slash + 1)}_rels/${partPath.slice(slash + 1)}.rels`
  const doc = parseXml(readText(relsPath))
  const rels = new Map()
  if (!doc) return rels
  for (const rel of doc.getElementsByTagName("Relationship")) {
    const target = attr(rel, "Target") || ""
    const external = attr(rel, "TargetMode") === "External"
    rels.set(attr(rel, "Id"), {
      type: attr(rel, "Type") || "",
      target: external ? target : resolvePartPath(partPath, target),
      external,
    })
  }
  return rels
}

function parseStyles(doc) {
  const styles = new Map()
  let defaultParagraphStyleId = ""
  const defaults = { pPr: null, rPr: null }
  if (!doc) return { styles, defaultParagraphStyleId, defaults }

  const docDefaults = doc.getElementsByTagName("w:docDefaults")[0]
  defaults.pPr = first(first(docDefaults, "w:pPrDefault"), "w:pPr")
  defaults.rPr = first(first(docDefaults, "w:rPrDefault"), "w:rPr")

  for (const style of doc.getElementsByTagName("w:style")) {
    const id = attr(style, "w:styleId")
    if (!id) continue
    const type = attr(style, "w:type")
    const conditional = new Map()
    for (const part of elements(style, "w:tblStylePr")) {
      conditional.set(attr(part, "w:type"), {
        pPr: first(part, "w:pPr"),
        rPr: first(part, "w:rPr"),
        tcPr: first(part, "w:tcPr"),
      })
    }
    styles.set(id, {
      type,
      name: String(val(first(style, "w:name")) || "").toLowerCase(),
      basedOn: val(first(style, "w:basedOn")),
      pPr: first(style, "w:pPr"),
      rPr: first(style, "w:rPr"),
      tblPr: first(style, "w:tblPr"),
      tcPr: first(style, "w:tcPr"),
      conditional,
    })
    if (type === "paragraph" && attr(style, "w:default") === "1") defaultParagraphStyleId = id
  }

  return { styles, defaultParagraphStyleId, defaults }
}

function parseNumbering(doc) {
  const nums = new Map()
  if (!doc) return nums

  const abstracts = new Map()
  for (const abstract of doc.getElementsByTagName("w:abstractNum")) {
    const levels = new Map()
    for (const level of elements(abstract, "w:lvl")) {
      levels.set(attr(level, "w:ilvl"), {
        format: val(first(level, "w:numFmt")) || "decimal",
        start: val(first(level, "w:start")),
      })
    }
    abstracts.set(attr(abstract, "w:abstractNumId"), levels)
  }

  for (const num of doc.getElementsByTagName("w:num")) {
    const levels = abstracts.get(val(first(num, "w:abstractNumId")))
    if (levels) nums.set(attr(num, "w:numId"), levels)
  }
  return nums
}

function styleChain(ctx, styleId) {
  const chain = []
  const seen = new Set()
  let current = styleId
  while (current && !seen.has(current) && chain.length < 12) {
    seen.add(current)
    const style = ctx.styles.get(current)
    if (!style) break
    chain.unshift(style)
    current = style.basedOn
  }
  return chain
}

function resolveParagraphProps(pPrList) {
  const props = {}
  for (const pPr of pPrList) {
    if (!pPr) continue
    for (const node of elements(pPr)) {
      switch (node.nodeName) {
        case "w:jc":
          props.align = val(node)
          break
        case "w:ind": {
          const left = attr(node, "w:left") ?? attr(node, "w:start")
          const right = attr(node, "w:right") ?? attr(node, "w:end")
          if (left !== null) props.indentLeft = left
          if (right !== null) props.indentRight = right
          if (attr(node, "w:firstLine") !== null) {
            props.firstLine = attr(node, "w:firstLine")
            props.hanging = null
          }
          if (attr(node, "w:hanging") !== null) {
            props.hanging = attr(node, "w:hanging")
            props.firstLine = null
          }
          break
        }
        case "w:spacing":
          if (attr(node, "w:before") !== null) props.before = attr(node, "w:before")
          if (attr(node, "w:after") !== null) props.after = attr(node, "w:after")
          if (attr(node, "w:line") !== null) {
            props.line = attr(node, "w:line")
            props.lineRule = attr(node, "w:lineRule") || "auto"
          }
          break
        case "w:shd":
          props.shade = hexColor(attr(node, "w:fill"))
          break
        case "w:numPr": {
          const numId = val(first(node, "w:numId"))
          const level = val(first(node, "w:ilvl"))
          if (numId !== null) props.numId = numId
          if (level !== null) props.level = level
          break
        }
        default:
          break
      }
    }
  }
  return props
}

function resolveRunProps(rPrList) {
  const props = {}
  for (const rPr of rPrList) {
    if (!rPr) continue
    for (const node of elements(rPr)) {
      switch (node.nodeName) {
        case "w:b":
          props.bold = isOn(node)
          break
        case "w:i":
          props.italic = isOn(node)
          break
        case "w:u":
          props.underline = val(node) !== "none"
          break
        case "w:strike":
        case "w:dstrike":
          props.strike = isOn(node)
          break
        case "w:color":
          props.color = hexColor(val(node))
          break
        case "w:sz": {
          const size = Number(val(node)) / 2
          if (size > 0) props.size = size
          break
        }
        case "w:highlight":
          props.highlight = HIGHLIGHT_COLORS[val(node)] || ""
          break
        case "w:shd":
          props.shade = hexColor(attr(node, "w:fill"))
          break
        case "w:rFonts": {
          const font = attr(node, "w:ascii") || attr(node, "w:hAnsi")
          if (font) props.font = font
          break
        }
        case "w:vertAlign":
          props.vertAlign = val(node)
          break
        case "w:caps":
          props.caps = isOn(node)
          break
        case "w:smallCaps":
          props.smallCaps = isOn(node)
          break
        case "w:vanish":
          props.hidden = isOn(node)
          break
        default:
          break
      }
    }
  }
  return props
}

function runCss(props, inHeading) {
  const css = []
  if (props.bold) css.push("font-weight:700")
  else if (inHeading) css.push("font-weight:400")
  if (props.italic) css.push("font-style:italic")
  const decoration = [props.underline && "underline", props.strike && "line-through"].filter(Boolean)
  if (decoration.length > 0) css.push(`text-decoration:${decoration.join(" ")}`)
  if (props.color) css.push(`color:${props.color}`)
  if (props.size && (props.size !== 11 || inHeading)) css.push(`font-size:${props.size}pt`)
  const background = props.highlight || props.shade
  if (background) css.push(`background-color:${background}`)
  if (props.font && !/^calibri$/i.test(props.font)) {
    css.push(`font-family:'${props.font.replace(/['"\\;]/g, "")}', Calibri, Arial, sans-serif`)
  }
  if (props.caps) css.push("text-transform:uppercase")
  if (props.smallCaps) css.push("font-variant:small-caps")
  return css.join(";")
}

function paragraphCss(props, { list = false } = {}) {
  const css = []
  const align = { center: "center", right: "right", end: "right", both: "justify", distribute: "justify" }[
    props.align
  ]
  if (align) css.push(`text-align:${align}`)
  if (props.shade) css.push(`background-color:${props.shade}`)
  if (list) return css.join(";")

  const before = twipsToPt(props.before)
  const after = twipsToPt(props.after)
  css.push(`margin-top:${before ?? 0}pt`)
  css.push(`margin-bottom:${after ?? 0}pt`)
  const left = twipsToPt(props.indentLeft)
  const right = twipsToPt(props.indentRight)
  if (left) css.push(`margin-left:${left}pt`)
  if (right) css.push(`margin-right:${right}pt`)
  const firstLine = twipsToPt(props.firstLine)
  const hanging = twipsToPt(props.hanging)
  if (firstLine) css.push(`text-indent:${firstLine}pt`)
  else if (hanging) css.push(`text-indent:-${hanging}pt`)
  const line = Number(props.line)
  if (line > 0) {
    css.push(
      props.lineRule === "auto"
        ? `line-height:${Math.round((line / 240) * 100) / 100}`
        : `line-height:${twipsToPt(line)}pt`
    )
  }
  return css.join(";")
}

function headingLevel(chain) {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const name = chain[index].name
    const match = name.match(/^heading\s*([1-6])$/)
    if (match) return Number(match[1])
    if (name === "title") return 1
    if (name === "subtitle") return 2
  }
  return 0
}

function imageTag(ctx, relId, width, height, alt) {
  const rel = ctx.rels.get(relId)
  if (!rel || rel.external) return ""
  const extension = rel.target.split(".").pop().toLowerCase()
  const mime = IMAGE_TYPES[extension]
  const bytes = ctx.files[rel.target]
  if (!bytes) return ""
  if (!mime) {
    ctx.skippedImages += 1
    return ""
  }
  const size = [
    width > 0 ? ` width="${Math.round(width)}"` : "",
    height > 0 ? ` height="${Math.round(height)}"` : "",
  ].join("")
  return `<img src="data:${mime};base64,${bytesToBase64(bytes)}"${size} alt="${escapeHtml(alt || "")}">`
}

function renderTextBox(container, ctx, runBase) {
  const lines = elements(container, "w:p").map((paragraph) => renderInline(paragraph, ctx, runBase))
  if (lines.length === 0) return ""
  return `<span style="display:inline-block;border:1px solid #d4d4d8;padding:4px 8px;">${lines.join("<br>")}</span>`
}

function renderDrawing(drawing, ctx, runBase) {
  const blip = drawing.getElementsByTagName("a:blip")[0]
  if (blip) {
    const extent = drawing.getElementsByTagName("wp:extent")[0]
    const docPr = drawing.getElementsByTagName("wp:docPr")[0]
    return imageTag(
      ctx,
      attr(blip, "r:embed"),
      Number(attr(extent, "cx")) / EMU_PER_PX,
      Number(attr(extent, "cy")) / EMU_PER_PX,
      attr(docPr, "descr") || attr(docPr, "title")
    )
  }
  const textBox = drawing.getElementsByTagName("w:txbxContent")[0]
  return textBox ? renderTextBox(textBox, ctx, runBase) : ""
}

function vmlSizeToPx(style, property) {
  const match = String(style || "").match(new RegExp(`${property}\\s*:\\s*([\\d.]+)(pt|px|in)?`, "i"))
  if (!match) return 0
  const number = Number(match[1])
  if (match[2] === "in") return number * 96
  if (match[2] === "px") return number
  return (number * 4) / 3
}

function renderVml(node, ctx, runBase) {
  const imageData = node.getElementsByTagName("v:imagedata")[0]
  if (imageData) {
    const shape = imageData.parentNode
    const style = attr(shape, "style")
    return imageTag(
      ctx,
      attr(imageData, "r:id"),
      vmlSizeToPx(style, "width"),
      vmlSizeToPx(style, "height"),
      attr(imageData, "o:title")
    )
  }
  const textBox = node.getElementsByTagName("w:txbxContent")[0]
  return textBox ? renderTextBox(textBox, ctx, runBase) : ""
}

function renderRunContent(nodes, ctx, runBase) {
  let html = ""
  for (const node of nodes) {
    switch (node.nodeName) {
      case "w:t":
        html += escapeHtml(node.textContent)
        break
      case "w:tab":
        html += "\t"
        break
      case "w:br":
        if (attr(node, "w:type") !== "page") html += "<br>"
        break
      case "w:cr":
        html += "<br>"
        break
      case "w:noBreakHyphen":
        html += "\u2011"
        break
      case "w:drawing":
        html += renderDrawing(node, ctx, runBase)
        break
      case "w:pict":
      case "w:object":
        html += renderVml(node, ctx, runBase)
        break
      case "mc:AlternateContent": {
        const choice = first(node, "mc:Choice") || first(node, "mc:Fallback")
        html += renderRunContent(elements(choice), ctx, runBase)
        break
      }
      default:
        break
    }
  }
  return html
}

function renderRun(run, ctx, runBase) {
  const rPr = first(run, "w:rPr")
  const runStyle = styleChain(ctx, val(first(rPr, "w:rStyle"))).map((style) => style.rPr)
  const props = resolveRunProps([...runBase, ...runStyle, rPr])
  if (props.hidden) return ""

  let html = renderRunContent(elements(run), ctx, runBase)
  if (!html) return ""
  if (props.vertAlign === "superscript") html = `<sup>${html}</sup>`
  else if (props.vertAlign === "subscript") html = `<sub>${html}</sub>`
  const css = runCss(props, ctx.inHeading)
  return css ? `<span style="${css}">${html}</span>` : html
}

function renderInline(container, ctx, runBase) {
  let html = ""
  for (const node of elements(container)) {
    switch (node.nodeName) {
      case "w:r":
        html += renderRun(node, ctx, runBase)
        break
      case "w:hyperlink": {
        const inner = renderInline(node, ctx, runBase)
        const rel = ctx.rels.get(attr(node, "r:id"))
        const href = rel?.external ? rel.target : ""
        html += /^(https?:|mailto:)/i.test(href)
          ? `<a href="${escapeHtml(href)}">${inner}</a>`
          : inner
        break
      }
      case "w:ins":
      case "w:smartTag":
      case "w:customXml":
      case "w:fldSimple":
      case "w:dir":
      case "w:bdo":
        html += renderInline(node, ctx, runBase)
        break
      case "w:sdt":
        html += renderInline(first(node, "w:sdtContent"), ctx, runBase)
        break
      case "mc:AlternateContent":
        html += renderInline(first(node, "mc:Choice") || first(node, "mc:Fallback"), ctx, runBase)
        break
      default:
        break
    }
  }
  return html
}

function renderParagraph(paragraph, ctx) {
  const pPr = first(paragraph, "w:pPr")
  const chain = styleChain(ctx, val(first(pPr, "w:pStyle")) || ctx.defaultParagraphStyleId)
  const props = resolveParagraphProps([
    ctx.defaults.pPr,
    ...ctx.table.pPr,
    ...chain.map((style) => style.pPr),
    pPr,
  ])
  const runBase = [ctx.defaults.rPr, ...ctx.table.rPr, ...chain.map((style) => style.rPr)]
  const heading = headingLevel(chain)

  ctx.inHeading = heading > 0
  const inner = renderInline(paragraph, ctx, runBase)
  ctx.inHeading = false

  const levels = props.numId && props.numId !== "0" ? ctx.numbering.get(props.numId) : null
  if (levels) {
    const level = Math.min(Number(props.level) || 0, 8)
    const definition = levels.get(String(level)) || { format: "bullet" }
    const ordered = definition.format !== "bullet" && definition.format !== "none"
    const listType = LIST_TYPES[definition.format]
    const start = Number(definition.start)
    return {
      list: {
        numId: props.numId,
        level,
        tag: ordered ? "ol" : "ul",
        attrs: [
          ordered && listType && listType !== "1" ? ` type="${listType}"` : "",
          ordered && start > 1 ? ` start="${start}"` : "",
          definition.format === "none" ? ' style="list-style-type:none"' : "",
        ].join(""),
      },
      style: paragraphCss(props, { list: true }),
      inner: inner || "<br>",
    }
  }

  const tag = heading ? `h${heading}` : "p"
  const css = paragraphCss(props)
  return { html: `<${tag}${css ? ` style="${css}"` : ""}>${inner || "<br>"}</${tag}>` }
}

function borderCss(node) {
  if (!node) return undefined
  const kind = val(node)
  if (!kind || kind === "nil" || kind === "none") return "none"
  const width = Math.max(0.5, (Number(attr(node, "w:sz")) || 4) / 8)
  const color = hexColor(attr(node, "w:color")) || "#000000"
  const style =
    kind === "double" ? "double" : kind === "dotted" ? "dotted" : /dash/i.test(kind) ? "dashed" : "solid"
  return `${style === "double" ? Math.max(width, 2.25) : width}pt ${style} ${color}`
}

function readBorders(bordersNode, into) {
  if (!bordersNode) return into
  const sides = {
    top: "w:top",
    bottom: "w:bottom",
    left: ["w:left", "w:start"],
    right: ["w:right", "w:end"],
    insideH: "w:insideH",
    insideV: "w:insideV",
  }
  for (const [side, names] of Object.entries(sides)) {
    const node = [names].flat().map((name) => first(bordersNode, name)).find(Boolean)
    const css = borderCss(node)
    if (css) into[side] = css
  }
  return into
}

function tableWidthCss(tblW, gridPx) {
  const type = attr(tblW, "w:type")
  const raw = attr(tblW, "w:w") || ""
  if (type === "pct") {
    const pct = raw.endsWith("%") ? Number(raw.slice(0, -1)) : Number(raw) / 50
    if (pct > 0) return `width:${Math.min(pct, 100)}%;`
  }
  if (type === "dxa" && Number(raw) > 0) return `width:${twipsToPx(raw)}px;`
  return gridPx > 0 ? `width:${gridPx}px;` : ""
}

function renderTable(table, ctx) {
  const tblPr = first(table, "w:tblPr")
  const chain = styleChain(ctx, val(first(tblPr, "w:tblStyle")))
  const borders = {}
  for (const style of chain) readBorders(first(style.tblPr, "w:tblBorders"), borders)
  readBorders(first(tblPr, "w:tblBorders"), borders)

  const look = first(tblPr, "w:tblLook")
  const lookValue = parseInt(val(look) || "0", 16) || 0
  const useFirstRow = attr(look, "w:firstRow") === "1" || (lookValue & 0x0020) !== 0
  const firstRowStyle = [...chain].reverse().map((style) => style.conditional.get("firstRow")).find(Boolean)
  const styleShade = [...chain]
    .reverse()
    .map((style) => hexColor(attr(first(style.tcPr, "w:shd"), "w:fill")))
    .find(Boolean)

  const grid = elements(first(table, "w:tblGrid"), "w:gridCol").map((col) => twipsToPx(attr(col, "w:w")) || 0)
  const gridPx = grid.reduce((sum, width) => sum + width, 0)
  const alignCss = val(first(tblPr, "w:jc")) === "center" ? "margin-left:auto;margin-right:auto;" : ""

  const rows = elements(table, "w:tr")
  const rowCells = rows.map((row) => {
    let column = Number(val(first(first(row, "w:trPr"), "w:gridBefore"))) || 0
    return elements(row, "w:tc").map((cell) => {
      const tcPr = first(cell, "w:tcPr")
      const span = Number(val(first(tcPr, "w:gridSpan"))) || 1
      const mergeNode = first(tcPr, "w:vMerge")
      const vMerge = mergeNode ? (val(mergeNode) === "restart" ? "restart" : "continue") : null
      const entry = { cell, tcPr, column, span, vMerge, rowspan: 1 }
      column += span
      return entry
    })
  })

  rowCells.forEach((cells, rowIndex) => {
    for (const entry of cells) {
      if (entry.vMerge !== "restart") continue
      for (let below = rowIndex + 1; below < rowCells.length; below += 1) {
        const match = rowCells[below].find((other) => other.column === entry.column)
        if (match?.vMerge !== "continue") break
        entry.rowspan += 1
      }
    }
  })

  const columnCount = Math.max(grid.length, ...rowCells.map((cells) => cells.reduce((n, c) => n + c.span, 0)))
  const savedTable = ctx.table
  let body = ""

  rowCells.forEach((cells, rowIndex) => {
    const isFirstRow = rowIndex === 0 && useFirstRow && firstRowStyle
    ctx.table = {
      pPr: [...chain.map((style) => style.pPr), isFirstRow ? firstRowStyle.pPr : null],
      rPr: [...chain.map((style) => style.rPr), isFirstRow ? firstRowStyle.rPr : null],
    }

    body += "<tr>"
    for (const entry of cells) {
      if (entry.vMerge === "continue") continue
      const cellBorders = readBorders(first(entry.tcPr, "w:tcBorders"), {})
      const lastRow = rowIndex + entry.rowspan - 1 === rowCells.length - 1
      const edges = {
        top: cellBorders.top ?? (rowIndex === 0 ? borders.top : borders.insideH),
        bottom: cellBorders.bottom ?? (lastRow ? borders.bottom : borders.insideH),
        left: cellBorders.left ?? (entry.column === 0 ? borders.left : borders.insideV),
        right: cellBorders.right ?? (entry.column + entry.span >= columnCount ? borders.right : borders.insideV),
      }
      const css = Object.entries(edges).map(([side, value]) => `border-${side}:${value || "none"}`)
      const shade =
        hexColor(attr(first(entry.tcPr, "w:shd"), "w:fill")) ||
        (isFirstRow ? hexColor(attr(first(firstRowStyle.tcPr, "w:shd"), "w:fill")) : "") ||
        styleShade
      if (shade) css.push(`background-color:${shade}`)
      const tcW = first(entry.tcPr, "w:tcW")
      if (attr(tcW, "w:type") === "dxa" && Number(attr(tcW, "w:w")) > 0) {
        css.push(`width:${twipsToPx(attr(tcW, "w:w"))}px`)
      }
      const vAlign = { center: "middle", bottom: "bottom" }[val(first(entry.tcPr, "w:vAlign"))]
      css.push(`vertical-align:${vAlign || "top"}`)
      css.push("padding:2px 7px")

      const spans = [
        entry.span > 1 ? ` colspan="${entry.span}"` : "",
        entry.rowspan > 1 ? ` rowspan="${entry.rowspan}"` : "",
      ].join("")
      body += `<td${spans} style="${css.join(";")}">${renderBlocks(entry.cell, ctx) || "<br>"}</td>`
    }
    body += "</tr>"
  })

  ctx.table = savedTable
  const colgroup = grid.length > 0 ? `<colgroup>${grid.map((width) => `<col style="width:${width}px">`).join("")}</colgroup>` : ""
  return `<table style="border-collapse:collapse;${tableWidthCss(first(tblPr, "w:tblW"), gridPx)}${alignCss}margin-top:12px;margin-bottom:12px;">${colgroup}<tbody>${body}</tbody></table>`
}

function collectBlocks(container, ctx, blocks) {
  for (const node of elements(container)) {
    if (node.nodeName === "w:p") blocks.push(renderParagraph(node, ctx))
    else if (node.nodeName === "w:tbl") blocks.push({ html: renderTable(node, ctx) })
    else if (node.nodeName === "w:sdt") collectBlocks(first(node, "w:sdtContent"), ctx, blocks)
    else if (node.nodeName === "w:customXml" || node.nodeName === "w:ins") collectBlocks(node, ctx, blocks)
  }
  return blocks
}

function assembleBlocks(blocks) {
  let html = ""
  const stack = []

  const closeTop = () => {
    const top = stack.pop()
    if (top.itemOpen) html += "</li>"
    html += `</${top.tag}>`
  }
  const closeTo = (depth) => {
    while (stack.length > depth) closeTop()
  }

  for (const block of blocks) {
    if (!block.list) {
      closeTo(0)
      html += block.html
      continue
    }

    const { numId, level, tag, attrs } = block.list
    const depth = level + 1
    if (stack.length > 0 && stack[0].numId !== numId) closeTo(0)
    closeTo(depth)

    while (stack.length < depth) {
      const parent = stack.at(-1)
      if (parent && !parent.itemOpen) {
        html += '<li style="list-style-type:none">'
        parent.itemOpen = true
      }
      html += `<${tag}${attrs}>`
      stack.push({ tag, numId, itemOpen: false })
    }

    const top = stack.at(-1)
    if (top.itemOpen) html += "</li>"
    html += `<li${block.style ? ` style="${block.style}"` : ""}>${block.inner}`
    top.itemOpen = true
  }

  closeTo(0)
  return html
}

function renderBlocks(container, ctx) {
  return assembleBlocks(collectBlocks(container, ctx, []))
}

/**
 * Converts a Word .docx file into HTML for the rich text editor, keeping headings, text
 * formatting, alignment, spacing, lists, tables (borders, shading, merged cells) and pictures.
 */
export async function docxToHtml(file) {
  let files
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error("This file could not be opened. Choose a Word document saved as .docx.")
  }

  const readText = (path) => (files[path] ? strFromU8(files[path]) : "")
  const packageRels = parseXml(readText("_rels/.rels"))
  const officeRel = packageRels
    ? [...packageRels.getElementsByTagName("Relationship")].find((rel) =>
        /\/officeDocument$/.test(attr(rel, "Type") || "")
      )
    : null
  const documentPath = officeRel
    ? resolvePartPath("", attr(officeRel, "Target") || "")
    : "word/document.xml"

  const documentXml = parseXml(readText(documentPath))
  const body = documentXml?.getElementsByTagName("w:body")[0]
  if (!body) {
    throw new Error("This file is not a Word document. Choose a .docx file.")
  }

  const rels = readRelationships(readText, documentPath)
  const relTarget = (suffix) =>
    [...rels.values()].find((rel) => rel.type.endsWith(`/${suffix}`))?.target
  const { styles, defaultParagraphStyleId, defaults } = parseStyles(
    parseXml(readText(relTarget("styles") || "word/styles.xml"))
  )

  const ctx = {
    files,
    rels,
    styles,
    defaultParagraphStyleId,
    defaults,
    numbering: parseNumbering(parseXml(readText(relTarget("numbering") || "word/numbering.xml"))),
    table: { pPr: [], rPr: [] },
    inHeading: false,
    skippedImages: 0,
  }

  return { html: renderBlocks(body, ctx), skippedImages: ctx.skippedImages }
}
