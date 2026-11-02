// editor-sync: open what the focused agent is working on in your editor, and
// optionally keep the editor following Herdr's focus.
//
// Two ways to show it:
//   dialog  `mod.open {name: "editor-sync"}` (a key): opens the focused folder's
//           git root in the configured editor, then closes.
//   panel   a layout block or mod pane: editor picker, Follow toggle, Open.
//           While Follow is on, a focus change to another git root (after it
//           settles) opens that root in the editor.
//
// Panel key commands (keys.json): "editor-sync.open", "editor-sync.follow",
// "editor-sync.editor:<id>". They reach shown copies only.
//
// Settings: ~/.config/herdr-app/data/editor-sync/config.json
//   { "editor": "vscode", "follow": false, "returnFocus": false, "hosts": {} }

import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { appHome, closeOverlay, exec, focused, hc, nextCommand, props, readTextFile, spaces, theme, window as appWindow, writeTextFile } from "herdr";
import { focusTarget, parseConfig, resolveHost } from "./core.js";
import { EDITORS, editorById } from "./editors/index.js";

const configPath = () => `${appHome()}/data/editor-sync/config.json`;
const platform = () => appWindow()?.platform ?? "macos";

// How long focus must stay put before Follow opens it, in ticks of TICK_MS.
const TICK_MS = 400;
const SETTLE_TICKS = 2;

async function gitRoot(folder, machine) {
  try {
    const r = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: folder, on: machine });
    if (r.code === 0 && r.stdout.trim()) return r.stdout.trim();
  } catch {}
  return folder;
}

async function hostFor(machine, config) {
  if (!machine) return null;
  const r = await hc(["machine", "ls", "--json"]);
  const host = resolveHost(machine, JSON.parse(r.stdout).machines ?? [], config.hosts);
  if (!host) throw new Error(`No ssh host for "${machine}". Add it to config.json: "hosts": {"${machine}": "<ssh host>"}`);
  return host;
}

async function launch(editor, target) {
  const tries = editor.open(target);
  if (tries.length === 0) throw new Error(`${editor.name} can't open this folder`);
  let last = "";
  for (const [command, args] of tries) {
    try {
      const r = await exec(command, args);
      if (r.code === 0) return;
      last = r.stderr.trim() || `${command} exited with ${r.code}`;
    } catch (e) {
      last = e?.message ?? String(e);
    }
  }
  throw new Error(`Could not start ${editor.name}: ${last}`);
}

// The focus as { root, machine, where }: its git root, else its folder.
async function resolveFocus(focus) {
  const t = focusTarget(focus, spaces());
  if (!t) throw new Error("Nothing focused with a folder");
  const root = await gitRoot(t.folder, t.machine);
  return { root, machine: t.machine, where: t.machine ? `${t.machine}:${root}` : root };
}

async function openTarget(config, { root, machine }) {
  const host = await hostFor(machine, config);
  await launch(editorById(config.editor), { folder: root, host, platform: platform() });
}

export default class EditorSync extends View {
  init(_props, cx) {
    this.dialog = Boolean(props()?.overlay);
    this.config = parseConfig(null);
    this.configText = null;
    this.status = "";
    this.error = null;
    this.busy = false;
    // Follow state: the focus key last seen, how many ticks it has held, and
    // the git root last opened (or seeded at start, so starting doesn't open).
    this.seenKey = null;
    this.seenTicks = 0;
    this.handledKey = null;
    this.lastRoot = null;

    cx.spawn(async (cx) => {
      await this.loadConfig();
      if (this.dialog) return this.openOnce(cx);
      this.handledKey = this.focusKey();
      this.lastRoot = await resolveFocus(focused()).then((t) => t.where, () => null);
      cx.notify();
    });

    if (!this.dialog) {
      cx.timer.every(TICK_MS, (cx) => this.tick(cx));
      cx.spawn(async (cx) => {
        for (;;) {
          const c = await nextCommand();
          if (c === "open") this.openNow(cx);
          else if (c === "follow") this.setConfig(cx, { follow: !this.config.follow });
          else if (c.startsWith("editor:")) this.setConfig(cx, { editor: c.slice(7) });
          cx.notify();
        }
      });
    }
  }

