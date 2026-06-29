#!/usr/bin/env bash
# Deploy the dEWSentinel pitch deck to its OWN Vercel project (dewsentinel-deck).
#
# The deck/ folder is a dedicated, static deploy root:
#   deck/index.html         <- a copy of mockup/dewsentinel-deck.html (regenerated below)
#   deck/.vercel/project.json <- links this folder to the dewsentinel-deck project
#
# It is intentionally separate from the repo root, which is linked to the
# existing `dewsentinel` console project.
#
# Usage:
#   bash deploy-deck.sh                 # uses your logged-in Vercel session
#   bash deploy-deck.sh --token=XXXXX   # or pass a Vercel access token
set -euo pipefail
cd "$(dirname "$0")"

# 1. Refresh the deployable copy from the source deck
cp mockup/dewsentinel-deck.html deck/index.html
echo "✓ synced deck/index.html ($(wc -c < deck/index.html | tr -d ' ') bytes)"

# 2. Deploy the static folder to production on the linked project
cd deck
npx --yes vercel deploy --prod "$@"
