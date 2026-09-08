import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GROVE_CODE_CHANNEL: process.env.VERCEL ? "live" : "local",
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
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: [fileURLToPath(import.meta.url)],
        },
      }

      if (!isServer) {
        config.watchOptions = {
          ...config.watchOptions,
          aggregateTimeout: 300,
          ignored: ["**/.next/**", "**/node_modules/**", "**/components/icon/icons.js"],
        }
      }
    }

    return config
  },
}

export default nextConfig
