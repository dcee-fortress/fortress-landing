/**
 * Prisma schema lives in prisma/schema.prisma for the grove_shared_storage model.
 * Runtime Postgres access uses `pg` via lib/postgres.js + lib/serverSharedStore.js
 * so Vercel does not depend on a generated Prisma client (avoids 503 on missing generate/lockfile).
 *
 * When wiring Prisma for real: add @prisma/client + prisma + @prisma/adapter-pg,
 * run npm install, prisma generate, then replace this stub.
 */

export function prismaAvailable() {
  return false
}

export const prisma = null
