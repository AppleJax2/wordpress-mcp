FROM node:18-alpine

WORKDIR /app

# Install dependencies for Puppeteer in Alpine with correct packages
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    bash \
    procps \
    dumb-init \
    fontconfig \
    udev \
    python3 \
    make \
    g++ \
    cairo \
    cairo-dev \
    pango \
    pango-dev \
    jpeg \
    giflib \
    pixman \
    pixman-dev \
    pkgconfig \
    libpng \
    libpng-dev \
    musl-dev \
    build-base

# Alias python to python3 for node-gyp compatibility
RUN ln -sf python3 /usr/bin/python

# Tell Puppeteer to use the installed Chromium and reduce resource usage
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_DISABLE_DEV_SHM_USAGE=true \
    CHROME_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS=--max-old-space-size=512

# Copy package files
COPY package*.json ./

# Install dependencies 
RUN npm install --only=production --no-audit --legacy-peer-deps

# Copy application code
COPY . .

# Create log directory with permissions
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Make the startup script executable
RUN chmod +x start.sh

# Set environment variables
ENV NODE_ENV=production \
    HEADLESS=true \
    SLOWMO=0 \
    PORT=3001 \
    MAX_API_CONNECTIONS=3 \
    MAX_BROWSER_CONNECTIONS=1 \
    CONNECTION_TIMEOUT=10000 \
    MCP_PROTOCOL_VERSION=2025-03-26 \
    DEBUG_MCP=true

# Set healthcheck to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3001 || exit 1

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Command will be provided by smithery.yaml
CMD ["./start.sh"]