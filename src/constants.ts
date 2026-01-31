import type { AwOptions, AwWindowRect } from './types';

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
  minHeight: 240,
  titleBarHeight: 24
};

export const AW_DEFAULT_FLAGS = {
  movable: true,
  resizable: true,
  closable: true,
  minimizable: true,
  maximizable: true
};

export const DEFAULT_RECT: AwWindowRect = {
  x: 40,
  y: 40,
  w: 480,
  h: 320
};
