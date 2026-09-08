export default function PageFrame({ children, className = "", maxWidth = "app-content-shell" }) {
  return (
    <div className={`app-page-frame text-zinc-900 ${className}`}>
      <div className={`mx-auto w-full min-w-0 ${maxWidth === "app-content-shell" ? "app-content-shell" : maxWidth}`}>
        {children}
      </div>
    </div>
  )
}
