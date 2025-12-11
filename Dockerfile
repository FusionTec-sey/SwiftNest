# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for dependency caching
COPY package*.json ./

# Install all dependencies (including dev) so tsx and other build tools are available
RUN npm ci

# Add node_modules/.bin to PATH so local binaries are found
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy source
COPY . .

# Build the application
RUN npm run build

# ---------- production ----------
FROM node:20-alpine AS production
WORKDIR /app

# create a non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001

# Copy only package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
# Copy any runtime files your app needs (public, views, etc.) if applicable:
# COPY --from=builder /app/public ./public

# Create uploads directory and set ownership in a single layer
RUN mkdir -p /app/uploads \
 && chown -R nodejs:nodejs /app

# Install curl for healthcheck (small, common package)
RUN apk add --no-cache curl

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check (uses curl)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:5000/api/health || exit 1

# Default command (adjust if your entrypoint differs)
CMD ["node", "dist/index.cjs"]
