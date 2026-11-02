// Visual Studio Code. A folder on another machine opens through the Remote - SSH
// extension: the window is here, the files stay there.

import { uriPath, sshAuthority, systemOpener } from "../core.js";

export default {
  id: "vscode",
  name: "VS Code",
  open({ folder, host, platform }) {
    const opener = systemOpener(platform);
    if (!host) {
      return [
        ["code", [folder]],
        ...(opener ? [[opener, [`vscode://file${uriPath(folder)}`]]] : []),
      ];
    }
    const authority = sshAuthority(host);
    return [
      ["code", ["--folder-uri", `vscode-remote://${authority}${uriPath(folder)}`]],
      ...(opener ? [[opener, [`vscode://vscode-remote/${authority}${uriPath(folder)}`]]] : []),
    ];
  },
};
