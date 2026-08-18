FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY .nvmrc .nvmrc
RUN npm ci --silent

# Copy source and build
COPY . ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy production files
COPY --from=builder /app/.next .next
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
