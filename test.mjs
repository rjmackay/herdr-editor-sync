// Plain-node tests for the pure parts: node test.mjs
import assert from "node:assert/strict";
import { uriPath, sshAuthority, resolveHost, focusTarget, parseConfig } from "./mods/editor-sync/core.js";
import { EDITORS, editorById } from "./mods/editor-sync/editors/index.js";

assert.equal(uriPath("/a b/c"), "/a%20b/c");
assert.equal(uriPath("C:\\a b"), "/C:/a%20b");
assert.equal(sshAuthority("ubuntu@box-1"), "ssh-remote+ubuntu@box-1");
assert.match(sshAuthority("Box"), /^ssh-remote\+[0-9a-f]+$/);

const machines = [{ name: "vps", target: "ubuntu@vps", via: false }, { name: "jump", target: "x", via: true }];
assert.equal(resolveHost("vps", machines, {}), "ubuntu@vps");
assert.equal(resolveHost("jump", machines, {}), null);
assert.equal(resolveHost("jump", machines, { jump: "myhost" }), "myhost");

const spaces = [{ id: "s1", name: "kennel", folder: "/k", machine: null, active: true }, { id: "s2", name: "r", folder: "/r", machine: "vps" }];
assert.deepEqual(focusTarget({ space: "s1", cwd: "/k/sub" }, spaces), { folder: "/k/sub", machine: null, space: "kennel" });
assert.deepEqual(focusTarget({ space: "s2", cwd: null }, spaces), { folder: "/r", machine: "vps", space: "r" });
assert.equal(focusTarget(null, spaces), null);

assert.equal(parseConfig("not json").editor, "vscode");
assert.equal(parseConfig('{"editor":"zed"}').editor, "zed");
assert.equal(editorById("nope").id, "vscode");

for (const e of EDITORS) {
  for (const host of [null, "ubuntu@vps"]) {
    const tries = e.open({ folder: "/a b", host, platform: "macos" });
    assert.ok(Array.isArray(tries) && tries.every(([c, a]) => typeof c === "string" && Array.isArray(a)), `${e.id} ${host}`);
  }
}
assert.deepEqual(editorById("zed").open({ folder: "/p", host: "u@h", platform: "linux" })[0], ["zed", ["ssh://u@h/p"]]);
assert.deepEqual(editorById("vscode").open({ folder: "/p", host: null, platform: "macos" })[0], ["code", ["/p"]]);
console.log("ok");
