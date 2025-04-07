FROM mcr.microsoft.com/devcontainers/javascript-node:0-18

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    gnupg \
    lsb-release \
    python3 \
    python3-pip

# [Optional] Uncomment if you want to install more global node modules
RUN su node -c "npm install -g typescript ts-node tsx nodemon drizzle-kit"