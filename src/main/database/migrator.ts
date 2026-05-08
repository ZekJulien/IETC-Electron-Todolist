import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@db/client'

async function ensureMigrationsTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  VARCHAR(36)  NOT NULL PRIMARY KEY,
      "migration_name"      VARCHAR(255) NOT NULL,
      "finished_at"         DATETIME,
      "applied_steps_count" INTEGER      NOT NULL DEFAULT 0
    )
  `)
}

async function getAppliedMigrations(prisma: PrismaClient): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  )
  return new Set(rows.map(r => r.migration_name))
}

async function recordMigration(prisma: PrismaClient, name: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" (id, migration_name, finished_at, applied_steps_count)
     VALUES (?, ?, datetime('now'), 1)`,
    randomUUID(), name
  )
}

export async function runMigrations(prisma: PrismaClient, migrationsPath: string): Promise<void> {
  await ensureMigrationsTable(prisma)
  const applied = await getAppliedMigrations(prisma)

  const pending = readdirSync(migrationsPath)
    .sort()
    .filter(dir => existsSync(join(migrationsPath, dir, 'migration.sql')) && !applied.has(dir))

  for (const dir of pending) {
    const sql = readFileSync(join(migrationsPath, dir, 'migration.sql'), 'utf-8')
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean)

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement)
    }

    await recordMigration(prisma, dir)
  }
}
