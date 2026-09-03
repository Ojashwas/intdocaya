import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!connectionString) throw new Error('DATABASE_URL or POSTGRES_URL is required.')
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: true },
  max: 1,
})
const directory = join(dirname(fileURLToPath(import.meta.url)), 'postgres-migrations')
for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
  const exists = await pool.query("SELECT to_regclass('public.schema_migrations') table_name")
  if (exists.rows[0].table_name) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [file])
    if (applied.rowCount) continue
  }
  await pool.query(await readFile(join(directory, file), 'utf8'))
  console.log(`Applied ${file}`)
}
await pool.end()
