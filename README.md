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

Needs the Herdr desktop app (not the legacy TUI). Tested on macOS with Herdr 0.1.12,
VS Code 1.144 and Zed 1.26.

## Install

```sh
git clone https://github.com/rjmackay/herdr-editor-sync.git ~/devel/herdr-editor-sync
cd ~/devel/herdr-editor-sync
./install.sh            # symlinks mods/editor-sync into ~/.config/herdr-app/mods
```

Put the controls (editor, Follow, Open) on the right of the status bar:

```sh
./add-to-statusbar.sh   # copies the main layout to main-editor and switches to it
```

For the tab bar instead, use `"props": {"bar": true}` on the block.

Herdr's own layouts are read-only, so this is a copy. Herdr updates to the `main`
layout won't reach it; the mods it shows (the tab bar included) still update. Run it
again on a fresh copy after a Herdr update changes `main`.

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

Follow only runs while the mod is in the layout (the status bar, or a panel). Run one copy:
two copies both follow, so the editor opens twice.

## Known limits

- **Follow flashes the editor.** VS Code and Zed both bring themselves to the front whenever
  they're asked to open a folder. Neither has a flag to stop it: VS Code calls `window.focus()`
  on every open, and Zed calls `cx.activate(true)` on every CLI and URL request. Follow opens
  with `open -g` and then hands focus back to Herdr, so you see the editor for a moment.
- **Follow opens the editor if it isn't running.**
- **A remote folder in Zed** can't use `open -g`, so it always comes forward before focus is
  handed back.

## Settings

`~/.config/herdr-app/data/editor-sync/config.json`. The panel writes it.

| Key | Default | Meaning |
|---|---|---|
| `editor` | `"vscode"` | An editor `id` from `editors/` |
| `follow` | `false` | Follow focus while a panel is open |
| `returnFocus` | `true` | macOS: Follow opens the editor in the background; if it still takes the front (a new window), give focus back to Herdr |
| `hosts` | `{}` | `{"<machine>": "<ssh host>"}` for machines without a plain ssh target (e.g. `--via`) |

## Adding an editor

1. Write `mods/editor-sync/editors/<id>.js`:

   ```js
   export default {
     id: "cursor",
     name: "Cursor",
     // t = { folder, host, platform, background }. Return the commands to try, in order; the first to
     // exit 0 wins. host is null for a local folder, else an ssh target. background is true
     // for Follow: prefer a way that doesn't activate the editor. [] = can't open.
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

## License

MIT, see [LICENSE](LICENSE). Some helpers are adapted from MIT-licensed code; see [NOTICE](NOTICE).
