// Pure helpers: no Herdr calls, so they can be tested with plain node.

// Everything but unreserved characters, so a path survives a URI.
function encodeSegment(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// "/a b/c" -> "/a%20b/c"; "C:\\a b" -> "/C:/a%20b".
export function uriPath(folder) {
  const slashed = folder.replace(/\\/g, "/");
  const drive = slashed.match(/^([A-Za-z]):(\/.*)?$/);
  if (drive) return `/${drive[1]}:${(drive[2] ?? "/").split("/").map(encodeSegment).join("/")}`;
  return slashed.split("/").map(encodeSegment).join("/");
}

// UTF-8 bytes as lowercase hex (Herdr's JS has no TextEncoder).
function utf8Hex(s) {
  return encodeURIComponent(s)
    .replace(/%([0-9A-F]{2})|([\s\S])/g, (_, hex, c) => (hex ?? c.charCodeAt(0).toString(16).padStart(2, "0")).toLowerCase());
}

// VS Code's Remote - SSH authority. VS Code lowercases URI authorities, so a
// host with anything beyond [a-z0-9._@-] is passed hex-encoded as JSON.
export function sshAuthority(host) {
  if (/^[a-z0-9._@-]+$/.test(host)) return `ssh-remote+${host}`;
  return `ssh-remote+${utf8Hex(JSON.stringify({ hostName: host }))}`;
}

export function systemOpener(platform) {
  if (platform === "macos") return "open";
  if (platform === "linux") return "xdg-open";
  return null;
}

// The ssh target for a Herdr machine, from `hc machine ls --json` machines and
// optional overrides ({ "<machine name>": "<ssh host>" }). null when an editor
// can't reach it over plain ssh (a `--via` machine with no override).
export function resolveHost(name, machines, overrides) {
  if (overrides?.[name]) return overrides[name];
  const m = machines.find((x) => x.name === name);
  if (!m || m.via || !m.target || /\s/.test(m.target)) return null;
  return m.target;
}

// What to open for the current focus: the focused terminal's folder, else the
// space's folder. machine is null for this computer.
export function focusTarget(focus, spaceList) {
  if (!focus) return null;
  const space = spaceList.find((s) => s.id === focus.space) ?? spaceList.find((s) => s.active);
  const folder = focus.cwd || space?.folder || null;
  if (!folder) return null;
  return { folder, machine: space?.machine ?? null, space: space?.name ?? null };
}

export const DEFAULT_CONFIG = { editor: "vscode", follow: false, returnFocus: false, hosts: {} };

export function parseConfig(text) {
  if (!text) return { ...DEFAULT_CONFIG };
  try {
    const c = JSON.parse(text);
    return { ...DEFAULT_CONFIG, ...(c && typeof c === "object" ? c : {}) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
