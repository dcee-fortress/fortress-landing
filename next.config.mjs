import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3", "pg"],
  // Silence Next 16 Turbopack warning when a webpack() config is present.
  turbopack: {},
  env: {
    NEXT_PUBLIC_GROVE_CODE_CHANNEL:
      process.env.VERCEL || process.env.VERCEL_ENV ? "live" : "local",
  },
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    optimizePackageImports: ["jspdf", "jspdf-autotable", "xlsx", "heic2any"],
  },
  onDemandEntries: {
    // Keep compiled pages warm longer so dashboard hops don't recompile.
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 8,
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
        permanent: true,
      },
      {
        source: "/project/:projectId/dashboard/goods-acquired/:path*",
        destination: "/project/:projectId/dashboard/goods-requested/:path*",
        permanent: true,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/daily/:path*",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/daily/:path*",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/daily",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/daily",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/weekly/:path*",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/weekly/:path*",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/weekly",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/weekly",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/monthly/:path*",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/monthly/:path*",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/monthly",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/monthly",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/project-to-date",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/project-to-date",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/material-requested/:path*",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-requested/:path*",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/material-requested",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-requested",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/material-on-site/:path*",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site/:path*",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/material-on-site",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-on-site",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/material-analysis/:path*",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-analysis/:path*",
        permanent: false,
      },
      {
        source: "/project/:projectId/dashboard/material-schedule/material-analysis",
        destination: "/project/:projectId/dashboard/fuel-schedule/fuel-analysis",
        permanent: false,
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
