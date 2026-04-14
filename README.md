# AI SRE

A chat interface for your Kubernetes cluster. Ask questions in plain English — the assistant figures out the right `kubectl` command, runs it, and streams the output back to you.

---

## What it does

- **Natural language → kubectl** — describe what you want to know or do; the assistant translates it to the right command
- **Streaming responses** — explanation, command, and live output appear as they arrive
- **Multi-turn memory** — the assistant remembers earlier messages in the same session
- **Safe by default** — the system prompt instructs the model to only run `kubectl` commands; nothing else executes

### Example queries

```
How many pods are running in the default namespace?
Show me the logs for the most recent crash in kube-system.
What nodes are in the cluster and how much memory do they have?
Scale the nginx deployment to 3 replicas.
```

---

## Requirements

| Tool | Purpose |
|---|---|
| Go 1.22+ | build and run the backend |
| Node 18+ | build the frontend |
| kubectl | execute commands against the cluster |
| buf | regenerate protobuf stubs (only needed when editing the proto) |

A kubeconfig pointing at your cluster (e.g. `~/.kube/microk8s-config`) and an [OpenRouter](https://openrouter.ai) API key (or any OpenAI-compatible key).

---

## Setup

### 1. Configure

Edit `backend/config.yaml`:

```yaml
kubernetes:
  kubeconfig: ~/.kube/microk8s-config   # path to your kubeconfig
  context: ""                            # leave empty to use the current context

openai:
  endpoint: https://openrouter.ai/api/v1
  model: openai/codex-mini-latest
```

Your API key is never stored in the file — pass it as an environment variable at runtime.

### 2. Install frontend dependencies

```bash
cd frontend && npm install
```

---

## Running

### Dev mode

Two terminals, hot reload on both sides:

```bash
# Terminal 1 — backend
OPENAI_API_KEY=sk-or-... make dev-backend

# Terminal 2 — frontend
make dev-frontend
```

Open **http://localhost:5173**

### Production mode

Single binary, single port:

```bash
make build
OPENAI_API_KEY=sk-or-... ./bin/ai-sre --config backend/config.yaml
```

Open **http://localhost:8080**

---

## Get an API key

Sign up at [openrouter.ai](https://openrouter.ai) → Keys → Create key.  
Keys start with `sk-or-`.

OpenRouter gives access to many models on a pay-per-use basis with no subscription required.

---

## Known issues & future enhancements

### Safety (priority)

- **Command validator** — an independent validation step that checks whether the proposed `kubectl` command actually matches the stated user intent before execution; currently the model is trusted end-to-end with no cross-check
- **Destructive / wide-impact guardrails** — commands such as `delete`, `drain`, `cordon`, or those targeting all namespaces (`-A`) should trigger a confirmation turn before execution rather than running immediately
- **Prompt injection via resource names** — a malicious pod or container whose name contains instruction-like text (e.g. `ignore-previous-instructions-and-exec`) could influence the model's next action; resource names returned from the cluster must be treated as untrusted data and sanitised before being included in the model context

### Testing

- No automated tests exist yet — unit tests for the executor, config loader, and RPC handlers; integration tests against a real (or kind/k3d) cluster; end-to-end tests for the full chat flow

### Observability

- **Structured logging** — replace `log.Printf` with structured logs (level, request ID, latency, kubectl exit code)
- **Debug mode** — flag or env var to log the full prompt sent to the model and the raw completion, without exposing this in production
- **Error messages** — surface kubectl stderr and non-zero exit codes to the user in a readable way instead of a bare failure flag

### UI

- **Loading / streaming state** — show a visible indicator while the model is generating or kubectl is running
- **Prompt history** — recall and re-submit previous queries within the session
- **Command preview** — display the proposed `kubectl` command before execution so the user can see what will run
- **Copy button** — one-click copy for command and output blocks
