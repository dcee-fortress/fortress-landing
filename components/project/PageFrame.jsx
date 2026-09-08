export default function PageFrame({ children, className = "", maxWidth = "max-w-6xl" }) {
  return (
    <div className={`app-page-frame text-zinc-900 ${className}`}>
      <div className={`mx-auto w-full min-w-0 ${maxWidth}`}>{children}</div>
    </div>
  )
}
