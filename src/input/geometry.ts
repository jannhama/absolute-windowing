// src/windowing/input/geometry.ts
import type {
  AwBounds,
  AwMoveRectOptions,
  AwResizeDirection,
  AwResizeOptions,
  AwSnap1DResult,
  AwSnapGuides,
} from '../internal/types';

import {  AwWindowRect} from '../types';
export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const moveRectWithinBounds = (awMoveRectOptions: AwMoveRectOptions): AwWindowRect => {
  const nextXRaw = awMoveRectOptions.start.x + awMoveRectOptions.dx;
  const nextYRaw = awMoveRectOptions.start.y + awMoveRectOptions.dy;

  if (awMoveRectOptions.bounds.w <= 0 || awMoveRectOptions.bounds.h <= 0) {
    return { ...awMoveRectOptions.start, x: nextXRaw, y: nextYRaw };
  }

  const effW = awMoveRectOptions.effectiveSize?.w ?? awMoveRectOptions.start.w;
  const effH = awMoveRectOptions.effectiveSize?.h ?? awMoveRectOptions.start.h;

  const maxX = Math.max(0, awMoveRectOptions.bounds.w - effW);
  const maxY = Math.max(0, awMoveRectOptions.bounds.h - effH);

  let x = clamp(nextXRaw, 0, maxX);
  let y = clamp(nextYRaw, 0, maxY);

  const doEdgeSnap = awMoveRectOptions.enableEdgeSnap !== false;
  if (doEdgeSnap) {
    if (Math.abs(x - 0) <= awMoveRectOptions.edgeSnapPx) {
      x = 0;
    }
    if (Math.abs(x - maxX) <= awMoveRectOptions.edgeSnapPx) {
      x = maxX;
    }
    if (Math.abs(y - 0) <= awMoveRectOptions.edgeSnapPx) {
      y = 0;
    }
    if (Math.abs(y - maxY) <= awMoveRectOptions.edgeSnapPx) {
      y = maxY;
    }
  }

  const doGridSnap
    = awMoveRectOptions.enableGridSnap === true && (awMoveRectOptions.gridSize ?? 0) > 1;
  if (doGridSnap) {
    x = snapToGrid(x, awMoveRectOptions.gridSize as number);
    y = snapToGrid(y, awMoveRectOptions.gridSize as number);

    // Snap can push us out of bounds; clamp again
    x = clamp(x, 0, maxX);
    y = clamp(y, 0, maxY);
  }

  // keep original w/h
  return { ...awMoveRectOptions.start, x, y };
};

export const snapToGrid = (value: number, gridSize: number): number => {
  if (gridSize <= 1) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
};

const applyMinSizeForWest = (x: number, w: number, minW: number): { x: number, w: number } => {
  if (w >= minW) {
    return { x, w };
  }
  const delta = minW - w;
  return { x: x - delta, w: minW };
};

const applyMinSizeForNorth = (y: number, h: number, minH: number): { y: number, h: number } => {
  if (h >= minH) {
    return { y, h };
  }
  const delta = minH - h;
  return { y: y - delta, h: minH };
};

