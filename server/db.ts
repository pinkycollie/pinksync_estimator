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
