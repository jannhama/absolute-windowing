// src/index.ts
import './styles/index.css';
export type {
  AwWindowId,
  AwWindowState,
  AwWindowRect,
  AwWindowLayer,
  AwWindowFlags,
  AwWindowModel,
  AwCreateWindowInput,
  AwWindowManager,
  AwWindowManagerHooks,
  AwOptions,
  AwVueComponent
} from './types';
export * from './constants';
export { awCreateWindowManager } from './core/windowManager';
export { default as WindowHost } from './components/WindowHost.vue';
export { default as WindowShell } from './components/WindowShell.vue';
