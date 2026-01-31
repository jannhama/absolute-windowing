// src/windowing/core/windowManager.ts
import { reactive, computed, markRaw } from 'vue';
import type {
  AwCreateWindowInput,
  AwWindowId,
  AwWindowManager,
  AwWindowManagerHooks,
  AwWindowModel,
  AwWindowRect,
} from '../types';
import { AW_DEFAULT_FLAGS, DEFAULT_RECT } from '../constants';

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const genId = (): string => `w_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

export const awCreateWindowManager = (hooks: AwWindowManagerHooks): AwWindowManager => {
  const state = reactive({
    windows: [] as AwWindowModel[],
    zCounter: 1,
  });

  const closingIds = new Set<AwWindowId>();

  const windows = computed(() =>
    state.windows
      .filter((w) => w.state !== 'closed')
      .slice()
      .sort((a, b) => a.z - b.z),
  );

  const getWindowById = (id: AwWindowId): AwWindowModel | undefined =>
    state.windows.find((w) => w.id === id);

  const activateWindow = (id: AwWindowId): void => {
    const target = getWindowById(id);
    if (!target || target.isActive) {
      return;
    }

    state.windows.forEach((win) => {
      win.isActive = win.id === id;
    });

    target.z = state.zCounter;
    state.zCounter += 1;
  };

  const openWindow = (input: AwCreateWindowInput): AwWindowId => {
    const id = genId();

    const rect: AwWindowRect = {
      x: input.rect?.x ?? DEFAULT_RECT.x,
      y: input.rect?.y ?? DEFAULT_RECT.y,
      w: input.rect?.w ?? DEFAULT_RECT.w,
      h: input.rect?.h ?? DEFAULT_RECT.h,
    };

    const flags = {
      ...AW_DEFAULT_FLAGS,
      ...(input.flags ?? {}),
    };

    const window: AwWindowModel = {
      id,
      title: input.title,
      component: markRaw(input.component),
      state: 'open',
      rect,
      z: state.zCounter,
      isActive: true,
      flags,
      meta: input.meta,
    };

    state.zCounter += 1;

    state.windows.forEach((win) => {
      win.isActive = false;
    });
    state.windows.push(window);
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
      let allowClose = true;
      closingIds.add(id);
      if (hooks.onBeforeWindowClose) {
        allowClose = await hooks.onBeforeWindowClose(win);
      }
      if (allowClose) {
        state.windows = state.windows.filter((w) => w.id !== id);
      }

      if (allowClose && win.isActive && state.windows.length > 0) {
        const highestZ = Math.max(...state.windows.map((w) => w.z));
        let isActivated = false;
        state.windows.forEach((window) => {
          if (window.z === highestZ && !isActivated) {
            window.isActive = true;
            isActivated = true;
          } else {
            window.isActive = false;
          }
        });
      }
      if (hooks.onWindowClosed && allowClose) {
        hooks.onWindowClosed(win);
      }
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

  const getState = () => ({ windows: state.windows, zCounter: state.zCounter });

  const setActiveWindow = (id: AwWindowId | null) => {
    state.windows.forEach((win) => {
      win.isActive = id ? win.id === id : false;
    });
  };

  return {
    get windows() {
      return windows.value;
    },
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
  };
};
