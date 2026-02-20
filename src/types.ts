// src/types.ts
export type AwVueComponent = object;
export type AwWindowId = string;
export type AwWindowState = 'open' | 'minimized' | 'maximized';

export interface AwWindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AwWindowFlags {
  movable: boolean;
  resizable: boolean;
  closable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  isBlockingWindow?: boolean;
}

export type AwWindowLayer = 'normal' | 'utility' | 'overlay' | 'modal' | 'system';

export interface AwWindowModel {
  id: AwWindowId;
  title: string;
  component: AwVueComponent;
  state: AwWindowState;
  rect: AwWindowRect;
  prevRect?: AwWindowRect;
  flags: AwWindowFlags;
  layer: AwWindowLayer;
  props?: Record<string, unknown>;
  meta?: unknown;
  onKeyDown?: AwWindowKeyHandler;
  onKeyUp?: AwWindowKeyHandler;
}

export interface AwCreateWindowInput {
  title: string;
  component: AwVueComponent;
  state?: AwWindowState;
  rect?: Partial<AwWindowRect>;
  flags?: Partial<AwWindowFlags>;
  layer?: AwWindowLayer;
  props?: Record<string, unknown>;
  meta?: unknown;
}

export interface AwWindowManager {
  openWindow: (input: AwCreateWindowInput) => AwWindowId;
  closeWindow: (id: AwWindowId) => void;
  closeWindowAsync: (id: AwWindowId) => Promise<void>;
  activateWindow: (id: AwWindowId) => void;
  moveWindow: (id: AwWindowId, rect: AwWindowRect) => void;
  resizeWindow: (id: AwWindowId, rect: AwWindowRect) => void;
  toggleMinimize: (id: AwWindowId) => void;
  toggleMaximize: (id: AwWindowId, bounds: { w: number; h: number }) => void;
  getWindowById: (id: AwWindowId) => AwWindowModel | undefined;
  getState: () => { windows: AwWindowModel[] };
  getWindows: () => AwWindowModel[];
  getWindowsForRender: () => readonly AwWindowModel[];
  getLayerStartIndex: (layer: AwWindowLayer) => number;
  getWindowsForLayer: (layer: AwWindowLayer) => readonly AwWindowModel[];
  getTopmostInLayer: (layer: AwWindowLayer) => AwWindowModel | null;
  getTopmostOverall: () => AwWindowModel | null;
  hasModalWindows: () => boolean;
  focusWindow(id: AwWindowId | null): void;

}

export interface AwWindowManagerHooks {
  onWindowOpened?: (window: AwWindowModel) => void;
  onBeforeWindowClose?: (window: AwWindowModel) => boolean | Promise<boolean>;
  onWindowClosed?: (window: AwWindowModel) => void;
  onWindowActivated?: (window: AwWindowModel) => void;
  onBeforeWindowActivate?: (window: AwWindowModel) => void;
  onWindowMove?: (window: AwWindowModel) => void;
  onWindowResize?: (window: AwWindowModel) => void;
}

export interface AwOptions {
  density: 'comfortable' | 'compact';
  theme: 'light' | 'dark';
  gridSize: number;
  showGuides: boolean;
  showTitleBar: boolean;
  showWindowControls: boolean;
  windowSnapOffset: number;
  edgeSnapOffset: number;
  snapToGrid: boolean;
  snapToEdges: boolean;
  snapToWindows: boolean;
  locked: boolean;
  minWidth: number;
  minHeight: number;
  showStatusArea: boolean;

}

export type AwWindowKeyHandler = (event: KeyboardEvent) => boolean;
