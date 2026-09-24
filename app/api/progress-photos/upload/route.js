import { handleUpload } from "@vercel/blob/client"
import { isBlobStorageConfigured } from "@/lib/progressPhotoBlob"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }))
}

/** Lets the client know whether object storage uploads are available. */
export async function GET() {
  return withCors(
    Response.json({
      ok: true,
      blob: isBlobStorageConfigured(),
    })
  )
}

/**
 * Client uploads go straight to Vercel Blob (bypasses the 4.5MB function body limit).
 * Phone camera photos sync to every device via the returned public URL.
 */
export async function POST(request) {
  if (!isBlobStorageConfigured()) {
    return withCors(
      Response.json(
        {
          error:
            "Object storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel env vars.",
        },
        { status: 503 }
      )
    )
  }

  try {
    const body = await request.json()
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let photoId = ""
        try {
          const payload = JSON.parse(clientPayload || "{}")
          photoId = String(payload.photoId || "").trim()
        } catch {
          photoId = ""
        }

        if (!photoId || !pathname.startsWith("progress-photos/")) {
          throw new Error("Invalid photo upload path.")
        }

        // Keep pathname tied to the photo id so clients cannot overwrite arbitrary keys.
        const expectedPrefix = `progress-photos/${photoId}`
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Photo id does not match upload path.")
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 12 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ photoId }),
        }
      },
      onUploadCompleted: async () => {
        // Client already receives the public URL from upload().
      },
    })

    return withCors(Response.json(jsonResponse))
  } catch (error) {
    return withCors(
      Response.json(
        { error: error instanceof Error ? error.message : "Could not start photo upload." },
        { status: 400 }
      )
    )
  }
}