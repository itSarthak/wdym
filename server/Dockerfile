FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma and prepare client
COPY prisma ./prisma
RUN npx prisma generate

# Copy remainder of codebase and build TS
COPY . .
RUN npm run build

# Expose server port explicitly just in case
EXPOSE 4000

# Push DB changes automatically on boot container start, then run server
CMD ["sh", "-c", "npx prisma db push && npm start"]
