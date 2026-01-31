// src/windowing/core/windowManager.ts
import { reactive, markRaw } from 'vue';
import type {
  AwCreateWindowInput,
  AwWindowFlags,
  AwWindowId,
  AwWindowLayer,
  AwWindowManager,
  AwWindowManagerHooks,
  AwWindowModel,
  AwWindowRect
} from '../types';
import { AW_DEFAULT_FLAGS, AW_DEFAULT_RECT } from '../constants';
import { clamp, genId } from '../internal/utils';

type Bands = {
  normal: AwWindowModel[];
  utility: AwWindowModel[];
  overlay: AwWindowModel[];
  modal: AwWindowModel[];
  system: AwWindowModel[];
};

type BandKey = keyof Bands;

const BAND_ORDER: BandKey[] = ['normal', 'utility', 'overlay', 'modal', 'system'];

const getBandKey = (layer: AwWindowLayer): BandKey => {
  if (layer === 'normal') {
    return 'normal';
  }
  if (layer === 'utility') {
    return 'utility';
  }
  if (layer === 'overlay') {
    return 'overlay';
  }
  if (layer === 'modal') {
    return 'modal';
  }
  return 'system';
};

export const awCreateWindowManager = (hooks: AwWindowManagerHooks): AwWindowManager => {
  const state = reactive({
    bands: {
      normal: [] as AwWindowModel[],
      utility: [] as AwWindowModel[],
      overlay: [] as AwWindowModel[],
      modal: [] as AwWindowModel[],
      system: [] as AwWindowModel[]
    } as Bands
  });

  const closingIds = new Set<AwWindowId>();

  const getAllWindows = (): AwWindowModel[] => {
    return BAND_ORDER.flatMap((key) => state.bands[key]);
  };

    const getWindowsForRender = (): readonly AwWindowModel[] => {
    return getAllWindows();
  };


  const getBand = (layer: AwWindowLayer): AwWindowModel[] => {
    return state.bands[getBandKey(layer)];
  };

  const findWindowLocationById = (id: AwWindowId): { bandKey: BandKey; index: number; win: AwWindowModel } | null => {
    for (const bandKey of BAND_ORDER) {
      const band = state.bands[bandKey];
      const index = band.findIndex((w) => w.id === id);
      if (index >= 0) {
        return { bandKey, index, win: band[index] };
      }
    }
    return null;
  };

  const getWindowById = (id: AwWindowId): AwWindowModel | undefined => {
    const loc = findWindowLocationById(id);
    if (!loc) {
      return undefined;
    }
    return loc.win;
  };

  const setActiveWindow = (id: AwWindowId | null): void => {
    const all = getAllWindows();
    all.forEach((win) => {
      win.isActive = id ? win.id === id : false;
    });
  };

  const getTopmostInBand = (bandKey: BandKey): AwWindowModel | null => {
    const band = state.bands[bandKey];
    for (let i = band.length - 1; i >= 0; i -= 1) {
      const win = band[i];
      if (win.state !== 'closed') {
        return win;
      }
    }
    return null;
  };

  const getTopmostModal = (): AwWindowModel | null => {
    return getTopmostInBand('modal');
  };

  const bringToFrontWithinBand = (id: AwWindowId): void => {
    const loc = findWindowLocationById(id);
    if (!loc) {
      return;
    }

    const band = state.bands[loc.bandKey];
    if (loc.index < 0 || loc.index >= band.length) {
      return;
    }

    const item = band[loc.index];
    band.splice(loc.index, 1);
    band.push(item);
  };

  const activateWindow = (id: AwWindowId): void => {
    const target = getWindowById(id);
    if (!target) {
      return;
    }
    if (target.isActive) {
      return;
    }

    const topmostModal = getTopmostModal();
    if (topmostModal && topmostModal.id !== id) {
      return;
    }

    setActiveWindow(id);
    bringToFrontWithinBand(id);

    if (hooks.onWindowActivated) {
      hooks.onWindowActivated(target);
    }
  };

  const openWindow = (input: AwCreateWindowInput): AwWindowId => {
    const id = genId();

    const rect: AwWindowRect = {
      x: input.rect?.x ?? AW_DEFAULT_RECT.x,
      y: input.rect?.y ?? AW_DEFAULT_RECT.y,
      w: input.rect?.w ?? AW_DEFAULT_RECT.w,
      h: input.rect?.h ?? AW_DEFAULT_RECT.h
    };

    const layer: AwWindowLayer = input.layer ?? 'normal';

    const flags: AwWindowFlags = {
      ...AW_DEFAULT_FLAGS,
      ...(input.flags ?? {})
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
      props: input.props ?? {}
    };

    setActiveWindow(null);

    const band = getBand(layer);
    band.push(window);

    setActiveWindow(id);

    if (hooks.onWindowOpened) {
      hooks.onWindowOpened(window);
    }

    return id;
  };

  const removeWindowById = (id: AwWindowId): AwWindowModel | null => {
    const loc = findWindowLocationById(id);
    if (!loc) {
      return null;
    }

    const band = state.bands[loc.bandKey];
    const removed = band.splice(loc.index, 1);
    if (removed.length !== 1) {
      return null;
    }
    return removed[0];
  };

  const getTopmostOverall = (): AwWindowModel | null => {
    const all = getAllWindows();
    if (all.length === 0) {
      return null;
    }
    return all[all.length - 1];
  };

  const getTopmostInLayer = (layer: AwWindowLayer): AwWindowModel | null => {
    return getTopmostInBand(getBandKey(layer));
  };

  const closeWindowAsync = async (id: AwWindowId): Promise<void> => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (closingIds.has(id)) {
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

      const removed = removeWindowById(id);
      if (!removed) {
        return;
      }

      if (hooks.onWindowClosed) {
        hooks.onWindowClosed(removed);
      }

      if (!wasActive) {
        return;
      }

      const topmostModal = getTopmostModal();
      if (topmostModal) {
        setActiveWindow(topmostModal.id);
        return;
      }

      const sameLayerTop = getTopmostInLayer(closedLayer);
      if (sameLayerTop) {
        setActiveWindow(sameLayerTop.id);
        return;
      }

      const top = getTopmostOverall();
      if (!top) {
        setActiveWindow(null);
        return;
      }

      setActiveWindow(top.id);
    } finally {
      closingIds.delete(id);
    }
  };

  const closeWindow = (id: AwWindowId): void => {
    void closeWindowAsync(id);
  };

  const moveWindow = (
    id: AwWindowId,
    next: { x: number; y: number },
    bounds: { w: number; h: number }
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
    bounds: { w: number; h: number }
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
    bounds: { w: number; h: number }
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
    const all = getAllWindows();
    return {
      windows: all.map((win) => ({
        ...win,
        rect: { ...win.rect },
        prevRect: win.prevRect ? { ...win.prevRect } : undefined
      }))
    };
  };

  const getWindows = (): AwWindowModel[] => {
    return getState().windows;
  };

  const getLayerStartIndex =(layer: AwWindowLayer) => {
    const {normal,utility,overlay,modal,system} = state.bands;
    switch(layer) {
      case 'normal': {
        return 0;
      }
      case 'utility': {
        return normal.length;
      }
      case 'overlay': {
        return normal.length+utility.length;
      }
      case 'modal': {
        return normal.length+utility.length+overlay.length;
      }
      case 'system': {
        return normal.length+utility.length+overlay.length+modal.length;
      }
      
    }
     // Exhaustiveness check – should never happen
  const _exhaustive: never = layer;
  return _exhaustive;
  }

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
    getWindows,
    getWindowsForRender,
    getLayerStartIndex
  };
};
