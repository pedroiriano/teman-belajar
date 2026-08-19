.PHONY: all bootstrap build test lint docker-config up down status logs sso verify

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
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 up

down:
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 down

docker-config:
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 config

status:
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 status

logs:
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 logs

sso:
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 sso

verify:
	powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 verify
