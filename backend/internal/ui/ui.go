//go:build prod

package ui

import "embed"

// FS holds the compiled frontend assets embedded at build time.
// Populate backend/internal/ui/dist/ by running `make build` (which runs
// `npm run build` and copies frontend/dist here before `go build`).
//
//go:embed all:dist
var FS embed.FS
