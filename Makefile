.PHONY: all bootstrap build test lint up down

all: bootstrap build test

bootstrap:
	@echo "Bootstrapping repository..."
	@if not exist "services\portal-api\go.mod" cd services/portal-api && go mod tidy
	@echo "Repository bootstrapped."

build:
	@echo "Building API..."
	cd services/portal-api && go build -o ../../bin/portal-api.exe ./cmd/api

test:
	@echo "Running tests..."
	cd services/portal-api && go test ./...

lint:
	@echo "Running lint..."
	@echo "Lint skipped for now (need golangci-lint)"

up:
	@echo "Starting local infrastructure..."
	cd infrastructure/docker && docker-compose up -d

down:
	@echo "Stopping local infrastructure..."
	cd infrastructure/docker && docker-compose down
