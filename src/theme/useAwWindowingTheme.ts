// src/windowing/theme/useWindowingTheme.ts
import { ref } from 'vue';

export type AwWindowingTheme = 'dark' | 'light';
export type AwWindowingDensity = 'comfortable' | 'compact';

const AW_STORAGE_THEME_KEY = 'aw.wm.theme';
const AW_STORAGE_DENSITY_KEY = 'aw.wm.density';

const isTheme = (value: string): value is AwWindowingTheme => {
  if (value === 'dark') {
    return true;
  }
  if (value === 'light') {
    return true;
  }
  return false;
};

const isDensity = (value: string): value is AwWindowingDensity => {
  if (value === 'comfortable') {
    return true;
  }
  if (value === 'compact') {
    return true;
  }
  return false;
};

export const useAwWindowingTheme = () => {
  const theme = ref<AwWindowingTheme>('dark');
  const density = ref<AwWindowingDensity>('comfortable');

  const applyToRoot = (rootEl: HTMLElement | null): void => {
    if (!rootEl) {
      return;
    }
    rootEl.dataset.theme = theme.value;
    rootEl.dataset.density = density.value;
  };

  const loadFromStorage = (): void => {
    const storedTheme = localStorage.getItem(AW_STORAGE_THEME_KEY);
    if (storedTheme && isTheme(storedTheme)) {
      theme.value = storedTheme;
    }

    const storedDensity = localStorage.getItem(AW_STORAGE_DENSITY_KEY);
    if (storedDensity && isDensity(storedDensity)) {
      density.value = storedDensity;
    }
  };

  const setTheme = (next: AwWindowingTheme, rootEl: HTMLElement | null): void => {
    theme.value = next;
    localStorage.setItem(AW_STORAGE_THEME_KEY, next);
    applyToRoot(rootEl);
  };

  const toggleTheme = (rootEl: HTMLElement | null): void => {
    const next: AwWindowingTheme = theme.value === 'dark' ? 'light' : 'dark';
    setTheme(next, rootEl);
  };

  const setDensity = (next: AwWindowingDensity, rootEl: HTMLElement | null): void => {
    density.value = next;
    localStorage.setItem(AW_STORAGE_DENSITY_KEY, next);
    applyToRoot(rootEl);
  };

  return {
    theme,
    density,
    applyToRoot,
    loadFromStorage,
    setTheme,
    toggleTheme,
    setDensity
  };
};
