// Zed. A folder on another machine opens as a Zed remote project over ssh
// (`zed ssh://host/path`), using your ~/.ssh/config.

export default {
  id: "zed",
  name: "Zed",
  open({ folder, host, platform, background }) {
    const target = host ? `ssh://${host}${folder}` : folder;
    const tries = [];
    // macOS: `open -g` hands Zed the folder without activating it.
    if (background && platform === "macos" && !host) tries.push(["open", ["-g", "-a", "Zed", folder]]);
    tries.push(["zed", [target]], ["zeditor", [target]]);
    if (platform === "macos") {
      tries.push(["/Applications/Zed.app/Contents/MacOS/cli", [target]]);
      if (!host) tries.push(["open", ["-a", "Zed", folder]]);
    }
    return tries;
  },
};
