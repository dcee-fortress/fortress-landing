import { APP_BRAND } from "@/lib/appBrand"
import { RODCROFT_CHADCOMBE_PROJECT_ID } from "@/lib/projectList"

/** Installable Rodcroft home-screen app (PWA + Capacitor WebView). */
export default function manifest() {
  return {
    id: "/",
    name: APP_BRAND,
    short_name: APP_BRAND,
    description:
      "Rodcroft quantity survey, valuations, rate build-up, and site tools — works offline after install.",
    start_url: `/project/${RODCROFT_CHADCOMBE_PROJECT_ID}`,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f4f5",
    theme_color: "#18181b",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/rodcroft-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/rodcroft-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/rodcroft-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
