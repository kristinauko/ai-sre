package kubectl

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/yourname/ai-sre/backend/internal/config"
)

// Executor runs kubectl commands against the configured cluster.
type Executor struct {
	kubeconfig string
	context    string
	binary     string
}

func NewExecutor(cfg config.KubernetesConfig) *Executor {
	binary := cfg.Binary
	if binary == "" {
		binary = "kubectl"
	}
	return &Executor{
		kubeconfig: cfg.Kubeconfig,
		context:    cfg.Context,
		binary:     binary,
	}
}

// Run executes the given kubectl command string and returns the combined
// stdout+stderr output along with whether the process exited successfully.
// The first token of command must be "kubectl".
func (e *Executor) Run(ctx context.Context, command string) (output string, success bool) {
	parts := strings.Fields(command)
	if len(parts) == 0 {
		return "empty command", false
	}
	if parts[0] != "kubectl" {
		return fmt.Sprintf("rejected: command must start with kubectl, got %q", parts[0]), false
	}

	args := parts[1:]
	if e.kubeconfig != "" {
		args = append([]string{"--kubeconfig", e.kubeconfig}, args...)
	}
	if e.context != "" {
		args = append([]string{"--context", e.context}, args...)
	}

	binaryParts := strings.Fields(e.binary)
	cmd, leadingArgs := binaryParts[0], binaryParts[1:]
	args = append(leadingArgs, args...)
	out, err := exec.CommandContext(ctx, cmd, args...).CombinedOutput()
	if err != nil && len(out) == 0 {
		return fmt.Sprintf("kubectl exec error: %v", err), false
	}
	return string(out), err == nil
}
