# latex-mcp

An open-source [Model Context Protocol](https://modelcontextprotocol.io) server that lets LLMs (Claude, Codex, Gemini/Antigravity, and other MCP-compatible clients) compile LaTeX documents and inspect the resulting PDF — enabling a fully autonomous write → compile → check → revise loop.

It talks to a self-hosted instance of Overleaf's open-source [CLSI](https://github.com/overleaf/clsi) (Common LaTeX Service Interface) over HTTP, and also exposes a small web UI (in the spirit of Overleaf's editor) so a human can watch or collaborate on the same document a connected LLM is editing.

> Status: early scaffolding, under active development.

## Architecture

```
[LLM client (Claude / Codex / Antigravity / ...)]      [Browser UI]
                  |  MCP (stdio)                          |  HTTP + WebSocket
                  v                                       v
                         [latex-mcp backend service]
                                    |
                                    | HTTP REST
                                    v
                         [Self-hosted CLSI] (Docker)
                                    |
                                    v
                         [TeX Live container] (actual compilation)
```

## Setup

Full setup instructions (CLSI via Docker, running the backend, and connecting from
Claude Desktop, Claude Code, Codex CLI, Antigravity, and others) are coming as the
project is built out.

## License

MIT — see [LICENSE](LICENSE). Note this project is independent and not affiliated
with Overleaf; it only communicates with the open-source CLSI component over its
HTTP API.
