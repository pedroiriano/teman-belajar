FROM golang:1.26-alpine AS builder

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

FROM alpine:3.22

WORKDIR /app

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

COPY --from=builder /app/portal-api .
COPY --from=builder /app/portal-migrate .
COPY --from=builder /app/migrations ./migrations

USER appuser

EXPOSE 8080

CMD ["./portal-api"]