export const resizeRectWithinBounds = (input: AwResizeOptions): AwWindowRect => {
  const resizeOptions = { ...input };

  let x = resizeOptions.start.x;
  let y = resizeOptions.start.y;
  let w = resizeOptions.start.w;
  let h = resizeOptions.start.h;

  // Apply raw resize based on direction
  if (resizeOptions.direction.includes('e')) {
    w = resizeOptions.start.w + resizeOptions.dx;
  }
  if (resizeOptions.direction.includes('s')) {
    h = resizeOptions.start.h + resizeOptions.dy;
  }
  if (resizeOptions.direction.includes('w')) {
    x = resizeOptions.start.x + resizeOptions.dx;
    w = resizeOptions.start.w - resizeOptions.dx;
  }
  if (resizeOptions.direction.includes('n')) {
    y = resizeOptions.start.y + resizeOptions.dy;
    h = resizeOptions.start.h - resizeOptions.dy;
  }

  // Enforce min sizes (adjust x/y when resizing from W/N)
  if (resizeOptions.direction.includes('w')) {
    if (w < resizeOptions.minWidth) {
      x -= resizeOptions.minWidth - w;
      w = resizeOptions.minWidth;
    }
  } else {
    w = Math.max(w, resizeOptions.minWidth);
  }

  if (resizeOptions.direction.includes('n')) {
    if (h < resizeOptions.minHeight) {
      y -= resizeOptions.minHeight - h;
      h = resizeOptions.minHeight;
    }
  } else {
    h = Math.max(h, resizeOptions.minHeight);
  }

  // Optional GRID SNAP: snap ONLY the moved edges
  const doGridSnap = resizeOptions.enableGridSnap && (resizeOptions.gridSize ?? 0) > 1;
  if (doGridSnap) {
    const gs = resizeOptions.gridSize as number;

    const right = x + w;
    const bottom = y + h;

    if (resizeOptions.direction.includes('e')) {
      const snappedRight = snapToGrid(right, gs);
      w = snappedRight - x;
    }

    if (resizeOptions.direction.includes('w')) {
      const snappedLeft = snapToGrid(x, gs);
      const fixedRight = right; // right edge stays where it was after raw resize
      x = snappedLeft;
      w = fixedRight - x;
    }

    if (resizeOptions.direction.includes('s')) {
      const snappedBottom = snapToGrid(bottom, gs);
      h = snappedBottom - y;
    }

    if (resizeOptions.direction.includes('n')) {
      const snappedTop = snapToGrid(y, gs);
      const fixedBottom = bottom; // bottom edge stays where it was after raw resize
      y = snappedTop;
      h = fixedBottom - y;
    }

    // Re-enforce min sizes after snapping (again adjust x/y for W/N)
    if (resizeOptions.direction.includes('w')) {
      if (w < resizeOptions.minWidth) {
        x -= resizeOptions.minWidth - w;
        w = resizeOptions.minWidth;
      }
    } else {
      w = Math.max(w, resizeOptions.minWidth);
    }

    if (resizeOptions.direction.includes('n')) {
      if (h < resizeOptions.minHeight) {
        y -= resizeOptions.minHeight - h;
        h = resizeOptions.minHeight;
      }
    } else {
      h = Math.max(h, resizeOptions.minHeight);
    }
  }

  // Clamp to bounds
  if (resizeOptions.bounds.w > 0 && resizeOptions.bounds.h > 0) {
    // Left/top clamp
    if (x < 0) {
      if (resizeOptions.direction.includes('w')) {
        w += x;
        x = 0;
        w = Math.max(w, resizeOptions.minWidth);
      } else {
        x = 0;
      }
    }

    if (y < 0) {
      if (resizeOptions.direction.includes('n')) {
        h += y;
        y = 0;
        h = Math.max(h, resizeOptions.minHeight);
      } else {
        y = 0;
      }
    }

    // Right/bottom clamp
    const maxW = Math.max(resizeOptions.minWidth, resizeOptions.bounds.w - x);
    const maxH = Math.max(resizeOptions.minHeight, resizeOptions.bounds.h - y);

    if (w > maxW) {
      if (resizeOptions.direction.includes('w')) {
        const overflow = w - maxW;
        x += overflow;
        x = Math.max(0, x);
      }
      w = maxW;
    }

    if (h > maxH) {
      if (resizeOptions.direction.includes('n')) {
        const overflow = h - maxH;
        y += overflow;
        y = Math.max(0, y);
      }
      h = maxH;
    }
  }

  return { x, y, w, h };
};

export const clampRectPosition = (
  rect: AwWindowRect,
  bounds: AwBounds,
  effectiveSize?: { w: number, h: number }
): AwWindowRect => {
  if (bounds.w <= 0 || bounds.h <= 0) {
    return rect;
  }

  const effW = effectiveSize?.w ?? rect.w;
  const effH = effectiveSize?.h ?? rect.h;

  const maxX = Math.max(0, bounds.w - effW);
  const maxY = Math.max(0, bounds.h - effH);

  return {
    ...rect,
    x: clamp(rect.x, 0, maxX),
    y: clamp(rect.y, 0, maxY)
  };
};

