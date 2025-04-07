# Windows Setup Script for AI OS Platform
# Run this script in PowerShell with administrator privileges

# Check for administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Please run this script as Administrator!"
    break
}

Write-Host "Setting up AI OS Platform on Windows..." -ForegroundColor Green

# 1. Enable WSL 2 (Windows Subsystem for Linux)
Write-Host "1. Setting up WSL 2..." -ForegroundColor Cyan
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
Write-Host "   WSL features enabled. You may need to restart your computer." -ForegroundColor Yellow

# 2. Install or confirm Docker Desktop
Write-Host "2. Checking for Docker Desktop..." -ForegroundColor Cyan
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerPath) {
    Write-Host "   Docker Desktop is already installed!" -ForegroundColor Green
} else {
    Write-Host "   Docker Desktop is not installed. Opening download page..." -ForegroundColor Yellow
    Start-Process "https://www.docker.com/products/docker-desktop/"
    Write-Host "   Please install Docker Desktop and enable WSL 2 integration in its settings" -ForegroundColor Yellow
    Pause
}

# 3. Install or confirm VS Code
Write-Host "3. Checking for Visual Studio Code..." -ForegroundColor Cyan
$vscodePath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
if (Test-Path $vscodePath) {
    Write-Host "   VS Code is already installed!" -ForegroundColor Green
} else {
    Write-Host "   VS Code is not installed. Opening download page..." -ForegroundColor Yellow
    Start-Process "https://code.visualstudio.com/download"
    Write-Host "   Please install VS Code" -ForegroundColor Yellow
    Pause
}

# 4. Install VS Code Extensions
Write-Host "4. Installing required VS Code extensions..." -ForegroundColor Cyan
$extensions = @(
    "ms-vscode-remote.remote-containers",
    "ms-azuretools.vscode-docker",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
)

foreach ($extension in $extensions) {
    Write-Host "   Installing $extension..."
    & $vscodePath --install-extension $extension
}

# 5. Create project directory
Write-Host "5. Setting up project directory..." -ForegroundColor Cyan
$projectDir = "$env:USERPROFILE\ai-os-platform"
if (-not (Test-Path $projectDir)) {
    New-Item -ItemType Directory -Path $projectDir | Out-Null
    Write-Host "   Created project directory at $projectDir" -ForegroundColor Green
} else {
    Write-Host "   Project directory already exists at $projectDir" -ForegroundColor Green
}

# 6. Clone the repository or copy files
Write-Host "6. Would you like to clone from GitHub or download from Replit?" -ForegroundColor Cyan
Write-Host "   1. Clone from GitHub (if you've pushed to GitHub)"
Write-Host "   2. Download from Replit (Export and move files manually)"
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    $repoUrl = Read-Host "Enter your GitHub repository URL"
    Set-Location $projectDir
    git clone $repoUrl .
    Write-Host "   Repository cloned successfully!" -ForegroundColor Green
} else {
    Write-Host "   Please export your project from Replit and extract files to $projectDir" -ForegroundColor Yellow
    Write-Host "   After copying files, press any key to continue" -ForegroundColor Yellow
    Pause
}

# 7. Create .env file for secrets
Write-Host "7. Setting up environment variables..." -ForegroundColor Cyan
$envPath = "$projectDir\.env"
if (-not (Test-Path $envPath)) {
    @"
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
"@ | Out-File -FilePath $envPath
    Write-Host "   Created .env file. Please edit to add your API keys." -ForegroundColor Yellow
} else {
    Write-Host "   .env file already exists" -ForegroundColor Green
}

# 8. Open in VS Code
Write-Host "8. Opening project in VS Code..." -ForegroundColor Cyan
Start-Process $vscodePath -ArgumentList $projectDir

# 9. Final instructions
Write-Host @"

Setup Complete! Next steps:

1. In VS Code, click on the Remote Containers icon in the bottom left corner
2. Select "Reopen in Container" when prompted
3. Wait for the container to build (this may take a few minutes)
4. Once complete, your development environment is ready!

You can now run your application inside the container using:
npm run dev

For deployment to Vercel:
1. Push your code to GitHub
2. Connect your repo to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy!

"@ -ForegroundColor Green

Write-Host "Press any key to exit..." -ForegroundColor Cyan
Pause