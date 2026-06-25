# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP server + web UI that lets LLMs (and humans) run a write → compile → check → revise loop on LaTeX documents. Compilation is done by a self-hosted instance of Overleaf's open-source CLSI (Common LaTeX Service Interface) running in Docker. See [README.md](README.md) for the high-level pitch.

## Running the system

Three things must be up. The first two are started manually and must be running before MCP tools or the UI will work; the third is spawned by the LLM client, never run by hand.

```bash
# 1. CLSI (LaTeX compiler) — Docker container on :3013
docker compose up -d

# 2. Backend service — Node process on :4000 (HTTP + WebSocket)
node packages/backend/dist/index.js          # or: npm run dev:backend (tsx watch)

# 3. MCP server — spawned over stdio by the LLM client per .mcp.json; do NOT run manually

# Web UI (optional) — Vite dev server on :5173
npm run dev --workspace=@latex-mcp/web-ui
```

The MCP server connection is defined in [.mcp.json](.mcp.json) (absolute path + `BACKEND_URL`). After rebuilding the MCP server, the LLM client must reconnect (restart the session) to pick up tool changes — you cannot hot-reload a connected MCP server mid-session.

## Build

```bash
npm run build                                  # builds shared + backend + mcp-server via tsc -b project references
npm run build --workspace=@latex-mcp/web-ui    # builds web-ui SEPARATELY (tsc --noEmit + vite build)
```

**The root `tsc -b` does NOT build `web-ui`.** web-ui is deliberately excluded from the project-reference graph in [tsconfig.json](tsconfig.json) because it uses a different module/JSX/bundler-resolution config (Vite owns its build). Always build it with its own workspace command.

## Tests

There is no automated test suite. Verification in this project is done manually:
- **MCP tools**: drive a real handshake over stdio (a throwaway Node client that spawns `packages/mcp-server/dist/index.js` and sends `initialize` → `notifications/initialized` → `tools/call`), or connect via a real client and call the tools.
- **Web UI**: run it and check in a real browser (CLSI + backend must be up).

## Architecture

The backend is the single source of truth; the MCP server and the web UI are two thin interfaces into it. This is the core design — keep "MCP-ness" confined to `packages/mcp-server`.

```
LLM client ──stdio/JSON-RPC──> mcp-server ──HTTP──┐
                                                   ├──> backend ──HTTP──> CLSI ──> TeX Live
Browser UI ──HTTP + WebSocket──────────────────────┘
```

- **Neither the MCP server nor the UI talks to CLSI directly** — both go through the backend's HTTP API. `packages/mcp-server/src/backend-client.ts` and `packages/web-ui/src/api.ts` are the only places that know the backend URL.
- **Sessions**: a session id is the CLSI `project_id`. Callers may supply one (to reuse CLSI's incremental resource caching across a revise loop) or omit it to get a fresh one. The session manager (`packages/backend/src/session-manager.ts`) is **in-memory only** — restarting the backend wipes all sessions, so a previously-compiled session will report "no resources set yet" until recompiled.
- **Reading compile output**: the backend reads the compiled `output.pdf` / `output.log` **directly off the bind-mounted volume** at `clsi-data/compiles/<sessionId>/`. It deliberately ignores the `outputFiles` URLs CLSI returns in its JSON response — those point at a `localhost:8080` download host meant for a production nginx/CDN sidecar we don't run. This is why `docker-compose.yml` bind-mounts `clsi-data/` and `config.ts` resolves `compilesDir` to it.
- **Live sync**: any compile (whether triggered by an LLM tool call or the UI's button) broadcasts a `compile-result` over the per-session WebSocket (`packages/backend/src/ws.ts`), so an open browser tab updates with no reload. The human-and-LLM-edit-the-same-document behavior depends entirely on both sides using the same session id.
- **PDF rendering happens in two places** with two different libraries: server-side in mcp-server (`@napi-rs/canvas` + `pdfjs-dist` legacy build, in `utils/pdf.ts`) to produce base64 PNGs for the `get_pdf_preview` tool; and browser-side in web-ui (`pdfjs-dist` with a Vite-bundled worker) for the live preview pane.
- **Shared types** live in `packages/shared`. The LaTeX log parser (`log-parser.ts`) is here so both the `get_compile_diagnostics` MCP tool and the UI's diagnostics panel use the same parsing.

### MCP tools (all in `packages/mcp-server/src/tools/`)

`compile_latex`, `get_page_count`, `get_pdf_preview` (omit `page` to get every page), `get_compile_log`, `get_compile_diagnostics`, `get_word_count`, `sync_source_to_pdf` / `sync_pdf_to_source` (SyncTeX). `get_word_count` and the SyncTeX tools proxy CLSI's own `/wordcount` and `/sync/{code,pdf}` endpoints through the backend.

## CLSI Docker image (the big, fragile part)

- The image is the self-contained **`with-texlive`** build target — TeX Live is installed *inside* the CLSI image (single container). It is NOT the sibling-container "sandboxed compiles" mode: that mode is gated to commercial Overleaf Server Pro and `DOCKER_RUNNER=true` simply exits with an error in the open-source build.
- The image is built from a **sparse checkout of the `overleaf/overleaf` monorepo** (the standalone `overleaf/clsi` repo is archived). [scripts/fetch-clsi-source.sh](scripts/fetch-clsi-source.sh) clones only `services/clsi` + `libraries` into `vendor/` (gitignored). Run it before `docker compose build`.
- The build is **large and slow** (~9.5GB image, `texlive-full` is ~1.4GB of downloads). The Dockerfile uses BuildKit apt cache mounts so a retry after a network blip doesn't redownload everything.
- **Windows CRLF gotcha**: the CLSI shell scripts (`install_deps.sh`, `entrypoint.sh`) must keep LF line endings or the Linux container build fails with `./install_deps.sh: not found` (exit 127). The fetch script clones with `core.autocrlf=false`; `.gitattributes` enforces `eol=lf` for `*.sh` in this repo. Do not let CRLF creep into shell scripts.
- CLSI must bind `LISTEN_ADDRESS=0.0.0.0` (set in compose); its default `127.0.0.1` is unreachable through the host port mapping.

## Conventions

- ES modules throughout (`"type": "module"`); relative imports use explicit `.js` extensions even from `.ts` sources (NodeNext resolution).
- MCP tool handlers return errors as `{ content: [...], isError: true }` rather than throwing, so tool failures surface cleanly to the LLM instead of crashing the server.
