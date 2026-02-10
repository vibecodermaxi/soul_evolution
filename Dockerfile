FROM node:20-slim

WORKDIR /app

# Git + rsync for persistence
RUN apt-get update && apt-get install -y --no-install-recommends \
    git rsync \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

# Copy data directories
COPY soul/ soul/
COPY journal/ journal/
COPY prompts/ prompts/
COPY site/ site/
COPY CLAUDE.md ./

# Entry point: git-aware runner that handles pull/push
CMD ["node", "dist/index.js"]