const findBestSnap1D = (
  movingA: number,
  movingB: number,
  targetA: number,
  targetB: number,
  snapPx: number
): number | null => {
  // Returns delta to apply to moving coordinates (x or y), or null if no snap within threshold.
  // We try to align movingA or movingB to targetA or targetB.
  const candidates = [
    targetA - movingA,
    targetB - movingA,
    targetA - movingB,
    targetB - movingB
  ];

  let best: number | null = null;
  let bestAbs = Number.POSITIVE_INFINITY;

  for (const delta of candidates) {
    const abs = Math.abs(delta);
    if (abs <= snapPx && abs < bestAbs) {
      bestAbs = abs;
      best = delta;
    }
  }

  return best;
};

export const snapRectToOtherRects = (
  rect: AwWindowRect,
  targets: AwWindowRect[],
  snapPx: number
): AwWindowRect => {
  if (targets.length === 0) {
    return rect;
  }

  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;

  let bestDx: number | null = null;
  let bestDxAbs = Number.POSITIVE_INFINITY;

  let bestDy: number | null = null;
  let bestDyAbs = Number.POSITIVE_INFINITY;

  for (const t of targets) {
    const tLeft = t.x;
    const tRight = t.x + t.w;
    const tTop = t.y;
    const tBottom = t.y + t.h;

    const dx = findBestSnap1D(left, right, tLeft, tRight, snapPx);
    if (dx !== null) {
      const abs = Math.abs(dx);
      if (abs < bestDxAbs) {
        bestDxAbs = abs;
        bestDx = dx;
      }
    }

    const dy = findBestSnap1D(top, bottom, tTop, tBottom, snapPx);
    if (dy !== null) {
      const abs = Math.abs(dy);
      if (abs < bestDyAbs) {
        bestDyAbs = abs;
        bestDy = dy;
      }
    }
  }

  return {
    ...rect,
    x: bestDx !== null ? rect.x + bestDx : rect.x,
    y: bestDy !== null ? rect.y + bestDy : rect.y
  };
};

const findBestSnap1DWithGuide = (
  movingA: number,
  movingB: number,
  targetA: number,
  targetB: number,
  snapPx: number
): AwSnap1DResult | null => {
  const candidates = [
    { delta: targetA - movingA, guide: targetA },
    { delta: targetB - movingA, guide: targetB },
    { delta: targetA - movingB, guide: targetA },
    { delta: targetB - movingB, guide: targetB }
  ];

  let best: AwSnap1DResult | null = null;
  let bestAbs = Number.POSITIVE_INFINITY;

  for (const c of candidates) {
    const abs = Math.abs(c.delta);
    if (abs <= snapPx && abs < bestAbs) {
      bestAbs = abs;
      best = { delta: c.delta, guide: c.guide };
    }
  }

  return best;
};

export const snapRectToOtherRectsWithGuides = (
  rect: AwWindowRect,
  targets: AwWindowRect[],
  snapPx: number
): { rect: AwWindowRect, guides: AwSnapGuides } => {
  if (targets.length === 0) {
    return { rect, guides: {} };
  }

  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;

  let bestDx: AwSnap1DResult | null = null;
  let bestDxAbs = Number.POSITIVE_INFINITY;

  let bestDy: AwSnap1DResult | null = null;
  let bestDyAbs = Number.POSITIVE_INFINITY;

  for (const t of targets) {
    const tLeft = t.x;
    const tRight = t.x + t.w;
    const tTop = t.y;
    const tBottom = t.y + t.h;

    const rx = findBestSnap1DWithGuide(left, right, tLeft, tRight, snapPx);
    if (rx) {
      const abs = Math.abs(rx.delta);
      if (abs < bestDxAbs) {
        bestDxAbs = abs;
        bestDx = rx;
      }
    }

    const ry = findBestSnap1DWithGuide(top, bottom, tTop, tBottom, snapPx);
    if (ry) {
      const abs = Math.abs(ry.delta);
      if (abs < bestDyAbs) {
        bestDyAbs = abs;
        bestDy = ry;
      }
    }
  }

  const nextRect: AwWindowRect = {
    ...rect,
    x: bestDx ? rect.x + bestDx.delta : rect.x,
    y: bestDy ? rect.y + bestDy.delta : rect.y
  };

  return {
    rect: nextRect,
    guides: {
      x: bestDx ? bestDx.guide : undefined,
      y: bestDy ? bestDy.guide : undefined
    }
  };
};
const rangesOverlap = (a0: number, a1: number, b0: number, b1: number): boolean => Math.max(a0, b0) < Math.min(a1, b1);

