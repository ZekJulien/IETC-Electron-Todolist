import { PrismaClient } from '@db/client'

let _prisma: PrismaClient | null = null

export function initDb(prisma: PrismaClient): void {
  _prisma = prisma
}

export function getDb(): PrismaClient {
  if (!_prisma) throw new Error('DB not initialized — call initDb() first')
  return _prisma
}
