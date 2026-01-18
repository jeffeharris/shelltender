FROM node:22-alpine

# Install build dependencies and useful tools for demo
RUN apk add --no-cache python3 make g++ bash git curl htop

WORKDIR /shelltender

# Copy root package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy packages and shared build config
COPY packages ./packages
COPY tsup.base.config.ts ./

# Install and build packages in correct order
RUN npm ci && \
    npm run build -w @shelltender/core && \
    npm run build -w @shelltender/server && \
    npm run build -w @shelltender/client

WORKDIR /app

# Copy demo files
COPY apps/demo/package*.json ./
COPY apps/demo/server.js ./
COPY apps/demo/vite.config.js ./
COPY apps/demo/index.html ./
COPY apps/demo/src ./src
COPY apps/demo/public ./public

# Copy bash profile for nice terminal experience
COPY apps/demo/.bashrc /root/.bashrc

# Update package.json to use the built packages
RUN sed -i 's|file:../../packages/server|file:/shelltender/packages/server|g' package.json && \
    sed -i 's|file:../../packages/client|file:/shelltender/packages/client|g' package.json

# Install demo dependencies
RUN npm install

EXPOSE 8085 3000

CMD ["sh", "-c", "node server.js & npm run dev -- --host 0.0.0.0"]