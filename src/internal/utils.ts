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
