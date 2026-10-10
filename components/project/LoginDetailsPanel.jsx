"use client"

import { useState } from "react"
import Icon from "@/components/icon/icon"
import {
  getCeoDashboardCredentials,
  saveCeoDashboardCredentials,
  validateCeoDashboardCredentials,
} from "@/lib/ceoDashboardAuth"
import { FINANCE_ENTRY_PASSWORD, FINANCE_ENTRY_USERNAME } from "@/lib/financeEntryAuth"
import { PPE_ENTRY_PASSWORD, PPE_ENTRY_USERNAME } from "@/lib/ppeEntryAuth"
import { RESTRICTED_AREA_PASSWORD, RESTRICTED_AREA_USERNAME } from "@/lib/restrictedAreaAuth"

function EyeButton({ visible, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
    >
      <Icon name={visible ? "eye-off" : "eye"} size={16} />
    </button>
  )
}

function MaskedPassword({ value }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className={`font-medium text-zinc-900 ${visible ? "" : "tracking-widest"}`}>
        {visible ? value : "••••••••"}
      </span>
      <EyeButton
        visible={visible}
        onClick={() => setVisible((open) => !open)}
        label="password"
      />
    </span>
  )
}

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
        />
        <span className="absolute inset-y-0 right-1 flex items-center">
          <EyeButton
            visible={visible}
            onClick={() => setVisible((open) => !open)}
            label={label.toLowerCase()}
          />
        </span>
      </div>
    </div>
  )
}

const LOGIN_GROUPS = [
  {
    department: "QS and Engineering",
    pages: [
      {
        name: "Material schedule",
        username: RESTRICTED_AREA_USERNAME,
        password: RESTRICTED_AREA_PASSWORD,
      },
    ],
  },
  {
    department: "Finance",
    pages: ["Petty cash", "Food cash", "Goods requested", "Goods received"].map((name) => ({
      name,
      username: FINANCE_ENTRY_USERNAME,
      password: FINANCE_ENTRY_PASSWORD,
    })),
  },
  {
    department: "Safety and Health",
    pages: [
      "PPE received",
      "PPE issued",
      "Site inspection",
      "Incident report",
      "Weekly report",
    ].map((name) => ({
      name,
      username: PPE_ENTRY_USERNAME,
      password: PPE_ENTRY_PASSWORD,
    })),
  },
]

function CeoCredentialEditor() {
  const [currentUsername, setCurrentUsername] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")

  function handleVerify(event) {
    event.preventDefault()
    if (!validateCeoDashboardCredentials(currentUsername, currentPassword)) {
      setSavedMessage("")
      setError("Incorrect username or password.")
      return
    }
    const current = getCeoDashboardCredentials()
    setUsername(current.username)
    setPassword(current.password)
    setConfirmPassword(current.password)
    setError("")
    setUnlocked(true)
  }

  async function handleSave(event) {
    event.preventDefault()
    const nextUsername = username.trim()
    if (!nextUsername || !password) {
      setSavedMessage("")
      setError("Enter a new username and password.")
      return
    }
    if (password !== confirmPassword) {
      setSavedMessage("")
      setError("The new password and the confirmation do not match.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await saveCeoDashboardCredentials(nextUsername, password)
      setUsername(nextUsername)
      setSavedMessage("CEO EXCLUSIVE login updated. Settings uses this username and password too.")
    } catch (saveError) {
      setSavedMessage("")
      setError(saveError instanceof Error ? saveError.message : "Could not save the new login.")
    } finally {
      setSaving(false)
    }
  }

  if (!unlocked) {
    return (
      <form onSubmit={handleVerify} className="space-y-4 rounded-xl border border-zinc-200 bg-white px-6 py-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-900">CEO Exclusive</h2>
          <p className="text-sm text-zinc-500">
            Enter the current CEO EXCLUSIVE username and password before changing them.
          </p>
        </header>
        <div>
          <label htmlFor="ceo-current-username" className="block text-sm font-medium text-zinc-700">
            Current username
          </label>
          <input
            id="ceo-current-username"
            type="text"
            autoComplete="username"
            value={currentUsername}
            onChange={(event) => {
              setCurrentUsername(event.target.value)
              setError("")
            }}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
          />
        </div>
        <PasswordField
          id="ceo-current-password"
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value)
            setError("")
          }}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Continue
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-zinc-200 bg-white px-6 py-6 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">CEO Exclusive</h2>
        <p className="text-sm text-zinc-500">
          Edit the username and password. The new pair opens CEO EXCLUSIVE and Settings.
        </p>
      </header>
      <div>
        <label htmlFor="ceo-new-username" className="block text-sm font-medium text-zinc-700">
          New username
        </label>
        <input
          id="ceo-new-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setError("")
            setSavedMessage("")
          }}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
        />
      </div>
      <PasswordField
        id="ceo-new-password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          setError("")
          setSavedMessage("")
        }}
      />
      <PasswordField
        id="ceo-confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => {
          setConfirmPassword(event.target.value)
          setError("")
          setSavedMessage("")
        }}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {savedMessage ? <p className="text-sm text-emerald-700">{savedMessage}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {saving ? "Saving…" : "Save new login"}
      </button>
    </form>
  )
}

export default function LoginDetailsPanel({ onBack }) {
  const [showCeoEditor, setShowCeoEditor] = useState(false)

  if (showCeoEditor) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <button
          type="button"
          onClick={() => setShowCeoEditor(false)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Login details
        </button>
        <CeoCredentialEditor />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Settings
        </button>
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Login details</h1>
          <p className="text-sm text-zinc-500">
            Username and password for each department page that asks you to log in.
          </p>
        </header>
      </div>

      <button
        type="button"
        onClick={() => setShowCeoEditor(true)}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-6 py-4 text-left shadow-sm transition hover:bg-zinc-50"
      >
        <span>
          <span className="block text-lg font-semibold text-zinc-900">CEO Exclusive</span>
          <span className="mt-1 block text-sm text-zinc-500">
            Enter the current username and password, then set a new one.
          </span>
        </span>
        <Icon name="shield" size={20} />
      </button>

      {LOGIN_GROUPS.map((group) => (
        <section
          key={group.department}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">{group.department}</h2>
          </div>
          <ul className="divide-y divide-zinc-200">
            {group.pages.map((page) => (
              <li key={page.name} className="space-y-2 px-6 py-4">
                <p className="text-sm font-semibold text-zinc-900">{page.name}</p>
                <p className="text-sm text-zinc-700">
                  Username: <span className="font-medium text-zinc-900">{page.username}</span>
                </p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
                  <span>Password:</span>
                  <MaskedPassword value={page.password} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
