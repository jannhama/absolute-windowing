import test from "node:test";
import assert from "node:assert/strict";
import { awCreateWindowManager } from "../dist/index.js";

const componentStub = {};

test("opens windows with defaults and layer-specific blocking defaults", () => {
  const manager = awCreateWindowManager({});

  const normalId = manager.openWindow({
    title: "Normal",
    component: componentStub,
    layer: "normal",
  });
  const modalId = manager.openWindow({
    title: "Modal",
    component: componentStub,
    layer: "modal",
  });
  const systemId = manager.openWindow({
    title: "System",
    component: componentStub,
    layer: "system",
  });

  const normal = manager.getWindowById(normalId);
  const modal = manager.getWindowById(modalId);
  const system = manager.getWindowById(systemId);

  assert.ok(normal);
  assert.ok(modal);
  assert.ok(system);

  assert.equal(normal.rect.x, 40);
  assert.equal(normal.rect.y, 40);
  assert.equal(normal.rect.w, 480);
  assert.equal(normal.rect.h, 320);

  assert.equal(normal.flags.isBlockingWindow, false);
  assert.equal(modal.flags.isBlockingWindow, true);
  assert.equal(system.flags.isBlockingWindow, true);
  assert.equal(manager.hasModalWindows(), true);
});

test("activation stays within layer and is blocked by modal/system blocking windows", () => {
  const manager = awCreateWindowManager({});

  const normalA = manager.openWindow({ title: "A", component: componentStub, layer: "normal" });
  const normalB = manager.openWindow({ title: "B", component: componentStub, layer: "normal" });
  assert.equal(manager.getTopmostInLayer("normal")?.id, normalB);

  manager.activateWindow(normalA);
  assert.equal(manager.getTopmostInLayer("normal")?.id, normalA);

  const modal = manager.openWindow({ title: "Modal", component: componentStub, layer: "modal" });
  assert.equal(manager.getTopmostInLayer("modal")?.id, modal);

  manager.activateWindow(normalB);
  assert.equal(manager.getTopmostInLayer("normal")?.id, normalA);

  const system = manager.openWindow({
    title: "System",
    component: componentStub,
    layer: "system",
    flags: { isBlockingWindow: true },
  });

  manager.activateWindow(modal);
  assert.equal(manager.getTopmostInLayer("modal")?.id, modal);

  manager.activateWindow(system);
  assert.equal(manager.getTopmostInLayer("system")?.id, system);
});

test("onBeforeWindowClose can block close and closeWindowAsync removes when allowed", async () => {
  const manager = awCreateWindowManager({
    onBeforeWindowClose: (window) => window.title !== "Keep",
  });

  const keep = manager.openWindow({ title: "Keep", component: componentStub });
  const close = manager.openWindow({ title: "Close", component: componentStub });

  await manager.closeWindowAsync(keep);
  assert.ok(manager.getWindowById(keep));

  await manager.closeWindowAsync(close);
  assert.equal(manager.getWindowById(close), undefined);
});

test("toggle minimize and maximize roundtrips rect/state", () => {
  const manager = awCreateWindowManager({});
  const id = manager.openWindow({
    title: "Resizable",
    component: componentStub,
    rect: { x: 100, y: 120, w: 600, h: 400 },
  });

  const original = manager.getWindowById(id);
  assert.ok(original);
  assert.equal(original.state, "open");

  manager.toggleMinimize(id);
  const minimized = manager.getWindowById(id);
  assert.ok(minimized);
  assert.equal(minimized.state, "minimized");
  assert.equal(minimized.prevRect?.w, 600);
  assert.equal(minimized.prevRect?.h, 400);

  manager.toggleMinimize(id);
  const restored = manager.getWindowById(id);
  assert.ok(restored);
  assert.equal(restored.state, "open");
  assert.equal(restored.rect.w, 600);
  assert.equal(restored.rect.h, 400);

  manager.toggleMaximize(id, { w: 1000, h: 700 });
  const maximized = manager.getWindowById(id);
  assert.ok(maximized);
  assert.equal(maximized.state, "maximized");
  assert.deepEqual(maximized.rect, { x: 0, y: 0, w: 1000, h: 700 });

  manager.toggleMaximize(id, { w: 1000, h: 700 });
  const unmaximized = manager.getWindowById(id);
  assert.ok(unmaximized);
  assert.equal(unmaximized.state, "open");
  assert.deepEqual(unmaximized.rect, { x: 100, y: 120, w: 600, h: 400 });
});

test("layer start index reflects the number of windows in lower layers", () => {
  const manager = awCreateWindowManager({});
  manager.openWindow({ title: "n1", component: componentStub, layer: "normal" });
  manager.openWindow({ title: "n2", component: componentStub, layer: "normal" });
  manager.openWindow({ title: "u1", component: componentStub, layer: "utility" });
  manager.openWindow({ title: "o1", component: componentStub, layer: "overlay" });

  assert.equal(manager.getLayerStartIndex("normal"), 0);
  assert.equal(manager.getLayerStartIndex("utility"), 2);
  assert.equal(manager.getLayerStartIndex("overlay"), 3);
  assert.equal(manager.getLayerStartIndex("modal"), 4);
  assert.equal(manager.getLayerStartIndex("system"), 4);
});

test("openWindow accepts caller-defined initial state", () => {
  const manager = awCreateWindowManager({});
  const id = manager.openWindow({
    title: "Max on open",
    component: componentStub,
    state: "maximized",
    rect: { x: 0, y: 0, w: 1280, h: 720 },
  });

  const win = manager.getWindowById(id);
  assert.ok(win);
  assert.equal(win.state, "maximized");
  assert.deepEqual(win.rect, { x: 0, y: 0, w: 1280, h: 720 });
});
