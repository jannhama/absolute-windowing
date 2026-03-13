import { AwWindowFlags } from '../types';

export const readCssVarPx = (host: HTMLElement, varName: string): number => {
  const raw = getComputedStyle(host).getPropertyValue(varName).trim();
  if (!raw) {
    return 0;
  }

  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = raw;
  probe.style.pointerEvents = 'none';

  host.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  host.removeChild(probe);

  return Math.round(px);
};

export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const genId = (): string =>
  `w_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

export const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

export const shallowEqualRecord = (
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!hasOwn(right, key) || left[key] !== right[key]) {
      return false;
    }
  }

  return true;
};

export const shallowEqualFlags = (left: AwWindowFlags, right: AwWindowFlags): boolean => {
  return (
    left.movable === right.movable &&
    left.resizable === right.resizable &&
    left.closable === right.closable &&
    left.minimizable === right.minimizable &&
    left.maximizable === right.maximizable &&
    left.closeOnEsc === right.closeOnEsc &&
    left.closeOnBackdrop === right.closeOnBackdrop &&
    left.isBlockingWindow === right.isBlockingWindow
  );
};