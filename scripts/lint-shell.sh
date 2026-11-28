#!/bin/bash
# Runs shellcheck on every shell script in the repo: the kiosk windows and the button bridge's
# installers, which run on venue Macs where a mistake shows up only on site. Part of the client's
# `npm run lint`. Each file is checked from its own folder, so its `source` lines resolve.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v shellcheck >/dev/null; then
  echo "lint-shell: shellcheck is not installed (brew install shellcheck); shell scripts not checked." >&2
  exit 0
fi

status=0
while IFS= read -r file; do
  (cd "$ROOT/$(dirname "$file")" && shellcheck -x "$(basename "$file")") || status=1
done < <(git -C "$ROOT" ls-files '*.sh')
exit $status
