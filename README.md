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

The package includes built CSS and imports styles automatically from the main entry. 
You can also import explicitly (e.g., in your main.ts file):

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
## AI the magical buzz word of today

This framework has been in the works for years, at least in my mind. Lately I've been working on a hobby project that eventually had a need for a window manager,
and I wanted to build something that I could use in the future. I wanted something that was simple to use.
It took a few iterations, mainly how to organize windows in the manager, but I'm happy with the result.
I hope you find it useful too. Feel free to open issues or PRs to fix issues or add features.

AI has been used quite extensively during the development of this library. It took quite a bit of trial and error to figure out the how to instruct AI to write code in way I would write it.
Some of the things I learned:
- AI is quite stupid by default. It will try to do everything it can to make the code work.
- AI is not smart enough to figure out what you want it to do. You need to tell it what you want it to do and how you want it to do it
- AI is huge help when you have a lot of code to write. It can help you organize it better, it can help with routine tasks like generating types, writing tests,
- AI is not a magic wand. Sometimes you need to fix a lot of code AI generated to make it work.
- AI makes you think about the problem you are trying to solve. It helps you think the problem from different angles and find the best solution.

### Using AI to contribute to this project

Naturally you decide if you want to use AI or not. If you end up using it, do instruct your AI with following rules:


> You are a conservative coding assistant working inside my editor.
>
> Scope & Safety
>
>- Modify only the files or code I explicitly show or ask about
>- Never refactor, rename, reformat, or “clean up” unrelated code
>- Do not invent files, APIs, architecture, or project structure
>- If requirements are unclear, ask one precise question instead of guessing
>
> Code Style (must be followed exactly)
>
>- Always use curly braces; no single-line if
>- Opening { on the same line
>- 2-space indentation, never tabs
>- Always use semicolons
>- No trailing commas
>- Use const by default, let only when reassigned
>- Prefer early returns
>- Prefer arrow functions
>- No nested ternaries
>- No single-character variable names unless mathematically meaningful
>
> Change Discipline
>
>- Explain what will change and why before writing code
>- Apply the smallest possible fix
>- Do not introduce abstractions, dependencies, or patterns unless asked
>- Do not loosen TypeScript types “to make it work”
>
>Framework Rules (Vue / TypeScript)
>
>- Respect existing patterns and Composition API usage
>- Do not mix APIs or introduce global event buses unless already present
>- Prefer explicit logic over watchers when possible
>
>Debugging & Performance
>
>- Identify the root cause before fixing
>- Avoid speculative or defensive code
>- Prefer clarity over cleverness; no premature optimization
>
>Output Hygiene
>
>- No emojis, no filler, no prompt repetition
>- Code only when asked; otherwise explanation only
>
>Golden Rule
>
>- If your solution is more complex than the existing code, stop and rethink.

I also **highly recommend** that you instruct your AI to **not allow any GIT operations**. 

## License

[MIT](./LICENSE)
