// src/windowing/core/windowManager.ts
import { reactive, computed, markRaw } from 'vue';
import type {
  AwCreateWindowInput,
  AwWindowFlags,
  AwWindowId,
  AwWindowLayer,
  AwWindowManager,
  AwWindowManagerHooks,
  AwWindowModel,
  AwWindowRect,
} from '../types';
import { AW_DEFAULT_FLAGS, AW_DEFAULT_RECT } from '../constants';
import { clamp, genId } from '../internal/utils';




export const awCreateWindowManager = (hooks: AwWindowManagerHooks): AwWindowManager => {
  const state = reactive({
    windows: [] as AwWindowModel[],
  });

  const closingIds = new Set<AwWindowId>();

  const layerPriority = (layer: AwWindowLayer): number => {
    if (layer === 'normal') {
      return 0;
    }
    if (layer === 'overlay') {
      return 1;
    }
    return 2;
  };

  const getLayerRange = (layer: AwWindowLayer): { start: number; end: number } => {
    const prio = layerPriority(layer);

    let start = 0;
    while (start < state.windows.length && layerPriority(state.windows[start].layer) < prio) {
      start += 1;
    }

    let end = start;
    while (end < state.windows.length && layerPriority(state.windows[end].layer) === prio) {
      end += 1;
    }

    return { start, end };
  };

  const moveIndex = (fromIndex: number, toIndex: number): void => {
    if (fromIndex === toIndex) {
      return;
    }
    const item = state.windows[fromIndex];
    state.windows.splice(fromIndex, 1);

    const safeIndex = Math.max(0, Math.min(toIndex, state.windows.length));
    state.windows.splice(safeIndex, 0, item);
  };

  const bringToFront = (id: AwWindowId): void => {
    const fromIndex = state.windows.findIndex((win) => win.id === id);
    if (fromIndex < 0) {
      return;
    }

    const target = state.windows[fromIndex];
    const range = getLayerRange(target.layer);

    // After removal, indices may shift if we're moving forward in the array.
    // We want the window to end up at the end of its layer section (top of that layer).
    const toIndex = fromIndex < range.end ? range.end - 1 : range.end;

    moveIndex(fromIndex, toIndex);

  };

  const sendToBack = (id: AwWindowId): void => {
    const fromIndex = state.windows.findIndex((win) => win.id === id);
    if (fromIndex < 0) {
      return;
    }

    const target = state.windows[fromIndex];
    const range = getLayerRange(target.layer);

    moveIndex(fromIndex, range.start);
  };

  const getWindowById = (id: AwWindowId): AwWindowModel | undefined =>
    state.windows.find((w) => w.id === id);


  const activateWindow = (id: AwWindowId): void => {
    const target = getWindowById(id);
    if (!target || target.isActive) {
      return;
    }

    const topmostModal = getTopmostModal();
    if (topmostModal && topmostModal.id !== id) {
      return;
    }

    setActiveWindow(id);
    bringToFront(id);
  };


  const getTopmostModal = (): AwWindowModel | null => {
    for (let i = state.windows.length - 1; i >= 0; i -= 1) {
      const win = state.windows[i];
      if (win.layer === 'modal') {
        return win;
      }
    }
    return null;
  };

  const hasModalOpen = (): boolean => {
    return getTopmostModal() !== null;
  };
  const openWindow = (input: AwCreateWindowInput): AwWindowId => {
    const id = genId();

    const rect: AwWindowRect = {
      x: input.rect?.x ?? AW_DEFAULT_RECT.x,
      y: input.rect?.y ?? AW_DEFAULT_RECT.y,
      w: input.rect?.w ?? AW_DEFAULT_RECT.w,
      h: input.rect?.h ?? AW_DEFAULT_RECT.h,
    };

    const layer: AwWindowLayer = input.layer ?? 'normal';

    const flags: AwWindowFlags = {
      ...AW_DEFAULT_FLAGS,
      ...(input.flags ?? {}),
    };

    if (layer === 'modal') {
      if (input.flags?.closeOnEsc === undefined) {
        flags.closeOnEsc = true;
      }
      if (input.flags?.closeOnBackdrop === undefined) {
        flags.closeOnBackdrop = false;
      }
    }

    const window: AwWindowModel = {
      id,
      title: input.title,
      component: markRaw(input.component),
      state: 'open',
      rect,
      isActive: true,
      flags,
      layer,
      meta: input.meta,
      props: input.props ?? {},
    };

    setActiveWindow(null);

    const range = getLayerRange(layer);
    state.windows.splice(range.end, 0, window);

    setActiveWindow(id);

    if (hooks.onWindowOpened) {
      hooks.onWindowOpened(window);
    }

    return id;
  };


  const closeWindow = async (id: AwWindowId): Promise<void> => {
    const win = getWindowById(id);
    if (!win || closingIds.has(id)) {
      return;
    }

    try {
      closingIds.add(id);

      let allowClose = true;
      if (hooks.onBeforeWindowClose) {
        allowClose = await hooks.onBeforeWindowClose(win);
      }
      if (!allowClose) {
        return;
      }

      const wasActive = win.isActive;
      const closedLayer = win.layer;

      const index = state.windows.findIndex((w) => w.id === id);
      if (index < 0) {
        return;
      }

      // Remove from stacking model
      state.windows.splice(index, 1);

      if (hooks.onWindowClosed) {
        hooks.onWindowClosed(win);
      }

      if (!wasActive) {
        return;
      }

      if (state.windows.length === 0) {
        setActiveWindow(null);
        return;
      }

      // Prefer topmost window in the same layer
      let nextActiveId: AwWindowId | null = null;

      for (let i = state.windows.length - 1; i >= 0; i -= 1) {
        const candidate = state.windows[i];
        if (candidate.layer === closedLayer) {
          nextActiveId = candidate.id;
          break;
        }
      }

      // Fallback: topmost overall
      if (!nextActiveId) {
        nextActiveId = state.windows[state.windows.length - 1].id;
      }

      setActiveWindow(nextActiveId);
    } finally {
      closingIds.delete(id);
    }

  };

  const moveWindow = (
    id: AwWindowId,
    next: { x: number; y: number },
    bounds: { w: number; h: number },
  ): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (!win.flags.movable) {
      return;
    }
    if (win.state !== 'open') {
      return;
    }

    if (bounds.w <= 0 || bounds.h <= 0) {
      win.rect.x = next.x;
      win.rect.y = next.y;
      return;
    }

    const titleBarKeepVisible = 28;
    const maxX = Math.max(0, bounds.w - titleBarKeepVisible);
    const maxY = Math.max(0, bounds.h - titleBarKeepVisible);

    win.rect.x = clamp(next.x, 0, maxX);
    win.rect.y = clamp(next.y, 0, maxY);
    if (hooks.onWindowMove) {
      hooks.onWindowMove(win);
    }
  };

  const resizeWindow = (
    id: AwWindowId,
    next: { w: number; h: number },
    bounds: { w: number; h: number },
  ): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (!win.flags.resizable) {
      return;
    }
    if (win.state !== 'open') {
      return;
    }

    const minW = 240;
    const minH = 140;

    if (bounds.w <= 0 || bounds.h <= 0) {
      win.rect.w = clamp(next.w, minW, Number.POSITIVE_INFINITY);
      win.rect.h = clamp(next.h, minH, Number.POSITIVE_INFINITY);
      return;
    }

    const maxW = Math.max(minW, bounds.w - win.rect.x);
    const maxH = Math.max(minH, bounds.h - win.rect.y);

    win.rect.w = clamp(next.w, minW, maxW);
    win.rect.h = clamp(next.h, minH, maxH);
    if (hooks.onWindowResize) {
      hooks.onWindowResize(win);
    }
  };

  const toggleMinimize = (id: AwWindowId): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (!win.flags.minimizable) {
      return;
    }

    if (win.state === 'minimized') {
      if (win.prevRect) {
        win.rect.w = win.prevRect.w;
        win.rect.h = win.prevRect.h;
        win.prevRect = undefined;
      }
      win.state = 'open';
      return;
    }

    if (win.state === 'open') {
      win.prevRect = { ...win.rect };
      win.state = 'minimized';
    }
  };

  const setWindowRect = (
    id: AwWindowId,
    rect: AwWindowRect,
    bounds: { w: number; h: number },
  ): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (win.state !== 'open' && win.state !== 'minimized') {
      return;
    }

    win.rect.x = rect.x;
    win.rect.y = rect.y;
    win.rect.w = rect.w;
    win.rect.h = rect.h;
  };

  const toggleMaximize = (id: AwWindowId, bounds: { w: number; h: number }): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (!win.flags.maximizable) {
      return;
    }

    if (win.state === 'maximized') {
      if (win.prevRect) {
        win.rect = { ...win.prevRect };
        win.prevRect = undefined;
      }
      win.state = 'open';
      return;
    }

    if (win.state === 'open') {
      win.prevRect = { ...win.rect };
      win.rect.x = 0;
      win.rect.y = 0;
      win.rect.w = bounds.w;
      win.rect.h = bounds.h;
      win.state = 'maximized';
    }
  };

  const getState = (): { windows: AwWindowModel[] } => {
    return {
      windows: state.windows.map((win) => ({
        ...win,
        rect: { ...win.rect },
        prevRect: win.prevRect ? { ...win.prevRect } : undefined,
      })),
    };
  };

  const getWindows = (): AwWindowModel[] => {
    return getState().windows;
  };
  const setActiveWindow = (id: AwWindowId | null) => {
    state.windows.forEach((win) => {
      win.isActive = id ? win.id === id : false;
    });
  };

  const getNextActiveAfterClose = (closed: AwWindowModel): AwWindowModel | null => {
    // Prefer topmost window in the same layer
    for (let idx = state.windows.length - 1; idx >= 0; idx -= 1) {
      const candidate = state.windows[idx];
      if (candidate.layer === closed.layer) {
        return candidate;
      }
    }

    // Otherwise, topmost overall
    if (state.windows.length > 0) {
      return state.windows[state.windows.length - 1];
    }

    return null;
  };

  return {
    openWindow,
    closeWindow,
    activateWindow,
    moveWindow,
    resizeWindow,
    toggleMinimize,
    toggleMaximize,
    getWindowById,
    setWindowRect,
    getState,
    setActiveWindow,
    getWindows
  };
};
