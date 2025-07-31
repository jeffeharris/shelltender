# Multi-stage build for Shelltender
FROM node:20 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
COPY packages/shelltender/package*.json ./packages/shelltender/
COPY apps/demo/package*.json ./apps/demo/

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build packages in correct order
# First build core (no dependencies)
RUN npm run build -w @shelltender/core

# Then build server and client (depend on core)
RUN npm run build -w @shelltender/server
RUN npm run build -w @shelltender/client

# Build the combined package
RUN npm run build -w shelltender

# Skip demo app build - not needed for production

# Production stage
FROM node:20

# Install runtime dependencies for PTY support
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install AI coding assistant CLIs
RUN npm install -g \
    @anthropic-ai/claude-code \
    openai-cli \
    @google/gemini-cli

WORKDIR /app

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/node_modules ./node_modules

# Create a non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Create necessary directories
RUN mkdir -p /app/sessions && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3000 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV WS_PORT=8080

# Start the demo application
# In production, we need to serve the built files
CMD ["node", "apps/demo/dist/server/index.js"]