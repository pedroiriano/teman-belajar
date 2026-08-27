FROM golang:1.26.6-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the main API binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/portal-api ./cmd/api
# Build the migration runner
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/portal-migrate ./cmd/migrate
# Build the portal CLI
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/portal-cli ./cmd/portal-cli

FROM alpine:3.22

WORKDIR /app

# Add runtime dependencies and enforce the fixed OpenSSL packages.
RUN apk add --no-cache --upgrade \
    'libcrypto3>=3.5.8-r0' \
    'libssl3>=3.5.8-r0' \
    tzdata
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

COPY --from=builder /app/portal-api .
COPY --from=builder /app/portal-migrate .
COPY --from=builder /app/portal-cli .
COPY --from=builder /app/migrations ./migrations

USER appuser

EXPOSE 8080

CMD ["./portal-api"]
