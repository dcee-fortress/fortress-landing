import React from "react"
import icons from "./iconsUsed.js"

const Icon = ({ name, size = 24, color = "currentColor", fill = "none", className, ...props }) => {
  const iconMarkup = (icons[name] || icons["circle-question-mark"]).replace(
    /<svg([^>]*)>/,
    (_, attrs) => {
      const cleaned = String(attrs).replace(/\s(width|height|fill)="[^"]*"/g, "")
      return `<svg width="${size}" height="${size}" fill="${fill || "none"}"${cleaned}>`
    }
  )

  return (
    <span className={className} {...props}>
      <span style={{ color }} dangerouslySetInnerHTML={{ __html: iconMarkup }} />
    </span>
  )
}

export default Icon