const bestSnapDeltaToTargets = (value: number, targets: number[], snapPx: number): { delta: number, guide: number } | null => {
  let bestDelta = 0;
  let bestGuide = 0;
  let bestAbs = Number.POSITIVE_INFINITY;

  for (const t of targets) {
    const delta = t - value;
    const abs = Math.abs(delta);
    if (abs <= snapPx && abs < bestAbs) {
      bestAbs = abs;
      bestDelta = delta;
      bestGuide = t;
    }
  }

  if (bestAbs === Number.POSITIVE_INFINITY) {
    return null;
  }

  return { delta: bestDelta, guide: bestGuide };
};
export const resizeRectWithWindowSnap = (
  rect: AwWindowRect,
  dir: AwResizeDirection,
  targets: AwWindowRect[],
  snapPx: number
): { rect: AwWindowRect, guides: AwSnapGuides } => {
  if (targets.length === 0) {
    return { rect, guides: {} };
  }

  let x = rect.x;
  let y = rect.y;
  let w = rect.w;
  let h = rect.h;

  const left = x;
  const right = x + w;
  const top = y;
  const bottom = y + h;

  let guideX: number | undefined = undefined;
  let guideY: number | undefined = undefined;

  // Build candidate target edges for X and Y with overlap filtering
  const xTargets: number[] = [];
  const yTargets: number[] = [];

  for (const t of targets) {
    const tLeft = t.x;
    const tRight = t.x + t.w;
    const tTop = t.y;
    const tBottom = t.y + t.h;

    // X snapping is only meaningful if vertical ranges overlap

    xTargets.push(tLeft, tRight);

    // Y snapping is only meaningful if horizontal ranges overlap

    yTargets.push(tTop, tBottom);
  }

  // Snap right edge (E)
  if (dir.includes('e') && xTargets.length > 0) {
    const res = bestSnapDeltaToTargets(right, xTargets, snapPx);
    if (res) {
      w = (right + res.delta) - x;
      guideX = res.guide;
    }
  }

  // Snap left edge (W) -> adjust x, keep right fixed
  if (dir.includes('w') && xTargets.length > 0) {
    const res = bestSnapDeltaToTargets(left, xTargets, snapPx);
    if (res) {
      const fixedRight = right;
      x = left + res.delta;
      w = fixedRight - x;
      guideX = res.guide;
    }
  }

  // Snap bottom edge (S)
  if (dir.includes('s') && yTargets.length > 0) {
    const res = bestSnapDeltaToTargets(bottom, yTargets, snapPx);
    if (res) {
      h = (bottom + res.delta) - y;
      guideY = res.guide;
    }
  }

  // Snap top edge (N) -> adjust y, keep bottom fixed
  if (dir.includes('n') && yTargets.length > 0) {
    const res = bestSnapDeltaToTargets(top, yTargets, snapPx);
    if (res) {
      const fixedBottom = bottom;
      y = top + res.delta;
      h = fixedBottom - y;
      guideY = res.guide;
    }
  }

  return {
    rect: { x, y, w, h },
    guides: { x: guideX, y: guideY }
  };
};

export const normalizeRectWithinBounds = (
  rect: AwWindowRect,
  bounds: AwBounds,
  minW: number,
  minH: number
): AwWindowRect => {
  let x = rect.x;
  let y = rect.y;
  let w = Math.max(rect.w, minW);
  let h = Math.max(rect.h, minH);

  if (bounds.w > 0 && bounds.h > 0) {
    x = clamp(x, 0, Math.max(0, bounds.w - minW));
    y = clamp(y, 0, Math.max(0, bounds.h - minH));

    const maxW = Math.max(minW, bounds.w - x);
    const maxH = Math.max(minH, bounds.h - y);

    w = clamp(w, minW, maxW);
    h = clamp(h, minH, maxH);
  }

  return { x, y, w, h };
};
