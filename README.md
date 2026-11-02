# herdr-editor-sync

A [Herdr](https://herdr.dev) desktop-app mod: open what the focused agent is working on in
your editor, and optionally keep the editor following Herdr's focus.

- **Quick open:** a key opens the focused terminal's git root (else its folder) in your
  editor. Each git worktree gets its own editor window, and pressing the key again brings
  that window forward.
- **Follow** (off by default): when focus settles on a terminal in another git root, the
  editor switches to that root. Moving between panes in the same repo does nothing.
- **Remote spaces:** VS Code opens them through Remote - SSH, and Zed as an ssh remote project.
- **Editors:** VS Code and Zed. Adding another is one file (see below).

## Install

```sh
git clone <this repo> ~/devel/herdr-editor-sync
cd ~/devel/herdr-editor-sync
./install.sh            # symlinks mods/editor-sync into ~/.config/herdr-app/mods
```

Bind the quick-open key in `~/.config/herdr-app/keys.json`, under `"global"`:

```json
"cmd-g": "mod.open:editor-sync"
```

## Use

| Want | Do |
|---|---|
| Open the focused folder | Press the key (`cmd-g` above) |
| Pick the editor, turn Follow on, open | The panel: open it as a mod pane, e.g. `herdr-app do pane.split '{"direction":"down","mod":"editor-sync"}'` |
| Drive the panel from keys | Bind `editor-sync.open`, `editor-sync.follow` or `editor-sync.editor:zed`. These reach a shown panel only |

Follow only runs while a panel exists. Put it in your layout to keep it running.

## Settings

`~/.config/herdr-app/data/editor-sync/config.json`. The panel writes it.

| Key | Default | Meaning |
|---|---|---|
| `editor` | `"vscode"` | An editor `id` from `editors/` |
| `follow` | `false` | Follow focus while a panel is open |
| `returnFocus` | `false` | macOS: after Follow opens the editor, bring Herdr back to the front |
| `hosts` | `{}` | `{"<machine>": "<ssh host>"}` for machines without a plain ssh target (e.g. `--via`) |

## Adding an editor

1. Write `mods/editor-sync/editors/<id>.js`:

   ```js
   export default {
     id: "cursor",
     name: "Cursor",
     // t = { folder, host, platform }. Return the commands to try, in order; the first to
     // exit 0 wins. host is null for a local folder, else an ssh target. [] = can't open.
     open({ folder, host }) {
       return host ? [] : [["cursor", [folder]]];
     },
   };
   ```

2. Add it to `EDITORS` in `editors/index.js`.
3. Run `node test.mjs` and `herdr-app check ~/.config/herdr-app/mods/editor-sync`.

## Develop

```sh
node test.mjs                                        # pure helpers and the editor registry
herdr-app check ~/.config/herdr-app/mods/editor-sync # loads and renders the mod
```

Saving a file reloads the mod in place. `herdr-app status` shows load errors.
