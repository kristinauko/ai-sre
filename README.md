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
