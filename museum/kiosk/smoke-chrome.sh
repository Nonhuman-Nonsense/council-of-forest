#!/bin/bash
# Checks the parts of kiosk-window.sh that talk to Chrome's debugging port against a real Chrome:
# reading the page's heartbeat title, and closing the tabs Chrome opens beside the page. Those are
# what a Chrome update can quietly break. Runs a throwaway headless Chrome and a local page, on
# ports of their own, and touches no installed kiosk. Run it on a Mac with Chrome before
# installing the kiosk windows on a venue Mac:
#
#   museum/kiosk/smoke-chrome.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "Google Chrome is not installed." >&2; exit 1; }

TMP="$(mktemp -d /tmp/council-kiosk-smoke.XXXXXX)"
cleanup() {
  [[ -n "${CHROME_PID:-}" ]] && kill "$CHROME_PID" 2>/dev/null && wait "$CHROME_PID" 2>/dev/null
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null && wait "$WEB_PID" 2>/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

free_port() {
  python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'
}
WEB_PORT="$(free_port)"
DEBUG_PORT="$(free_port)"
PAGE="http://127.0.0.1:$WEB_PORT/"

# The page, ticking its title the way client/src/kioskHeartbeat.ts does.
mkdir -p "$TMP/www"
echo '<meta charset="utf-8"><title>Council · 1</title>' >"$TMP/www/index.html"
(cd "$TMP/www" && exec python3 -m http.server "$WEB_PORT" --bind 127.0.0.1 >/dev/null 2>&1) &
WEB_PID=$!

"$CHROME" --headless=new --user-data-dir="$TMP/profile" --remote-debugging-port="$DEBUG_PORT" \
  --no-first-run --no-default-browser-check "$PAGE" >/dev/null 2>&1 &
CHROME_PID=$!

# kiosk-window.sh's functions, for the council, pointed at this page and this Chrome.
printf 'COUNCIL_URL=%q\nCOUNCIL_PROFILE=%q\n' "$PAGE" "$TMP/profile" >"$TMP/kiosk.env"
# Not followed: shellcheck reads the early `return` there as the end of this file.
# shellcheck source=/dev/null
KIOSK_CONFIG="$TMP/kiosk.env" source "$HERE/kiosk-window.sh" council
# shellcheck disable=SC2034 # read by the sourced functions
PORT="$DEBUG_PORT"
log() { echo "    kiosk: $*"; }

failures=0
check() {
  if [[ "$2" == "$3" ]]; then
    echo "ok    $1"
  else
    echo "FAIL  $1: expected \"$3\", got \"$2\""
    failures=$((failures + 1))
  fi
}
debug() { curl -fsS --max-time 5 "${@:2}" "http://127.0.0.1:$DEBUG_PORT/json/$1"; }
open_tab() { debug "new?$1" -X PUT >/dev/null; }
# The URL of every tab, sorted, on one line.
page_urls() {
  debug list | python3 -c 'import json, sys; print(" ".join(sorted(t["url"] for t in json.load(sys.stdin) if t["type"] == "page")))'
}

for _ in {1..50}; do
  [[ "$(tab_title)" == "Council · 1" ]] && break
  sleep 0.2
done
check "the heartbeat is read from the page's tab" "$(tab_title)" "Council · 1"

open_tab "chrome://whats-new"
open_tab "about:blank"
close_other_tabs
sleep 1
check "the tabs Chrome opened beside the page are closed" "$(page_urls)" "$PAGE"
check "the heartbeat is still read after closing them" "$(tab_title)" "Council · 1"

open_tab "$PAGE"
close_other_tabs
sleep 1
check "a second copy of the page is closed" "$(page_urls)" "$PAGE"

# With no tab of the page's (an error page in its place), the watchdog decides, not this.
# shellcheck disable=SC2034 # read by the sourced functions
ORIGIN="http://127.0.0.1:1"
open_tab "about:blank"
close_other_tabs
sleep 1
check "nothing is closed while the page is missing" "$(page_urls)" "about:blank $PAGE"

if ((failures)); then
  echo "$failures check(s) failed."
  exit 1
fi
echo "All checks passed."
