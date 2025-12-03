import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

/**
 * Database Configuration
 * 
 * Supports multiple PostgreSQL backends:
 * - Local PostgreSQL (WSL, PowerShell, Ubuntu, Docker) - for development
 * - Neon Serverless - for cloud/production
 * - Supabase - compatible with standard PostgreSQL connection
 * 
 * Set USE_LOCAL_POSTGRES=true for local development with PostgreSQL
 * Default DATABASE_URL for local: postgresql://postgres:postgres@localhost:5432/pinksync_db
 */

const USE_LOCAL_POSTGRES = process.env.USE_LOCAL_POSTGRES === 'true';
const DATABASE_URL = process.env.DATABASE_URL ||
  ((process.env.NODE_ENV === 'development' && USE_LOCAL_POSTGRES)
    ? 'postgresql://postgres:postgres@localhost:5432/pinksync_db'
    : '');

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?\n" +
    "For local development: set USE_LOCAL_POSTGRES=true and optionally DATABASE_URL\n" +
    "For Neon/Supabase: set DATABASE_URL to your connection string"
  );
}

// Determine if using Neon (serverless) or local PostgreSQL
const isNeonUrl = DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('neon.database');
const isSupabaseUrl = DATABASE_URL.includes('supabase');

let pool: pg.Pool | Pool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (USE_LOCAL_POSTGRES || (!isNeonUrl && !isSupabaseUrl)) {
  // Use standard node-postgres for local development
  // Works with: WSL, PowerShell, Ubuntu, Docker, Supabase local
  console.log('[INFO] Using local PostgreSQL connection');
  const pgPool = new pg.Pool({ connectionString: DATABASE_URL });
  pool = pgPool;
  db = drizzlePg({ client: pgPool, schema });
} else {
  // Use Neon serverless for cloud deployment
  console.log('[INFO] Using Neon serverless connection');
  neonConfig.webSocketConstructor = ws;
  const neonPool = new Pool({ connectionString: DATABASE_URL });
  pool = neonPool;
  db = drizzleNeon({ client: neonPool, schema });
}

export { pool, db };

/**
 * Local Development Setup Instructions:
 * 
 * Option 1: Docker (recommended - already in devcontainer)
 * - docker-compose up db
 * - Set USE_LOCAL_POSTGRES=true
 * 
 * Option 2: WSL/Ubuntu
 * - sudo apt install postgresql postgresql-contrib
 * - sudo service postgresql start
 * - sudo -u postgres createdb pinksync_db
 * - Set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pinksync_db
 * - Set USE_LOCAL_POSTGRES=true
 * 
 * Option 3: PowerShell (Windows)
 * - Install PostgreSQL from https://www.postgresql.org/download/windows/
 * - Create database: createdb -U postgres pinksync_db
 * - Set DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pinksync_db
 * - Set USE_LOCAL_POSTGRES=true
 * 
 * Option 4: Supabase Local (mirrors production)
 * - npx supabase init
 * - npx supabase start
 * - Set DATABASE_URL from supabase status output
 * - Set USE_LOCAL_POSTGRES=true
 */
