// src/windowing/core/windowManager.ts
import { markRaw, reactive } from 'vue';
import type {
  AwCreateWindowInput,
  AwWindowFlags,
  AwWindowId,
  AwWindowLayer,
  AwWindowManager,
  AwWindowManagerHooks,
  AwWindowModel,
  AwWindowRect,
  AwWindowState
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

type State = {
  bands: Bands;
};

export const awCreateWindowManager = (hooks: AwWindowManagerHooks): AwWindowManager => {
  const state: State = reactive({
    bands: {
      normal: [],
      utility: [],
      overlay: [],
      modal: [],
      system: []
    }
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

  const findWindowLocationById = (
    id: AwWindowId
  ): { bandKey: BandKey; index: number; win: AwWindowModel } | null => {
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

  const getTopmostInLayer = (layer: AwWindowLayer): AwWindowModel | null => {
    const bandKey = getBandKey(layer);
    const band = state.bands[bandKey];
    if (band.length === 0) {
      return null;
    }
    return band[band.length - 1];
  };

  const getTopmostModal = (): AwWindowModel | null => {
    return getTopmostInLayer('modal');
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

  const isBlockingSystemWindow = (win: AwWindowModel): boolean => {
    return win.layer === 'system' && win.flags.isBlockingWindow === true;
  };

  const getTopmostBlockingSystem = (): AwWindowModel | null => {
    const band = state.bands.system;
    if (band.length === 0) {
      return null;
    }

    for (let i = band.length - 1; i >= 0; i -= 1) {
      const win = band[i];
      if (isBlockingSystemWindow(win)) {
        return win;
      }
    }

    return null;
  };

  const activateWindow = (id: AwWindowId): void => {
    const target = getWindowById(id);
    if (!target) {
      return;
    }

    if (target.layer !== 'system') {
      const topmostBlockingSystem = getTopmostBlockingSystem();
      if (topmostBlockingSystem && topmostBlockingSystem.id !== id) {
        return;
      }
    }

    const topmostModal = getTopmostModal();
    if (topmostModal && topmostModal.id !== id && target.layer !== 'system') {
      return;
    }

    const topmostInLayer = getTopmostInLayer(target.layer);
    if (topmostInLayer && topmostInLayer.id === id) {
      return;
    }

    if (hooks.onBeforeWindowActivate) {
      hooks.onBeforeWindowActivate(target);
    }

    bringToFrontWithinBand(id);

    if (hooks.onWindowActivated) {
      hooks.onWindowActivated(target);
    }
  };

  const isBoolean = (value: unknown): boolean => {
    return typeof value === 'boolean';
  };
  const normalizeFlags = (
    layer: AwWindowLayer,
    inputFlags: Partial<AwWindowFlags>
  ): AwWindowFlags => {
    const defaultBlocking = layer === 'modal' || layer === 'system';

    const flags: AwWindowFlags = {
      movable: inputFlags.movable ?? true,
      resizable: inputFlags.resizable ?? true,
      closable: inputFlags.closable ?? true,
      minimizable: inputFlags.minimizable ?? true,
      maximizable: inputFlags.maximizable ?? true,
      closeOnEsc: inputFlags.closeOnEsc,
      closeOnBackdrop: inputFlags.closeOnBackdrop,
      isBlockingWindow: inputFlags.isBlockingWindow ?? defaultBlocking
    };

    //    console.log('flags are:',flags);
    return flags;
  };

  const openWindow = (input: AwCreateWindowInput): AwWindowId => {
    const id = genId();
    const initialState: AwWindowState = input.state ?? 'open';

    const rect: AwWindowRect = {
      x: input.rect?.x ?? AW_DEFAULT_RECT.x,
      y: input.rect?.y ?? AW_DEFAULT_RECT.y,
      w: input.rect?.w ?? AW_DEFAULT_RECT.w,
      h: input.rect?.h ?? AW_DEFAULT_RECT.h
    };

    const layer: AwWindowLayer = input.layer ?? 'normal';

    const normalizedFlags = normalizeFlags(layer, input.flags ?? {});

    const mergedFlags: AwWindowFlags = {
      ...AW_DEFAULT_FLAGS,
      ...normalizedFlags
    };

    const win: AwWindowModel = {
      id,
      title: input.title,
      component: markRaw(input.component),
      state: initialState,
      rect,
      prevRect: undefined,
      layer,
      flags: mergedFlags,
      props: input.props ?? {},
      meta: input.meta
    };

    const band = getBand(layer);
    band.push(win);

    if (hooks.onWindowOpened) {
      hooks.onWindowOpened(win);
    }

    return id;
  };

  const removeWindowById = (id: AwWindowId): boolean => {
    const loc = findWindowLocationById(id);
    if (!loc) {
      return false;
    }

    const band = state.bands[loc.bandKey];
    const removed = band.splice(loc.index, 1);
    return removed.length === 1;
  };

  const getTopmostOverall = (): AwWindowModel | null => {
    const all = getAllWindows();
    if (all.length === 0) {
      return null;
    }
    return all[all.length - 1];
  };

  const closeWindowAsync = async (id: AwWindowId): Promise<void> => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    if (closingIds.has(id)) {
      return;
    }

    const snapshot: AwWindowModel = {
      ...win,
      rect: { ...win.rect },
      prevRect: win.prevRect ? { ...win.prevRect } : undefined,
      flags: { ...win.flags },
      props: win.props ? { ...win.props } : undefined,
      meta:
        typeof win.meta === 'object' && win.meta !== null
          ? { ...(win.meta as Record<string, unknown>) }
          : win.meta
    };

    try {
      closingIds.add(id);

      let allowClose = true;
      if (hooks.onBeforeWindowClose) {
        allowClose = await hooks.onBeforeWindowClose(snapshot);
      }
      if (!allowClose) {
        return;
      }

      const removed = removeWindowById(id);
      if (!removed) {
        return;
      }

      if (hooks.onWindowClosed) {
        hooks.onWindowClosed(snapshot);
      }
    } finally {
      closingIds.delete(id);
    }
  };

  const closeWindow = (id: AwWindowId): void => {
    void closeWindowAsync(id);
  };

  const moveWindow = (id: AwWindowId, rect: AwWindowRect): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    setWindowRect(id, rect);
    if (hooks.onWindowMove) {
      hooks.onWindowMove(win);
    }
  };

  const resizeWindow = (id: AwWindowId, rect: AwWindowRect): void => {
    const win = getWindowById(id);
    if (!win) {
      return;
    }
    setWindowRect(id, rect);
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

  const setWindowRect = (id: AwWindowId, rect: AwWindowRect): void => {
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

  const getLayerStartIndex = (layer: AwWindowLayer): number => {
    const { normal, utility, overlay, modal, system } = state.bands;
    switch (layer) {
      case 'normal': {
        return 0;
      }
      case 'utility': {
        return normal.length;
      }
      case 'overlay': {
        return normal.length + utility.length;
      }
      case 'modal': {
        return normal.length + utility.length + overlay.length;
      }
      case 'system': {
        return normal.length + utility.length + overlay.length + modal.length;
      }
    }
  };

  const getWindowsForLayer = (layer: AwWindowLayer): readonly AwWindowModel[] => {
    const { normal, utility, overlay, modal, system } = state.bands;
    switch (layer) {
      case 'normal': {
        return normal;
      }
      case 'utility': {
        return utility;
      }
      case 'overlay': {
        return overlay;
      }
      case 'modal': {
        return modal;
      }
      case 'system': {
        return system;
      }
    }
  };

  const hasModalWindows = (): boolean => {
    return state.bands.modal.length > 0;
  };
  let lastFocusedId: AwWindowId | null = null;
  const focusWindow = (id: AwWindowId | null): void => {
    if (id === lastFocusedId) {
      return;
    }

    lastFocusedId = id;

    if (!id) {
      return;
    }

    const win = getWindowById(id);
    if (!win) {
      return;
    }

    if (hooks.onWindowActivated) {
      hooks.onWindowActivated(win);
    }
  };

  return {
    openWindow,
    closeWindow,
    closeWindowAsync,
    activateWindow,
    moveWindow,
    resizeWindow,
    toggleMinimize,
    toggleMaximize,
    getWindowById,
    getState,
    getWindows,
    getWindowsForRender,
    getWindowsForLayer,
    getLayerStartIndex,
    getTopmostOverall,
    getTopmostInLayer,
    hasModalWindows,
    focusWindow
  };
};
