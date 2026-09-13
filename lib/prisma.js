import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { postgresAvailable } from "@/lib/postgres"

const globalForPrisma = globalThis

function connectionString() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DIRECT_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  )
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: connectionString() })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export function prismaAvailable() {
  return postgresAvailable()
}
