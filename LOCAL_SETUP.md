# Moving from Replit to Local Development

This guide explains how to move your PinkSync Estimator project from Replit to your local machine and run the server on port 5000.

---

## Step 1: Get Your Project Files from Replit

### Option A: Download as ZIP (Simplest)

1. Go to your Replit project
2. Click the **three dots menu (⋮)** in the Files panel (top-left)
3. Select **"Download as ZIP"**
4. Save the ZIP file to your computer
5. Extract (unzip) to a folder like:
   - **Windows**: `C:\Users\YourName\Projects\pinksync_estimator`
   - **Mac/Linux**: `~/Projects/pinksync_estimator`

### Option B: Clone from GitHub (Recommended)

If your Replit project is already connected to GitHub:

```bash
# Open Terminal (Mac/Linux) or PowerShell (Windows)
git clone https://github.com/pinkycollie/pinksync_estimator.git
cd pinksync_estimator
```

### Option C: Connect Replit to GitHub First

If your Replit isn't connected to GitHub yet:

1. In Replit, click **"Version Control"** in the left sidebar (Git icon)
2. Click **"Connect to GitHub"**
3. Authorize Replit to access your GitHub
4. Click **"Create a GitHub repo"** or connect to existing
5. Push your code with the **"Commit & Push"** button
6. Then clone to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pinksync_estimator.git
   cd pinksync_estimator
   ```

### Option D: Copy Your Replit Secrets

**Important!** Your API keys and secrets are stored in Replit's Secrets tab, not in the code. You'll need to copy them:

1. In Replit, click the **"Secrets"** tool (🔒 lock icon) in the left sidebar
2. Write down or copy each secret:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `HUGGINGFACE_API_KEY`
   - Any others you've added
3. You'll add these to your local `.env` file in Step 4

---

## Quick Start (After Getting Files)

```bash
# 1. Navigate to your project folder
cd pinksync_estimator

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys from Replit Secrets

# 4. Start the server on port 5000
npm run dev
```

The server will start at **http://localhost:5000**

---

## Detailed Setup Instructions

### Step 2: Install Prerequisites

#### Node.js (Required)
- **Version**: Node.js 20 or higher
- **Download**: https://nodejs.org/

Verify installation:
```bash
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
```

#### PostgreSQL (Required for full functionality)
- **Version**: PostgreSQL 16 or higher
- **Download**: https://www.postgresql.org/download/

**Quick PostgreSQL Setup:**

On macOS (with Homebrew):
```bash
brew install postgresql@16
brew services start postgresql@16
createdb pinksync_db
```

On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb pinksync_db
```

On Windows:
1. Download and install from https://www.postgresql.org/download/windows/
2. During installation, note your password
3. Use pgAdmin or command line to create a database called `pinksync_db`

#### Python (Optional - for AI analysis scripts)
- **Version**: Python 3.11+
- **Download**: https://www.python.org/downloads/

### Step 3: Install Project Dependencies

```bash
cd pinksync_estimator
npm install
```

This installs all Node.js packages defined in `package.json`.

### Step 4: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your local settings:
   ```bash
   # Database Configuration (Required)
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pinksync_db
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # AI Service API Keys (Optional - for AI features)
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   
   # Cloud Storage Integration (Optional)
   DROPBOX_ACCESS_TOKEN=your_dropbox_access_token_here
   ```

**Important**: Replace `yourpassword` with your actual PostgreSQL password.

### Step 5: Start the Development Server

```bash
npm run dev
```

You should see:
```
serving on port 5000
Server running at http://0.0.0.0:5000/
```

Open your browser to **http://localhost:5000** to view the application.

---

## Alternative Setup Methods

### Using Dev Containers (Docker)

If you prefer Docker-based development:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/) with the "Dev Containers" extension
3. Open the project folder in VS Code
4. Click "Reopen in Container" when prompted
5. Run `npm run dev` in the terminal

The `.devcontainer/` folder contains pre-configured Docker settings.

### Using the Windows Setup Guide

For detailed Windows-specific instructions, see [WINDOWS_SETUP.md](WINDOWS_SETUP.md).

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 5000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push database schema changes |

---

## Understanding Port 5000

The server is **hardcoded to run on port 5000** in `server/index.ts`:

```typescript
// ALWAYS serve the app on port 5000
// this serves both the API and the client.
const port = 5000;
server.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});
```

This is the same port used by Replit. The application serves:
- **Frontend**: React application at http://localhost:5000
- **API**: Express.js backend at http://localhost:5000/api/*

---

## Troubleshooting

### Port 5000 Already in Use

If you see "EADDRINUSE: address already in use :::5000":

**On macOS/Linux:**
```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

**On Windows:**
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Note for macOS**: AirPlay Receiver uses port 5000 by default. Disable it in:
System Preferences → Sharing → AirPlay Receiver

### Database Connection Failed

1. Ensure PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   
   # Windows
   # Check Services app for "postgresql" service
   ```

2. Verify your `DATABASE_URL` in `.env` is correct

3. Test the connection:
   ```bash
   psql postgresql://postgres:yourpassword@localhost:5432/pinksync_db
   ```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### TypeScript Errors

```bash
# Check for type errors
npm run check
```

### Application Won't Start

1. Check Node.js version: `node --version` (needs v20+)
2. Check for missing environment variables
3. View full error logs in the terminal

---

## Differences from Replit Environment

| Feature | Replit | Local |
|---------|--------|-------|
| Port | 5000 (auto-configured) | 5000 (same) |
| Database | Provided by Replit | You must install PostgreSQL |
| Environment Variables | Secrets tab | `.env` file |
| HTTPS | Automatic | Manual (use ngrok for testing) |
| Domain | `*.replit.dev` | `localhost` |

---

## Next Steps

1. **Set up your database**: Run `npm run db:push` to create tables
2. **Configure API keys**: Add your AI service keys to `.env`
3. **Start developing**: Run `npm run dev` and make changes

For more information, see:
- [README.md](README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - API documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
