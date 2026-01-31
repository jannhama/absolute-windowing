// src/types.ts
export type AwVueComponent = object;
export type AwWindowId = string;
export type AwWindowState = 'open' | 'minimized' | 'maximized' | 'closed';

export interface AwWindowRect {
  x: number
  y: number
  w: number
  h: number
}

export interface AwWindowFlags {
  movable: boolean
  resizable: boolean
  closable: boolean
  minimizable: boolean
  maximizable: boolean
}

export interface AwWindowModel {
  id: AwWindowId
  title: string
  component: AwVueComponent
  state: AwWindowState
  rect: AwWindowRect
  prevRect?: AwWindowRect
  z: number
  isActive: boolean
  flags: AwWindowFlags
  meta?: unknown
}

export interface AwCreateWindowInput {
  title: string
  component: AwVueComponent
  rect?: Partial<AwWindowRect>
  flags?: Partial<AwWindowFlags>
  meta?: unknown
}

export interface AwWindowManager {
  windows: AwWindowModel[]
  openWindow: (input: AwCreateWindowInput) => AwWindowId
  closeWindow: (id: AwWindowId) => void
  activateWindow: (id: AwWindowId) => void
  moveWindow: (
    id: AwWindowId,
    next: { x: number, y: number },
    bounds: { w: number, h: number }
  ) => void
  resizeWindow: (
    id: AwWindowId,
    next: { w: number, h: number },
    bounds: { w: number, h: number }
  ) => void
  toggleMinimize: (id: AwWindowId) => void
  toggleMaximize: (id: AwWindowId, bounds: { w: number, h: number }) => void
  getWindowById: (id: AwWindowId) => AwWindowModel | undefined
  setWindowRect: (id: AwWindowId, rect: AwWindowRect, bounds: { w: number, h: number }) => void
  getState: () => { windows: AwWindowModel[], zCounter: number }
  setActiveWindow: (id: AwWindowId | null) => void
}

export interface AwWindowManagerHooks {
  onWindowOpened?: (window: AwWindowModel) => void
  onBeforeWindowClose?: (window: AwWindowModel) => boolean | Promise<boolean>
  onWindowClosed?: (window: AwWindowModel) => void
  onWindowActivated?: (window: AwWindowModel) => void
  onWindowMove?: (window: AwWindowModel) => void
  onWindowResize?: (window: AwWindowModel) => void
}

export interface AwOptions {
  density: 'comfortable' | 'compact'
  theme: 'light' | 'dark'
  gridSize: number
  showGuides: boolean
  showTitleBar: boolean
  showWindowControls: boolean
  windowSnapOffset: number
  edgeSnapOffset: number
  snapToGrid: boolean
  snapToEdges: boolean
  snapToWindows: boolean
  locked: boolean
  minWidth: number
  minHeight: number
  titleBarHeight: number
}
