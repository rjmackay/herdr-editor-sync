#!/bin/sh
# Symlink the mod into Herdr's mods folder, so edits here load in place.
set -eu
repo=$(cd "$(dirname "$0")" && pwd)
home=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
dest="$home/mods/editor-sync"
if [ -e "$dest" ] && [ ! -L "$dest" ]; then
  echo "$dest exists and is not a symlink; remove it first" >&2
  exit 1
fi
mkdir -p "$home/mods" "$home/data/editor-sync"
ln -sfn "$repo/mods/editor-sync" "$dest"
herdr-app check "$dest"
echo "Installed. Bind a key in $home/keys.json: \"cmd-g\": \"mod.open:editor-sync\""
