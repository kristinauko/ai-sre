//go:build !prod

package ui

import "embed"

// FS is empty in dev mode; the Vite dev server serves the frontend instead.
var FS embed.FS
