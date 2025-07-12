FROM node:22-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++ bash

WORKDIR /shelltender

# Copy root package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy packages
COPY packages ./packages

# Install and build packages in correct order
RUN npm ci && \
    npm run build -w @shelltender/core && \
    npm run build -w @shelltender/server && \
    npm run build -w @shelltender/client

WORKDIR /app

# Copy demo files
COPY minimal-demo/package*.json ./
COPY minimal-demo/server.js ./
COPY minimal-demo/vite.config.js ./
COPY minimal-demo/index.html ./
COPY minimal-demo/src ./src
COPY minimal-demo/public ./public

# Update package.json to use the built packages
RUN sed -i 's|file:../packages/server|file:/shelltender/packages/server|g' package.json && \
    sed -i 's|file:../packages/client|file:/shelltender/packages/client|g' package.json

# Install demo dependencies
RUN npm install

EXPOSE 8085 3000

CMD ["sh", "-c", "node server.js & npm run dev -- --host 0.0.0.0"]