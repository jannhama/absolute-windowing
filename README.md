# Absolute Windowing

A lightweight window manager for Vue 3 applications. 

It provides draggable, resizable, layered windows (`normal`, `utility`, `overlay`, `modal`, `system`) with keyboard routing, focus handling, snap behavior, and optional modal/system backdrops.

## Features

- Vue 3 component-based windows
- Layer-aware z-ordering
- Drag, resize, minimize, maximize, close
- Window snapping (edges, grid, other windows)
- Modal and system blocking behavior
- Optional close on `Escape` and backdrop click
- Theme and density controls via options + CSS variables

## Installation

```bash
npm install absolute-windowing
```

Peer dependency:

- `vue` `^3.3.0`

Runtime requirement:

- `node >= 20`

## Quick Start

```vue
<script setup lang="ts">
import { WindowHost, awCreateWindowManager, type AwWindowManager } from 'absolute-windowing';
import HelloWindow from './HelloWindow.vue';

const manager: AwWindowManager = awCreateWindowManager({
  onWindowOpened: (win) => console.log('opened', win.id),
  onWindowClosed: (win) => console.log('closed', win.id),
});

const openHello = () => {
  manager.openWindow({
    title: 'Hello',
    component: HelloWindow,
    rect: { x: 80, y: 80, w: 520, h: 340 },
    layer: 'normal',
    flags: {
      closeOnEsc: true,
      minimizable: true,
      maximizable: true,
    },
    props: { message: 'Hello from Absolute Windowing' },
  });
};
</script>

<template>
  <button @click="openHello">Open window</button>

  <div style="height: 80vh;">
    <WindowHost
      :window-manager="manager"
      :options="{
        theme: 'dark',
        snapToEdges: true,
        snapToWindows: true,
        showGuides: true
      }"
    />
  </div>
</template>
```

`WindowHost` should be rendered inside a container with a defined size (`height`, `min-height`, etc.).

## Exports

```ts
import {
  WindowHost,
  WindowShell,
  awCreateWindowManager,
  AW_DEFAULT_OPTIONS,
  AW_DEFAULT_FLAGS,
  AW_DEFAULT_RECT,
} from 'absolute-windowing';
```

Types are exported from `absolute-windowing` (for example `AwWindowManager`, `AwCreateWindowInput`, `AwWindowModel`, `AwOptions`).

## Manager API

Create a manager with lifecycle hooks:

```ts
const manager = awCreateWindowManager({
  onWindowOpened: (window) => {},
  onBeforeWindowClose: async (window) => true,
  onWindowClosed: (window) => {},
  onBeforeWindowActivate: (window) => {},
  onWindowActivated: (window) => {},
  onWindowMove: (window) => {},
  onWindowResize: (window) => {},
});
```

Core methods:

- `openWindow(input)`
- `closeWindow(id)`
- `closeWindowAsync(id)`
- `activateWindow(id)`
- `moveWindow(id, rect)`
- `resizeWindow(id, rect)`
- `toggleMinimize(id)`
- `toggleMaximize(id, bounds)`
- `getWindowById(id)`
- `getState()`
- `getWindows()`
- `getWindowsForRender()`
- `getWindowsForLayer(layer)`
- `getLayerStartIndex(layer)`
- `getTopmostInLayer(layer)`
- `getTopmostOverall()`
- `hasModalWindows()`
- `focusWindow(id | null)`

## `WindowHost` Props

- `windowManager: AwWindowManager` (required)
- `options?: Partial<AwOptions>`

`WindowHost` also exposes a `titlebar-right` slot from each `WindowShell` instance:

```vue
<WindowHost :window-manager="manager">
  <template #titlebar-right="{ win }">
    <button @click="pin(win.id)">Pin</button>
  </template>
</WindowHost>
```

## Window Layers

- `normal`: standard app windows
- `utility`: tool panels over normal windows
- `overlay`: side overlays / transient elevated windows
- `modal`: modal windows (backdrop + focus lock)
- `system`: highest layer, can be blocking

## Window Flags

- `movable`
- `resizable`
- `closable`
- `minimizable`
- `maximizable`
- `closeOnEsc`
- `closeOnBackdrop`
- `isBlockingWindow`

Defaults:

- `isBlockingWindow` defaults to `true` for `modal` and `system`, otherwise `false`
- other behavior defaults are in `AW_DEFAULT_FLAGS`

## Host Options (`AwOptions`)

Default values:

```ts
{
  density: 'comfortable',
  theme: 'dark',
  gridSize: 16,
  showGuides: false,
  showTitleBar: true,
  showWindowControls: true,
  windowSnapOffset: 8,
  edgeSnapOffset: 8,
  snapToGrid: false,
  snapToEdges: true,
  snapToWindows: false,
  locked: false,
  minWidth: 320,
  minHeight: 240,
}
```

Interaction modifiers during drag/resize:

- Hold `Shift` to apply grid snapping when `snapToGrid` is enabled
- Hold `Alt` to temporarily disable edge/window snapping

## Styling

The package includes built CSS and imports styles automatically from the main entry. You can also import explicitly:

```ts
import 'absolute-windowing/style.css';
```

The root host uses `.aw-wm-root` and CSS variables for theming. Built-in themes are driven by:

- `data-aw-theme="dark" | "light"`
- `data-density="comfortable" | "compact"`

Override variables such as `--aw-wm-bg`, `--aw-wm-window-bg`, `--aw-wm-titlebar-h`, and `--aw-wm-radius` on `.aw-wm-root` in your app styles.

## Development

```bash
npm run type-check
npm run lint
npm run build
```

## License

[MIT](./LICENSE)
