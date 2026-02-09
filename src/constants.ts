import type { AwOptions, AwWindowFlags, AwWindowRect } from './types';

export const AW_TITLEBAR_HEIGHT = 28;
export const AW_EDGE_SNAP_PX = 8;
export const AW_WINDOW_SNAP_PX = 8;
export const AW_GRID_SIZE_PX = 16;

export const AW_DEFAULT_OPTIONS: AwOptions = {
  density: 'comfortable',
  theme: 'dark',
  gridSize: AW_GRID_SIZE_PX,
  showGuides: false,
  showTitleBar: true,
  showWindowControls: true,
  windowSnapOffset: AW_WINDOW_SNAP_PX,
  edgeSnapOffset: AW_EDGE_SNAP_PX,
  snapToGrid: false,
  snapToEdges: true,
  snapToWindows: false,
  locked: false,
  minWidth: 320,
  minHeight: 240
};

export const AW_DEFAULT_FLAGS: AwWindowFlags = {
  resizable: true,
  movable: true,
  closable: true,
  minimizable: true,
  maximizable: true,
  closeOnEsc: false,
  closeOnBackdrop: false,
  isBlockingWindow: false
};

export const AW_DEFAULT_RECT: AwWindowRect = {
  x: 40,
  y: 40,
  w: 480,
  h: 320
};
