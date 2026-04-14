# AI SRE — Codebase Guide

A Kubernetes SRE assistant: users type plain-English queries in a chat window; the backend translates them to `kubectl` commands via an OpenAI-compatible LLM, executes them against a remote cluster, and streams the results back.

---

## Architecture

```
browser
  └── React SPA (Vite / TypeScript)
        │  ConnectRPC (HTTP/2 streaming)
        ▼
Go HTTP server (port 8080)
  ├── /sre.v1.SREService/*  →  SREServer (ConnectRPC handler)
  │     ├── LLM client  →  OpenRouter (or any OpenAI-compatible API)
  │     └── kubectl executor  →  remote microk8s cluster
  └── /*  →  embedded React SPA (go:embed)
```

In **dev mode** Vite runs on `:5173` and proxies API calls to the Go server on `:8080`.  
In **production** a single Go binary serves both the API and the embedded frontend on `:8080`.

---

## Repo Layout

```
ai-sre/
├── AGENTS.md                   this file
├── Makefile                    all build / run / test targets
├── buf.yaml                    buf module config (proto source root)
├── buf.gen.yaml                buf code-gen config (Go + TypeScript plugins)
│
├── proto/sre/v1/
│   └── sre.proto               service definition (ChatRequest / ChatResponse stream)
│
├── backend/
│   ├── config.yaml             runtime config (server, kubernetes, openai, prompts)
│   ├── go.mod / go.sum
│   ├── cmd/server/main.go      entry point — HTTP mux, SPA handler, h2c HTTP/2
│   ├── prompts/system.txt      LLM system prompt
│   └── internal/
│       ├── config/config.go    YAML loader + OPENAI_API_KEY env override
│       ├── server/server.go    ConnectRPC Chat() handler
│       ├── llm/client.go       OpenAI-compatible client, per-session history
│       ├── kubectl/executor.go kubectl runner (injects --kubeconfig / --context)
│       ├── ui/ui.go            go:embed directive for frontend dist/
│       └── gen/sre/v1/         generated protobuf + connect stubs (do not edit)
│
└── frontend/
    ├── package.json
    ├── vite.config.ts          dev proxy: /sre.v1.SREService → :8080
    ├── index.html
    └── src/
        ├── main.tsx            React entry point
        ├── App.tsx             root layout
        ├── hooks/useChat.ts    streaming chat state (session UUID, message list)
        ├── lib/client.ts       ConnectRPC transport (window.location.origin)
        ├── components/
        │   ├── ChatWindow.tsx  scrollable message list
        │   ├── InputBar.tsx    textarea + send button
        │   └── MessageBubble.tsx  renders explanation / command / output / error
        └── gen/sre/v1/         generated TypeScript protobuf types (do not edit)
```

---

## Proto Contract

`proto/sre/v1/sre.proto` — one RPC, server-streaming:

```
Chat(ChatRequest) → stream ChatResponse
```

`ChatRequest`: `message` (user query), `session_id` (UUID for multi-turn memory)

`ChatResponse` carries a `oneof payload`:

| Chunk | Fields | Meaning |
|---|---|---|
| `ExplanationChunk` | `text` | LLM narration streamed first |
| `CommandChunk` | `command` | Resolved kubectl command |
| `OutputChunk` | `text`, `success` | Raw kubectl stdout/stderr |
| `ErrorChunk` | `message` | LLM or execution failure |
| `DoneChunk` | — | Stream terminated |

---

## Config (`backend/config.yaml`)

```yaml
server:
  port: 8080

kubernetes:
  kubeconfig: ~/.kube/microk8s-config   # path to kubeconfig (~/ expands)
  context: ""                            # empty = current-context in kubeconfig

openai:
  endpoint: https://openrouter.ai/api/v1
  api_key: ""                            # override with OPENAI_API_KEY env var
  model: openai/codex-mini-latest

prompts:
  system_prompt_file: ./prompts/system.txt
```

Set your key at runtime — it is never stored in the file:

```bash
OPENAI_API_KEY=sk-or-... ./bin/ai-sre --config backend/config.yaml
```

---

## Running

### Dev mode (two terminals)

```bash
# Terminal 1 — Go backend
OPENAI_API_KEY=sk-or-... make dev-backend

# Terminal 2 — Vite frontend (hot reload)
make dev-frontend
```

Open `http://localhost:5173`.

### Production (single binary)

```bash
make build                                           # frontend → go build → bin/ai-sre
OPENAI_API_KEY=sk-or-... ./bin/ai-sre --config backend/config.yaml
```

Open `http://localhost:8080`.

---

## Makefile Targets

| Target | What it does |
|---|---|
| `make proto` | `buf generate` — regenerates Go + TypeScript stubs from proto |
| `make dev-backend` | `go run ./cmd/server` |
| `make dev-frontend` | `npm run dev` (Vite on :5173) |
| `make build` | `npm ci && npm run build` → copy dist → `go build` → `bin/ai-sre` |
| `make deploy` | `kubectl apply -f k8s/ --recursive` (uses microk8s kubeconfig) |
| `make test` | backend + frontend tests |
| `make test-backend` | `go test ./... -v -race -timeout 60s` |
| `make test-frontend` | `npx vitest run` |
| `make lint` | `go vet` + `staticcheck` + `tsc --noEmit` |
| `make check-tools` | verify buf, go, node, kubectl are on PATH |

---

## Code Generation

Run `make proto` after editing `proto/sre/v1/sre.proto`. Do **not** edit generated files.

| Plugin | Input | Output |
|---|---|---|
| `protoc-gen-go` | `sre.proto` | `backend/internal/gen/sre/v1/sre.pb.go` |
| `protoc-gen-connect-go` | `sre.proto` | `backend/internal/gen/sre/v1/srev1connect/sre.connect.go` |
| `protoc-gen-es` | `sre.proto` | `frontend/src/gen/sre/v1/sre_pb.ts` |

Required binaries (install once):

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
npm install -g @bufbuild/protoc-gen-es
```

---

## Key Design Decisions

- **Single origin** — Go binary embeds the built frontend (`go:embed`). No CORS required. Vite dev proxy achieves the same effect during development.
- **ConnectRPC** — HTTP/1.1-compatible gRPC subset; works through proxies and in browsers without grpc-web shims.
- **Session memory** — the LLM client keeps per-session message history in a `sync.Map`; the frontend generates a stable UUID per page load and sends it with every request.
- **JSON-schema LLM response** — the system prompt instructs the model to return `{explanation, command, requires_execution}` as JSON so the server can parse intent without fragile string matching.
- **protobuf-es v2** — `SREService` is exported directly from `sre_pb.ts`; there is no separate `sre_connect.ts` (that was a v1 artifact).
