FROM node:20-slim

# Install git (needed for repo clone/push in remote mode)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ src/
COPY prompts/ prompts/
COPY scripts/ scripts/

RUN npm run build

# Copy remaining files needed at runtime
COPY soul/ soul/
COPY journal/ journal/

CMD ["bash", "scripts/run-daily.sh"]
