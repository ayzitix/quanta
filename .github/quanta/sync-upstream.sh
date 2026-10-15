#!/usr/bin/env bash
#
# Sync the `dev` branch of upstream anomalyco/opencode into this fork.
#
# Usage:
#   ./sync-upstream.sh              # merge upstream/dev into local dev
#   ./sync-upstream.sh --rebase     # rebase local dev onto upstream/dev instead
#   ./sync-upstream.sh --push       # push the result to origin afterwards
#   UPSTREAM=my-fork ./sync-upstream.sh
#
set -euo pipefail

UPSTREAM="${UPSTREAM:-upstream}"
BASE="${BASE:-dev}"
MODE="merge"
PUSH=0

while [ $# -gt 0 ]; do
  case "$1" in
    --rebase) MODE="rebase" ;;
    --merge) MODE="merge" ;;
    --push) PUSH=1 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

if ! git remote get-url "$UPSTREAM" >/dev/null 2>&1; then
  echo "error: remote '$UPSTREAM' not found" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty, commit or stash first" >&2
  exit 1
fi

if [ "$(git branch --show-current)" != "$BASE" ]; then
  git switch "$BASE"
fi

echo "==> fetching $UPSTREAM/$BASE"
git fetch "$UPSTREAM" "$BASE" --tags --prune

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "$UPSTREAM/$BASE")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "==> already up to date with $UPSTREAM/$BASE"
  exit 0
fi

echo "==> local  $LOCAL"
echo "==> remote $REMOTE"

if git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
  echo "==> fast-forwarding to $UPSTREAM/$BASE"
  git merge --ff-only "$UPSTREAM/$BASE"
elif [ "$MODE" = "rebase" ]; then
  echo "==> rebasing onto $UPSTREAM/$BASE"
  git rebase "$UPSTREAM/$BASE"
else
  echo "==> merging $UPSTREAM/$BASE"
  git merge --no-edit "$UPSTREAM/$BASE"
fi

if [ "$PUSH" -eq 1 ]; then
  echo "==> pushing to origin/$BASE"
  git push origin "$BASE"
fi