// Zed. A folder on another machine opens as a Zed remote project over ssh
// (`zed ssh://host/path`), using your ~/.ssh/config.

export default {
  id: "zed",
  name: "Zed",
  open({ folder, host, platform }) {
    const target = host ? `ssh://${host}${folder}` : folder;
    const tries = [["zed", [target]], ["zeditor", [target]]];
    if (platform === "macos") {
      tries.push(["/Applications/Zed.app/Contents/MacOS/cli", [target]]);
      if (!host) tries.push(["open", ["-a", "Zed", folder]]);
    }
    return tries;
  },
};
