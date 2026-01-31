import { AwWindowId, AwWindowRect } from '../types';

export type AwPoint = { x: number, y: number };
export type AwRect = { left: number, top: number, right: number, bottom: number };
export type AwResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type AwDragMode = 'move' | 'resize';

export interface AwBounds {
  w: number
  h: number
}

export interface AwResizeOptions {
  start: AwWindowRect
  dx: number
  dy: number
  direction: AwResizeDirection
  bounds: AwBounds
  minWidth: number
  minHeight: number
  gridSize: number
  enableGridSnap: boolean
}

export interface AwSnapGuides {
  x?: number
  y?: number
}

export interface AwSnap1DResult {
  delta: number
  guide: number
}
export interface AwDragSession {
  mode: AwDragMode
  id: AwWindowId
  pointerId: number
  dir?: AwResizeDirection
  startClientX: number
  startClientY: number
  startRect: AwWindowRect
}

export interface AwMoveRectOptions {
  start: AwWindowRect
  dx: number
  dy: number
  bounds: AwBounds
  edgeSnapPx: number
  effectiveSize?: { w: number, h: number }
  gridSize?: number
  enableEdgeSnap?: boolean
  enableGridSnap?: boolean
}
