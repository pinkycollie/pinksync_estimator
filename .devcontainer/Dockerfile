FROM mcr.microsoft.com/devcontainers/javascript-node:1-22

# Install additional OS packages for development
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    openssh-client \
    jq \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install global npm packages with modern tooling
RUN su node -c "npm install -g typescript tsx nodemon drizzle-kit pnpm npm-check-updates"

# Set working directory
WORKDIR /workspace

# Configure npm for better performance
RUN npm config set fund false && npm config set audit-level moderate