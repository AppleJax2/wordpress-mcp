FROM node:18-alpine

WORKDIR /app

# Install dependencies for Puppeteer in Alpine
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    bash \
    procps

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit

# Copy application code
COPY . .

# Make the startup script executable
RUN chmod +x start.sh

# Set environment variables
ENV NODE_ENV=production \
    HEADLESS=true \
    SLOWMO=0 \
    PORT=3001 \
    MAX_API_CONNECTIONS=3 \
    MAX_BROWSER_CONNECTIONS=1 \
    SMITHERY=true

# Expose port
EXPOSE 3001

# Command will be provided by smithery.yaml
CMD ["./start.sh"]