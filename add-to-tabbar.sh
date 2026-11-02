#!/bin/sh
# Copy a layout (default: main) and put editor-sync on the right of its tab bar.
# Herdr's own layouts are read-only, so this makes a copy and switches to it:
#   ./add-to-tabbar.sh [from] [as]       defaults: main main-editor
set -eu
from=${1:-main}
as=${2:-$from-editor}
home=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
file="$home/layouts/$as.json"
command -v jq >/dev/null || { echo "needs jq" >&2; exit 1; }
[ -e "$file" ] && { echo "$file exists; pick another name or remove it" >&2; exit 1; }

herdr-app do layout.clone "{\"name\":\"$from\",\"as\":\"$as\"}" >/dev/null

# The tabs block becomes a row: the tab bar (rest of the width) + editor-sync.
tmp=$(mktemp)
jq '
  def wrap: if type == "object" and .id == "tabs" and .type == "block" then
      { id: "tabs-row", type: "row", size: .size, divider: { width: 0 },
        children: [ (. + { size: { weight: 1 } }),
                    { id: "editor-sync", type: "block", size: { px: 196 }, window_drag: true,
                      content: { mod: "editor-sync", props: { bar: true } } } ] }
    else . end;
  walk(wrap)
' "$file" > "$tmp"
grep -q '"editor-sync"' "$tmp" || { rm -f "$tmp"; echo "no tabs block found in $from" >&2; exit 1; }
mv "$tmp" "$file"
echo "Switched to layout $as. Back to $from: herdr-app do layout.switch '{\"name\":\"$from\"}'"
