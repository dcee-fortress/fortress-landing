import { parseBoqPdfFile } from "@/lib/boqPdfImport"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request) {
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "Choose a PDF file to upload." }, { status: 400 })
  }

  try {
    const items = await parseBoqPdfFile(file)
    if (!items.length) {
      return Response.json(
        {
          error:
            "No BOQ rows were found in that PDF. It needs selectable text lines. A scanned picture cannot be read — upload the Excel file instead.",
        },
        { status: 422 }
      )
    }
    return Response.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return Response.json(
      {
        error:
          message && !/cannot find module|unpdf|pdf\.js/i.test(message)
            ? message
            : "Could not read that PDF. Upload a text-based BOQ, or use the Excel file.",
      },
      { status: 422 }
    )
  }
}
