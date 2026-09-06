"use client"

import { useEffect, useRef, useState } from "react"
import Icon from "@/components/icon/icon"

export default function SiteCameraCapture({ open, onClose, onCapture, isBusy = false }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState("")
  const [facingMode, setFacingMode] = useState("environment")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false
    setError("")
    setReady(false)

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser cannot open the camera on the website. Use HTTPS or try another browser.")
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
          setReady(true)
        }
      } catch (startError) {
        const denied =
          startError?.name === "NotAllowedError" || startError?.name === "PermissionDeniedError"
        setError(
          denied
            ? "Camera permission was blocked. Allow camera access for this site, then try again."
            : "Could not start the camera. Check that a camera is connected and not in use."
        )
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [open, facingMode])

  const stopAndClose = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    onClose()
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video || !ready || isBusy) return

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) {
      setError("Could not capture this photo.")
      return
    }

    context.drawImage(video, 0, 0, width, height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.86)
    })

    if (!blob) {
      setError("Could not capture this photo.")
      return
    }

    const file = new File([blob], `site-photo-${Date.now()}.jpg`, { type: "image/jpeg" })
    await onCapture(file)
    stopAndClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4"
      onClick={stopAndClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Take picture</p>
            <p className="text-xs text-zinc-500">Use the live camera, then capture to add it to site photos.</p>
          </div>
          <button
            type="button"
            onClick={stopAndClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close camera"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="bg-zinc-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="mx-auto max-h-[60vh] w-full bg-black object-contain"
          />
        </div>

        {error ? <p className="px-4 pt-3 text-xs text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setFacingMode((current) => (current === "environment" ? "user" : "environment"))}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            {facingMode === "environment" ? "Use front camera" : "Use rear camera"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={stopAndClose}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!ready || isBusy || Boolean(error)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="camera" size={14} />
              {isBusy ? "Saving..." : "Capture photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
