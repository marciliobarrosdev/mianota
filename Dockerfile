# Multi-stage Dockerfile for MIAnota Web App (TanStack Start + Vite + Nitro)
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copia código fonte e compila para produção
COPY . .
RUN bun run build

# Stage de execução minimalista
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Cria usuário seguro sem privilégios de root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/.output /app/.output

USER appuser

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
