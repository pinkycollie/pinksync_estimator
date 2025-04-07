# Windows Setup Guide for AI OS Platform

This guide will help you set up the AI OS Platform on your Windows machine using Microsoft Dev Containers.

## Prerequisites

1. **Windows 10 or 11** with latest updates
2. **Administrator access** to your computer

## Step 1: Enable WSL 2 (Windows Subsystem for Linux)

1. Open PowerShell as Administrator
2. Run these commands:
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. Restart your computer
4. Download and install the [WSL 2 Linux kernel update package](https://aka.ms/wsl2kernel)
5. Set WSL 2 as default:
   ```powershell
   wsl --set-default-version 2
   ```

## Step 2: Install Docker Desktop

1. Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install with default settings
3. Start Docker Desktop
4. In Docker Desktop settings:
   - Enable WSL 2 integration
   - Allocate sufficient resources (at least 4GB RAM)

## Step 3: Install Visual Studio Code

1. Download [Visual Studio Code](https://code.visualstudio.com/download)
2. Install with default settings
3. Install these VS Code extensions:
   - Remote Development (`ms-vscode-remote.vscode-remote-extensionpack`)
   - Docker (`ms-azuretools.vscode-docker`)
   - ESLint (`dbaeumer.vscode-eslint`)
   - Prettier (`esbenp.prettier-vscode`)
   - Tailwind CSS (`bradlc.vscode-tailwindcss`)

## Step 4: Set Up Project Files

### Option 1: From Replit
1. Export your Replit project as a ZIP file
2. Create a folder on your computer (e.g., `C:\Users\YourName\Projects\ai-os-platform`)
3. Extract the ZIP contents to this folder

### Option 2: From GitHub
1. Open PowerShell
2. Navigate to your desired location:
   ```powershell
   cd C:\Users\YourName\Projects
   ```
3. Clone the repository:
   ```powershell
   git clone https://github.com/your-username/your-repo-name.git ai-os-platform
   cd ai-os-platform
   ```

## Step 5: Create Environment Files

1. In your project folder, create a `.env` file with the following content:
   ```
   # Database Connection
   DATABASE_URL=postgresql://postgres:postgres@db:5432/aiostool
   PGHOST=db
   PGPORT=5432
   PGDATABASE=aiostool
   PGUSER=postgres
   PGPASSWORD=postgres
   
   # API Keys (Replace with your actual keys)
   ASTRA_DB_TOKEN=your_astra_db_token
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   OPENAI_API_KEY=your_openai_api_key
   
   # Other Configuration
   NODE_ENV=development
   ```
2. Replace the placeholder API keys with your actual keys

## Step.6: Open in Dev Container

1. Open VS Code
2. Go to File > Open Folder and select your project folder
3. When prompted, click "Reopen in Container"
   - Or click the green button in the bottom-left corner and select "Reopen in Container"
4. Wait for the container to build (this may take several minutes the first time)

## Step 7: Start the Application

1. Once in the dev container, open a terminal in VS Code
2. Run:
   ```bash
   npm run dev
   ```
3. Your application will start and be available at http://localhost:5000

## Step 8: Deploy to Vercel (Optional)

1. Push your code to GitHub
2. Create an account on [Vercel](https://vercel.com)
3. Connect your GitHub repository
4. Configure environment variables in the Vercel dashboard
5. Deploy!

## Troubleshooting

### Docker Issues
- Ensure Virtualization is enabled in BIOS
- Make sure Hyper-V is enabled on Windows
- Check Docker Desktop logs for specific errors

### WSL Issues
- Try running `wsl --update` to get the latest WSL version
- If you see memory errors, increase WSL memory in `.wslconfig`

### Container Build Failures
- Check that Docker has enough resources allocated
- Try building with verbose logs: `docker-compose build --no-cache --progress=plain`

## Additional Resources

- [Dev Containers Documentation](https://containers.dev/)
- [Visual Studio Code Remote Development](https://code.visualstudio.com/docs/remote/remote-overview)
- [Docker Desktop Documentation](https://docs.docker.com/desktop/windows/)
- [WSL Documentation](https://docs.microsoft.com/en-us/windows/wsl/)