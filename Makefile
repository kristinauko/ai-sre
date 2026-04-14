# =============================================================================
# AI SRE — root Makefile
# =============================================================================

# Core tools needed for local development
REQUIRED_TOOLS := buf go node kubectl
# Optional: docker is only needed for `make build`
OPTIONAL_TOOLS := docker

.PHONY: proto dev-backend dev-frontend build deploy \
        test test-backend test-frontend lint check-tools

# ---------------------------------------------------------------------------
# Proto generation
# ---------------------------------------------------------------------------
proto:
	buf generate

# ---------------------------------------------------------------------------
# Development servers
# ---------------------------------------------------------------------------
dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && BROWSER=none npm run dev

# ---------------------------------------------------------------------------
# Production build — single binary with embedded frontend
# ---------------------------------------------------------------------------
build:
	cd frontend && npm ci && npm run build
	rm -rf backend/internal/ui/dist
	cp -r frontend/dist backend/internal/ui/dist
	mkdir -p bin
	cd backend && go build -tags prod -o ../bin/ai-sre ./cmd/server

# ---------------------------------------------------------------------------
# Deploy — applies manifests against the cluster in backend/config.yaml
# ---------------------------------------------------------------------------
deploy:
	kubectl --kubeconfig ~/.kube/microk8s-config apply -f k8s/ --recursive

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
test: test-backend test-frontend

test-backend:
	cd backend && go test ./... -v -race -timeout 60s

test-frontend:
	cd frontend && npx vitest run

# ---------------------------------------------------------------------------
# Lint
# ---------------------------------------------------------------------------
lint:
	cd backend  && go vet ./... && staticcheck ./...
	cd frontend && npx tsc --noEmit

# ---------------------------------------------------------------------------
# check-tools
# ---------------------------------------------------------------------------
check-tools:
	@echo "==> Checking required tools..."
	@MISSING=""; \
	for tool in $(REQUIRED_TOOLS); do \
		if ! command -v $$tool >/dev/null 2>&1; then \
			echo "  MISSING  $$tool"; \
			MISSING="$$MISSING $$tool"; \
		else \
			echo "  ok       $$tool ($$(command -v $$tool))"; \
		fi; \
	done; \
	if [ -n "$$MISSING" ]; then \
		echo ""; \
		echo "Install missing tools and re-run 'make check-tools'."; \
		exit 1; \
	fi
	@echo ""
	@echo "==> Checking optional tools..."
	@for tool in $(OPTIONAL_TOOLS); do \
		if ! command -v $$tool >/dev/null 2>&1; then \
			echo "  optional  $$tool (not found — needed only for 'make build')"; \
		else \
			echo "  ok        $$tool ($$(command -v $$tool))"; \
		fi; \
	done
	@echo ""
	@echo "All required tools found — you're good to go."
