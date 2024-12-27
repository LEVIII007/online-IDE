# Stage 1: Build the application
FROM node:20 as builder

# Set working directory
WORKDIR /runner

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy TypeScript source code
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript code
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --production

# Stage 2: Create the production image
FROM node:20-alpine

# Set working directory
WORKDIR /runner

# Copy the built app and dependencies from the builder stage
COPY --from=builder /runner/dist ./dist
COPY --from=builder /runner/node_modules ./node_modules
COPY --from=builder /runner/package.json ./

# Expose the application port
EXPOSE 3000

# Set the environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
