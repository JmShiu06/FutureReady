#!/bin/bash
set -e
bash scripts/remove-retired-chromadb.sh
pnpm install --frozen-lockfile
pnpm --filter db push