  async loadConfig() {
    try {
      this.configText = await readTextFile(configPath());
    } catch {
      this.configText = null;
    }
    this.config = parseConfig(this.configText);
  }

  setConfig(cx, change) {
    this.config = { ...this.config, ...change };
    const text = JSON.stringify(this.config, null, 2) + "\n";
    if (change.follow) this.handledKey = null; // turning Follow on opens the current focus
    cx.spawn(async (cx) => {
      try {
        await writeTextFile(configPath(), text, this.configText);
        this.configText = text;
      } catch (e) {
        // Someone else changed it: take theirs plus this change next time.
        await this.loadConfig();
        this.error = `Settings not saved: ${e?.message ?? e}`;
      }
      cx.notify();
    });
    cx.notify();
  }

  focusKey() {
    const t = focusTarget(focused(), spaces());
    return t ? `${t.machine ?? ""}|${t.folder}` : null;
  }

  openOnce(cx) {
    this.busy = true;
    this.status = `Opening in ${editorById(this.config.editor).name}…`;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await openTarget(this.config, await resolveFocus(focused()));
        closeOverlay(props().overlay);
      } catch (e) {
        this.error = e?.message ?? String(e);
        this.busy = false;
        cx.notify();
      }
    });
  }

  openNow(cx, { follow = false } = {}) {
    if (this.busy) return;
    this.busy = true;
    this.error = null;
    const focus = focused();
    cx.spawn(async (cx) => {
      try {
        const target = await resolveFocus(focus);
        // Follow only moves the editor when the git root changes, not on every pane.
        if (follow && this.lastRoot === target.where) return;
        await openTarget(this.config, target);
        this.lastRoot = target.where;
        this.status = target.where;
        if (follow && this.config.returnFocus && platform() === "macos") {
          await exec("open", ["-a", "Herdr"]).catch(() => null);
        }
      } catch (e) {
        this.error = e?.message ?? String(e);
      } finally {
        this.busy = false;
        cx.notify();
      }
    });
  }

  tick(cx) {
    if (!this.config.follow || this.busy) return;
    const key = this.focusKey();
    if (key !== this.seenKey) {
      this.seenKey = key;
      this.seenTicks = 0;
      return;
    }
    if (++this.seenTicks < SETTLE_TICKS || key === null || key === this.handledKey) return;
    this.handledKey = key;
    this.openNow(cx, { follow: true });
  }

  button(t, id, label, active, onClick) {
    return div().id(id).px(8).py(2).rounded(5).text_size(12)
      .bg(active ? t.selected : t.surface)
      .text_color(active ? t.foreground : t.muted)
      .hover((s) => s.bg(t.raised))
      .on_click((_e, cx) => { onClick(cx); cx.notify(); })
      .child(label);
  }

  render() {
    const t = theme();
    const editor = editorById(this.config.editor);
    if (this.dialog) {
      return v_flex().id("editor-sync").size_full().p(16).gap(6).justify_center().bg(t.popover).text_size(13)
        .child(div().font_semibold().text_color(this.error ? t.blocked : t.foreground)
          .child(this.error ? `Could not open ${editor.name}` : this.status || "Opening…"))
        .child(div().text_size(12).text_color(t.muted).child(this.error ?? ""));
    }
    return h_flex().id("editor-sync").size_full().px(8).gap(6).items_center().bg(t.surface).text_size(12)
      .children(EDITORS.map((e) => this.button(t, `ed-${e.id}`, e.name, e.id === editor.id, (cx) => this.setConfig(cx, { editor: e.id }))))
      .child(this.button(t, "follow", this.config.follow ? "Follow: on" : "Follow: off", this.config.follow,
        (cx) => this.setConfig(cx, { follow: !this.config.follow })))
      .child(this.button(t, "open", this.busy ? "Opening…" : "Open", false, (cx) => this.openNow(cx)))
      .child(div().flex_1().min_w(0).truncate().text_color(this.error ? t.blocked : t.dim)
        .child(this.error ?? this.status));
  }
}
