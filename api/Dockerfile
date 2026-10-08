FROM node:22-alpine AS builder

WORKDIR /app

# The root package.json only declares the workspaces and the shared
# overrides (no runtime dependencies since 01.9-19). --workspace api installs
# the API tree alone; the mobile workspace (Expo/React Native) never enters it.
# The API depends on the shared workspace package @cortege/ibp-domain (phase
# 01.8), linked by npm from packages/ibp-domain: its manifest is copied first.
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY packages/ibp-domain/package.json ./packages/ibp-domain/
RUN npm ci --workspace api --ignore-scripts

# The shared package is built here; only its dist reaches the runtime stage.
COPY packages/ibp-domain ./packages/ibp-domain
RUN npm --workspace @cortege/ibp-domain run build

COPY api ./api
RUN npm --workspace api run build

# ---- runtime ----
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# The root package.json only declares the workspaces and the shared
# overrides (no runtime dependencies since 01.9-19). --workspace api installs
# the API tree alone; the mobile workspace (Expo/React Native) never enters it.
# The package manifest lets npm create the node_modules/@cortege/ibp-domain
# link; its built dist is copied from the builder (no TypeScript here).
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY packages/ibp-domain/package.json ./packages/ibp-domain/
RUN npm ci --workspace api --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/packages/ibp-domain/dist ./packages/ibp-domain/dist
COPY --from=builder /app/api/dist ./api/dist
COPY api/scripts ./api/scripts
COPY api/migrations ./api/migrations

# The git commit of this image, passed by CI (--build-arg GIT_SHA=<sha>) and shown by
# GET /v1/health as `commit` ("unknown" when built without it). Declared after the COPY steps so
# a new commit only rebuilds this metadata layer, never the npm install.
ARG GIT_SHA=""
ENV GIT_SHA=${GIT_SHA}

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:3000/v1/health',(res)=>{process.exit(res.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "node api/scripts/migrate.js && node api/dist/main.js"]
