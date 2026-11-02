// Visual Studio Code. A folder on another machine opens through the Remote - SSH
// extension: the window is here, the files stay there.

import { uriPath, sshAuthority, systemOpener } from "../core.js";

export default {
  id: "vscode",
  name: "VS Code",
  open({ folder, host, platform, background }) {
    const opener = systemOpener(platform);
    const url = host
      ? `vscode://vscode-remote/${sshAuthority(host)}${uriPath(folder)}`
      : `vscode://file${uriPath(folder)}`;
    // macOS: `open -g` hands VS Code the folder without activating it. VS Code
    // still comes forward when it has to make a new window; Follow handles that.
    const quiet = background && platform === "macos"
      ? [host ? ["open", ["-g", url]] : ["open", ["-g", "-a", "Visual Studio Code", folder]]]
      : [];
    const cli = host
      ? ["code", ["--folder-uri", `vscode-remote://${sshAuthority(host)}${uriPath(folder)}`]]
      : ["code", [folder]];
    return [...quiet, cli, ...(opener ? [[opener, [url]]] : [])];
  },
};
