# Multi-stage Dockerfile for MIAnota WhatsApp-Go Service (whatsmeow)
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache ca-certificates git tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /whatsapp-go .

FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /whatsapp-go /app/whatsapp-go

USER appuser

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8085/health || exit 1

ENTRYPOINT ["/app/whatsapp-go"]
