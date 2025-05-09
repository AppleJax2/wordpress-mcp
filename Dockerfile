FROM node:18-slim AS base

# Fix for the APT key deprecation
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    curl \
    && mkdir -p /etc/apt/keyrings \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/keyrings/google.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list

# Install Chrome and other dependencies with reduced size
RUN apt-get update && apt-get install -y \
    google-chrome-stable \
    fonts-freefont-ttf \
    libxss1 \
    ps \
    procps \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

# Create app directory
WORKDIR /app

# Copy only package files first (for better layer caching)
COPY package*.json ./

# Install dependencies in a separate layer with better caching
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
# Standard npm install without cache mount for better compatibility
RUN npm ci --only=production --no-audit

# Build the final image
FROM base
WORKDIR /app

# Copy installed node_modules from the dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy only the necessary files
COPY src/ ./src/
COPY mcp-wrapper.js ./
COPY smithery.yaml ./
COPY smithery.json ./
COPY .env.example ./

# Set environment variables
ENV NODE_ENV=production \
    HEADLESS=true \
    SLOWMO=0 \
    PORT=3001 \
    MAX_API_CONNECTIONS=3 \
    MAX_BROWSER_CONNECTIONS=1 \
    SMITHERY=true \
    # Improve Node.js performance
    NODE_NO_WARNINGS=1 \
    # Reduce npm progress output during builds
    NPM_CONFIG_LOGLEVEL=error \
    # Use known-good DNS servers for better network reliability
    NODE_DNS_SERVER=1.1.1.1,8.8.8.8

# Expose port
EXPOSE 3001

# Add better error reporting to help debug issues
ENV NODE_OPTIONS="--unhandled-rejections=strict --max-http-header-size=16384"

# Add health check that verifies the process is running
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD ps aux | grep "node mcp-wrapper.js" | grep -v grep || exit 1

# Set non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs -s /bin/bash nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set memory limits for Node
ENV NODE_OPTIONS="${NODE_OPTIONS} --max-old-space-size=512"

# Start the server using the wrapper with proper signal handling
CMD ["node", "mcp-wrapper.js"]