# Use the official Playwright base image
FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Note: Playwright browsers are already installed in the base image

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