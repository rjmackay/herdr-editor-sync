#!/bin/sh
# Copy a layout (default: main) and put editor-sync on the right of its status bar.
# Herdr's own layouts are read-only, so this makes a copy and switches to it:
#   ./add-to-statusbar.sh [from] [as]       defaults: main main-editor
set -eu
from=${1:-main}
as=${2:-$from-editor}
home=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
file="$home/layouts/$as.json"
command -v jq >/dev/null || { echo "needs jq" >&2; exit 1; }
[ -e "$file" ] && { echo "$file exists; pick another name or remove it" >&2; exit 1; }

herdr-app do layout.clone "{\"name\":\"$from\",\"as\":\"$as\"}" >/dev/null

# The status block becomes a row: the status bar (rest of the width) + editor-sync.
tmp=$(mktemp)
jq -f /dev/stdin "$file" > "$tmp" <<'JQ'
def wrap: if type == "object" and .id == "status" and .type == "block" then
    { id: "status-row", type: "row", size: .size, divider: { width: 0 },
      children: [ (. + { size: { weight: 1 } }),
                  { id: "editor-sync", type: "block", size: { px: 180 },
                    content: { mod: "editor-sync", props: { bar: "status" } } } ] }
  else . end;
walk(wrap)
JQ
grep -q '"editor-sync"' "$tmp" || { rm -f "$tmp"; echo "no status block found in $from" >&2; exit 1; }
mv "$tmp" "$file"
echo "Switched to layout $as. Back to $from: herdr-app do layout.switch '{\"name\":\"$from\"}'"
