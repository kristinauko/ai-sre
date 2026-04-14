package main

import (
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/yourname/ai-sre/backend/internal/config"
	"github.com/yourname/ai-sre/backend/internal/kubectl"
	"github.com/yourname/ai-sre/backend/internal/llm"
	"github.com/yourname/ai-sre/backend/internal/server"
	"github.com/yourname/ai-sre/backend/internal/ui"
)

func main() {
	cfgPath := flag.String("config", "./config.yaml", "path to config.yaml")
	flag.Parse()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if cfg.OpenAI.APIKey == "" {
		log.Fatal("openai api_key is required — set it in config.yaml or via OPENAI_API_KEY")
	}

	promptBytes, err := os.ReadFile(cfg.Prompts.SystemPromptFile)
	if err != nil {
		log.Fatalf("read system prompt %q: %v", cfg.Prompts.SystemPromptFile, err)
	}

	llmClient := llm.NewClient(cfg.OpenAI, string(promptBytes))
	kubectlExec := kubectl.NewExecutor(cfg.Kubernetes)
	srv := server.New(llmClient, kubectlExec)

	// Strip the "dist/" prefix so the embedded FS root == the web root.
	staticFS, err := fs.Sub(ui.FS, "dist")
	if err != nil {
		log.Fatalf("embed sub: %v", err)
	}

	mux := http.NewServeMux()

	// ConnectRPC handler — must be registered before the catch-all.
	rpcPath, rpcHandler := srv.Handler()
	mux.Handle(rpcPath, rpcHandler)

	// Serve the React SPA for everything else.
	mux.Handle("/", spaHandler(staticFS))

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("ai-sre listening on %s", addr)
	if err := http.ListenAndServe(addr, h2c.NewHandler(mux, &http2.Server{})); err != nil {
		log.Fatalf("server: %v", err)
	}
}

// spaHandler serves static assets from fsys. Any path that does not match a
// real file falls back to index.html so React Router can handle it.
func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name == "" {
			name = "index.html"
		}
		if _, err := fsys.Open(name); err != nil {
			http.ServeFileFS(w, r, fsys, "index.html")
			return
		}
		fileServer.ServeHTTP(w, r)
	})
}
