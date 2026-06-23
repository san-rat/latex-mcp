#!/usr/bin/env bash
# Sparse + shallow clones only the directories needed from the overleaf/overleaf
# monorepo to build the CLSI service image (the standalone overleaf/clsi repo is
# archived and out of date; CLSI now lives inside the main monorepo).
#
# This avoids checking out the whole monorepo (frontend, other services, etc.)
# Re-running this script is safe — it skips the clone if already present.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="$ROOT_DIR/vendor/overleaf"

if [ -d "$VENDOR_DIR/.git" ]; then
  echo "vendor/overleaf already present, skipping clone."
  exit 0
fi

mkdir -p "$ROOT_DIR/vendor"
cd "$ROOT_DIR/vendor"

# -c core.autocrlf=false avoids CRLF line endings being introduced on Windows,
# which breaks the shell scripts (install_deps.sh, entrypoint.sh) when they
# run inside the Linux container.
git -c core.autocrlf=false -c core.eol=lf clone --depth 1 --filter=blob:none --sparse https://github.com/overleaf/overleaf.git
cd overleaf
git config core.autocrlf false
git sparse-checkout set services/clsi libraries .yarn

echo "Done. CLSI source is in vendor/overleaf/services/clsi"
