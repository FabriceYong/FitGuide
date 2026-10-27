# FitGuide website. Build from the repo root (it needs packages/shared):
#   docker compose build web
FROM node:22-bookworm-slim

WORKDIR /app
COPY packages/shared ./packages/shared
COPY fitguide_nextjs/package.json fitguide_nextjs/package-lock.json ./fitguide_nextjs/

WORKDIR /app/fitguide_nextjs
RUN npm ci
COPY fitguide_nextjs ./

# NEXT_PUBLIC_* values are baked into the browser bundle at build time, so
# changing them needs a rebuild (docker compose up --build).
ARG NEXT_PUBLIC_API_URL=http://localhost:5001/api
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=$NEXT_PUBLIC_UNSPLASH_ACCESS_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
