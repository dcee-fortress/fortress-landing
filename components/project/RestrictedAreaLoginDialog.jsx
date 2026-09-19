"use client"

import { useState } from "react"
import {
  unlockRestrictedArea,
  validateRestrictedAreaCredentials,
} from "@/lib/restrictedAreaAuth"

export default function RestrictedAreaLoginDialog({
  open,
  title = "Restricted area",
  description = "Enter the username and password to continue.",
  onCancel,
  onUnlocked,
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  if (!open) return null

  function handleSubmit(event) {
    event.preventDefault()
    if (!validateRestrictedAreaCredentials(username, password)) {
      setError("Incorrect username or password.")
      return
    }
    unlockRestrictedArea()
    setError("")
    setUsername("")
    setPassword("")
    onUnlocked?.()
  }

  function handleCancel() {
    setError("")
    setUsername("")
    setPassword("")
    onCancel?.()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restricted-login-title"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-xl"
      >
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Login required</p>
          <h2 id="restricted-login-title" className="text-2xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
          <p className="text-sm text-zinc-500">{description}</p>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="restricted-dialog-username" className="block text-sm font-medium text-zinc-700">
              Username
            </label>
            <input
              id="restricted-dialog-username"
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
            <label htmlFor="restricted-dialog-password" className="block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              id="restricted-dialog-password"
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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
