FROM node:18-slim

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update && apt-get install -y \
    google-chrome-stable \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy only package files first (for better layer caching)
COPY package*.json ./

# Install production dependencies only (faster)
RUN npm ci --only=production

# Copy only the necessary files (exclude .git, node_modules, etc.)
COPY src/ ./src/
COPY mcp-wrapper.js ./
COPY smithery.yaml ./
COPY .env.example ./

# Set environment variables
ENV NODE_ENV=production \
    HEADLESS=true \
    SLOWMO=0 \
    PORT=3001 \
    MAX_API_CONNECTIONS=3 \
    MAX_BROWSER_CONNECTIONS=1

# Expose port
EXPOSE 3001

# Start the server using the wrapper
CMD ["node", "mcp-wrapper.js"]