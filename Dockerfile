# Use Node.js as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0 \
    wget \
    xvfb \
    fonts-noto-color-emoji \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps

# Copy application code
COPY . .

# Create outputs directory
RUN mkdir -p /app/outputs && chmod 777 /app/outputs

# Set volume for outputs
VOLUME ["/app/outputs"]

# Set environment variable defaults
ENV AZURE_OPENAI_DEPLOYMENT="computer-use-preview"
ENV AZURE_OPENAI_API_VERSION="2025-04-01-preview"

# Start Xvfb for non-headless browser support
ENV DISPLAY=:99

# Create entrypoint script
RUN echo '#!/bin/sh\n\
Xvfb :99 -screen 0 1280x1024x24 -ac +extension GLX +render -noreset &\n\
exec "$@"\n' > /entrypoint.sh && \
chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Default command to run the application with the sample instructions
CMD ["node", "index.js", "--instructions-file", "./instructions/slotmachine.json"]