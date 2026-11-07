import { useState } from 'react'

export default function DrawingChatBar({
  disabled = false,
  busy = false,
  placeholder = 'Type next, or describe a correction…',
  onSend,
  onNext,
  showNext = true,
}) {
  const [value, setValue] = useState('')

  const submit = (event) => {
    event?.preventDefault?.()
    const text = value.trim()
    if (!text || disabled || busy) return
    onSend?.(text)
    setValue('')
  }

  return (
    <form className="drawing-chat-bar" onSubmit={submit}>
      <input
        type="text"
        value={value}
        disabled={disabled || busy}
        placeholder={placeholder}
        aria-label="Message the drawing brain"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="drawing-chat-send" disabled={disabled || busy || !value.trim()}>
        Send
      </button>
      {showNext ? (
        <button
          type="button"
          className="drawing-chat-next"
          disabled={disabled || busy}
          onClick={() => onNext?.()}
        >
          Next
        </button>
      ) : null}
    </form>
  )
}
