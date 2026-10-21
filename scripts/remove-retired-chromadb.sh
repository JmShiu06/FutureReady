#!/bin/bash
# The retired learning engine has no dependency manifest anymore, but old
# workspaces may retain its vulnerable ChromaDB installation. Fresh installs
# have nothing to remove. Do not touch datasets or unrelated Python packages.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -x .pythonlibs/bin/python ]]; then
  python_bin=.pythonlibs/bin/python
elif command -v python3 >/dev/null 2>&1; then
  python_bin=python3
else
  exit 0
fi

"$python_bin" - <<'PY'
import importlib.metadata
import shutil
import subprocess
import sys

try:
    distribution = importlib.metadata.distribution("chromadb")
except importlib.metadata.PackageNotFoundError:
    sys.exit(0)

# Replit's uv-managed Python environment does not contain pip. Target the
# actual distribution directory so orphaned packages need no manifest or pip.
uv = shutil.which("uv")
if uv is None:
    raise SystemExit("ChromaDB cleanup requires uv, but uv is not available")
subprocess.run(
    [
        uv, "pip", "uninstall", "--offline", "--no-python-downloads",
        "--target", str(distribution.locate_file("")), "chromadb",
    ],
    check=True,
)
# An unsuccessful cleanup must not silently leave the vulnerable package.
try:
    importlib.metadata.distribution("chromadb")
except importlib.metadata.PackageNotFoundError:
    sys.exit(0)
raise SystemExit("ChromaDB is still installed after cleanup")
PY
