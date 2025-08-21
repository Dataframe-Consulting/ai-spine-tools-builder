{{#includeDocker}}
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tooluser

# Copy built application
COPY --from=builder --chown=tooluser:nodejs /app/dist ./dist
COPY --from=builder --chown=tooluser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tooluser:nodejs /app/package.json ./package.json

# Switch to non-root user
USER tooluser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
{{/includeDocker}}