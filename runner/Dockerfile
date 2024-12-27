# Use a lightweight Node.js image as the base
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /code

# Copy only package.json and package-lock.json first (this ensures npm install is cached unless dependencies change)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Install development dependencies and build the application
RUN npm ci
RUN npm run build

# Production stage
FROM node:20-alpine

# Set the working directory
WORKDIR /code

# Copy only the necessary files from the builder stage
COPY --from=builder /code/dist ./dist
COPY --from=builder /code/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Expose the application's port
EXPOSE 3000

# Set the default command to run the application
CMD [ "node", "dist/index.js" ]
