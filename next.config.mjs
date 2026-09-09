import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  env: {
    NEXT_PUBLIC_GROVE_CODE_CHANNEL:
      process.env.VERCEL || process.env.VERCEL_ENV ? "live" : "local",
  },
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    optimizePackageImports: ["jspdf", "jspdf-autotable", "xlsx"],
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
        permanent: true,
      },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: [fileURLToPath(import.meta.url)],
        },
      }

      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 400,
        ignored: [
          "**/.next/**",
          "**/node_modules/**",
          "**/components/icon/icons.js",
          "**/data/*.local.json",
          "**/data/_tmp-*.json",
          "**/data/*.db",
          "**/data/*.sqlite",
        ],
      }
    }

    return config
  },
}

export default nextConfig
