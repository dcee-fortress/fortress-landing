"use client"

import { useEffect, useState } from "react"
import {
  isRestrictedAreaRemembered,
  unlockRestrictedArea,
  validateRestrictedAreaCredentials,
} from "@/lib/restrictedAreaAuth"

export default function RestrictedAreaGate({ title = "Restricted area", children }) {
  const [ready, setReady] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setUnlocked(isRestrictedAreaRemembered())
    setReady(true)
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    if (!validateRestrictedAreaCredentials(username, password)) {
      setError("Incorrect username or password.")
      return
    }
    unlockRestrictedArea({ remember })
    setError("")
    setUnlocked(true)
  }

  if (!ready) {
    return (
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell">
          <p className="text-sm text-zinc-500">Checking access…</p>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
            <header className="space-y-1">
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Login required</p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
              <p className="text-sm text-zinc-500">
                Enter the username and password to open this page. Without saving, you will be asked
                again next time.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="restricted-username" className="block text-sm font-medium text-zinc-700">
                  Username
                </label>
                <input
                  id="restricted-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setError("")
                  }}
                  autoFocus
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                />
              </div>

              <div>
                <label htmlFor="restricted-password" className="block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <input
                  id="restricted-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError("")
                  }}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500/30"
                />
                <span>Save username and password so this opens automatically next time</span>
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return children
}
