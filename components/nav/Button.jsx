import React from 'react'

export default function Button({children, onClick, className, ...props}) {
  return (
    <button onClick={onClick} {...props} className={`flex flex-col items-center cursor-pointer ${className && className}`}>{children}</button>
  )
}
