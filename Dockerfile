# Fight Club CRM — container image for the self-hosted environments.
#
# The image carries no configuration and no secrets; everything comes from the
# environment at run time, so the same image that passes on staging is the exact
# one promoted to production.

FROM node:22-alpine AS base

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Anything the browser needs to know is fixed when the bundle is compiled, not
# when the container starts. Storage mode is the same on every self-hosted
# environment, so baking it in still lets one image be promoted from staging to
# production unchanged.
ARG NEXT_PUBLIC_STORAGE_MODE=s3
ENV NEXT_PUBLIC_STORAGE_MODE=$NEXT_PUBLIC_STORAGE_MODE
# Deliberately not `npm run build` — that variant applies database migrations,
# which cannot run here. The container applies them on startup instead.
RUN npm run build:image

# ---- runtime ----------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The migration runner is not part of the app bundle, so it is copied in
# explicitly along with the SQL files it applies.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/lib/db-cjs.js ./lib/db-cjs.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
