// src/index.ts
export type {
  AwWindowId,
  AwWindowState,
  AwWindowRect,
  AwWindowFlags,
  AwWindowModel,
  AwCreateWindowInput,
  AwWindowManager,
  AwWindowManagerHooks,
  AwOptions,
} from './types';
export * from './constants';
export { awCreateWindowManager } from './core/windowManager';
export { useAwWindowingTheme } from './theme/useAwWindowingTheme';
export { default as WindowHost } from './components/WindowHost.vue';
export { default as WindowShell } from './components/WindowShell.vue';
