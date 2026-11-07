import { useEffect, useRef } from 'react'

export default function DrawingExplainPane({ messages = [], busy = false, children }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, children])

  return (
    <div className="drawing-explain-pane" role="log" aria-live="polite">
      {messages.map((msg) => (
        <article
          key={msg.id}
          className={`drawing-msg drawing-msg-${msg.role === 'user' ? 'user' : 'assistant'}`}
        >
          <header>{msg.role === 'user' ? 'You' : 'Fortress'}</header>
          <pre className="drawing-msg-body">{msg.text}</pre>
        </article>
      ))}
      {children}
      {busy ? (
        <article className="drawing-msg drawing-msg-assistant drawing-msg-busy">
          <header>Fortress</header>
          <p>Reading the drawing…</p>
        </article>
      ) : null}
      <div ref={endRef} />
    </div>
  )
}
