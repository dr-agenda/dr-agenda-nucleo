import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function runMigrations() {
  const isReset = process.argv.includes('--reset');
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

  try {
    if (isReset) {
      console.log('♻️  Reiniciando esquema public y auth en base de datos de desarrollo...');
      await sql.unsafe(`
        DROP SCHEMA IF EXISTS public CASCADE;
        DROP SCHEMA IF EXISTS auth CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `);
    }

    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`🚀 Aplicando migración: ${file}...`);
      await sql.unsafe(content);
      console.log(`✅ Migración aplicada: ${file}`);
    }
  } finally {
    await sql.end();
  }
}

runMigrations().catch((err) => {
  console.error('❌ Error al ejecutar migraciones:', err);
  process.exit(1);
});
