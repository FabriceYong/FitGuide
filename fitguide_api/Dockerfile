# FitGuide API. Build from the repo root (it needs packages/shared):
#   docker compose build api
FROM node:22-bookworm-slim

# Prisma's query engine needs OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY packages/shared ./packages/shared
COPY fitguide_api/package.json fitguide_api/package-lock.json ./fitguide_api/
COPY fitguide_api/prisma ./fitguide_api/prisma

WORKDIR /app/fitguide_api
# postinstall runs `prisma generate`
RUN npm ci --omit=dev
COPY fitguide_api ./

ENV PORT=5001
EXPOSE 5001

# Apply migrations, then start. The API loads the catalog into an empty database.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
