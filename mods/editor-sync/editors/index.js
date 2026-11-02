// The editors editor-sync can open. To add one, write editors/<id>.js with the
// same shape as vscode.js and list it here. Order is the order the panel shows.
//
// An editor is:
//   id        stable key, stored in config.json
//   name      for people
//   open(t)   the commands that open target t, tried in order until one exits 0:
//             [[command, args], ...]. t is { folder, host, platform }:
//               folder    absolute path on the target's machine (a git root when there is one)
//               host      null for this computer, else an ssh target such as "ubuntu@box"
//               platform  "macos" | "linux" | "windows"
//             Return [] when the editor can't open t (say, no remote support).

import vscode from "./vscode.js";
import zed from "./zed.js";

export const EDITORS = [vscode, zed];

export function editorById(id) {
  return EDITORS.find((e) => e.id === id) ?? EDITORS[0];
}
