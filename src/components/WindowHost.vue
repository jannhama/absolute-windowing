<template>
  <div
    ref="hostEl"
    class="aw-wm-host aw-wm-root"
    :data-aw-theme="options.theme"
    tabindex="0"
    @mousedown="onHostMouseDown"
  >
    <div
      v-if="modalBackdropVisible"
      class="aw-wm-backdrop"
      :style="{ zIndex: backdropLayerIndex+1 }"
      @mousedown.stop.prevent="onBackdropMouseDown"
    ></div>
    <WindowShell
      v-for="(win, index) in windows"
      :key="win.id"
      :win="win"
      :zIndex="index + 1"
      :getBounds="getBounds"
      :getSnapTargets="getSnapTargets"
      @activate="onActivate"
      @move="onMove"
      @resize="onResize"
      @close="onClose"
      @minimize="onMinimize"
      @maximize="onMaximize"
      @guides="onGuides"
      :options="options"
    />

    <div
      v-if="showGuideX"
      class="aw-wm-guide aw-wm-guide-x"
      :style="{ left: snapGuides.x + 'px' }"
    ></div>
    <div
      v-if="showGuideY"
      class="aw-wm-guide aw-wm-guide-y"
      :style="{ top: snapGuides.y + 'px' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import WindowShell from './WindowShell.vue';
import type {
  AwWindowManager,
  AwOptions,
  AwWindowRect,
  AwWindowId,
  AwWindowModel,
} from '../types.ts';
import { shallowRef } from 'vue';

import { AW_DEFAULT_OPTIONS, AW_TITLEBAR_HEIGHT } from '../constants';
import { readCssVarPx } from '../internal/utils';

interface Props {
  windowManager: AwWindowManager;
  options?: Partial<AwOptions>;
}

const props = defineProps<Props>();

const options = computed<AwOptions>(() => {
  const options = {
    ...AW_DEFAULT_OPTIONS,
    ...(props.options ?? {}),
  };
  return options;
});

const snapGuides = shallowRef<{ x?: number; y?: number }>({});
const guideOwner = shallowRef<AwWindowId | null>(null);

const onGuides = (payload: { id: AwWindowId; guides: { x?: number; y?: number } }): void => {
  guideOwner.value = payload.id;
  snapGuides.value = payload.guides;
};
interface Bounds {
  w: number;
  h: number;
}

const hostEl = ref<HTMLDivElement | null>(null);

const windows = computed(() => {
  return props.windowManager.getWindowsForRender();
});

const backdropLayerIndex = computed(()=>{
  return props.windowManager.getLayerStartIndex('modal');
})
/*
const modalBackdropZIndex = computed(() => {
  return windows.value.findIndex((w) => w.layer === 'modal');
});
*/

/*
const modalBackdropVisible = computed(() => {
  return windows.value.some((w) => w.layer === 'modal');
});
*/

const getBounds = (): Bounds => {
  const el = hostEl.value;
  if (!el) {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  const r = el.getBoundingClientRect();
  const w = Math.floor(r.width);
  const h = Math.floor(r.height);

  if (w <= 0 || h <= 0) {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  return { w, h };
};

const showGuideX = computed(() => {
  return snapGuides.value.x !== undefined && options.value.showGuides;
});

const showGuideY = computed(() => {
  return snapGuides.value.y !== undefined && options.value.showGuides;
});

const onActivate = (id: AwWindowId): void => {
  props.windowManager.activateWindow(id);
};

const onClose = (id: AwWindowId): void => {
  props.windowManager.closeWindow(id);
};

const onMinimize = (id: AwWindowId): void => {
  props.windowManager.toggleMinimize(id);
};

const onMaximize = (payload: { id: AwWindowId; bounds: Bounds }): void => {
  props.windowManager.toggleMaximize(payload.id, payload.bounds);
};

const onMove = (payload: { id: AwWindowId; rect: AwWindowRect; bounds: Bounds }) => {
  props.windowManager.setWindowRect(payload.id, payload.rect, payload.bounds);
};

const onResize = (payload: { id: AwWindowId; rect: AwWindowRect; bounds: Bounds }): void => {
  props.windowManager.setWindowRect(payload.id, payload.rect, payload.bounds);
};

const getVisibleRect = (win: { rect: AwWindowRect; state: string }): AwWindowRect => {
  if (win.state === 'minimized') {
    return { ...win.rect, h: AW_TITLEBAR_HEIGHT };
  }
  return { ...win.rect };
};

const getSnapTargets = (id: AwWindowId): AwWindowRect[] => {
  return windows.value
    .filter((w) => w.id !== id && w.state !== 'closed')
    .map((w) => getVisibleRect(w));
};

// -------------------------
// Keyboard routing
// -------------------------

const onHostMouseDown = (): void => {
  const el = hostEl.value;
  if (!el) {
    return;
  }
  el.focus();
};

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof Element)) {
    return false;
  }

  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    return true;
  }

  return false;
};

const getActiveModalWindow = (): AwWindowModel | null => {
  const win = windows.value.find((w) => w.isActive && w.layer === 'modal' && w.state !== 'closed');
  return win ?? null;
};

const getActiveWindow = (): AwWindowModel | null => {
  const win = windows.value.find((w) => w.isActive && w.state !== 'closed');
  return win ?? null;
};

const deliverKey = (win: AwWindowModel, event: KeyboardEvent): boolean => {
  if (event.type === 'keydown') {
    if (!win.onKeyDown) {
      return false;
    }
    return win.onKeyDown(event);
  }

  if (event.type === 'keyup') {
    if (!win.onKeyUp) {
      return false;
    }
    return win.onKeyUp(event);
  }

  return false;
};

const onHostKeyEvent = (event: KeyboardEvent): void => {
  if (isTextInputTarget(event.target)) {
    return;
  }

  const modal = getActiveModalWindow();
  if (modal) {
    const handled = deliverKey(modal, event);
    event.stopPropagation();
    if (handled) {
      event.preventDefault();
    }
    return;
  }

  const active = getActiveWindow();
  if (!active) {
    return;
  }

  const handled = deliverKey(active, event);
  if (!handled) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
};

const getTopmostModalWindow = (): AwWindowModel | null => {
  // windows are assumed to already be in render/z order
  for (let i = windows.value.length - 1; i >= 0; i -= 1) {
    const win = windows.value[i];
    if (win.layer === 'modal' && win.state !== 'closed') {
      return win;
    }
  }
  return null;
};

const getFirstModalZIndex = (): number | null => {
  for (let i = 0; i < windows.value.length; i += 1) {
    const win = windows.value[i];
    if (win.layer === 'modal' && win.state !== 'closed') {
      return i + 1;
    }
  }
  return null;
};

const modalBackdropVisible = computed((): boolean => {
  return getFirstModalZIndex() !== null;
});

const modalBackdropZIndex = computed((): number => {
  const firstModalZ = getFirstModalZIndex();
  if (firstModalZ === null) {
    return 0;
  }
  return Math.max(0, firstModalZ );
});

const onBackdropMouseDown = (): void => {
  const el = hostEl.value;
  if (el) {
    el.focus();
  }

  const modal = getTopmostModalWindow();
  if (modal) {
    props.windowManager.activateWindow(modal.id);
  }
};
onMounted((): void => {
  const el = hostEl.value;
  if (!el) {
    return;
  }

  el.addEventListener('keydown', onHostKeyEvent);
  el.addEventListener('keyup', onHostKeyEvent);
});

onBeforeUnmount((): void => {
  const el = hostEl.value;
  if (!el) {
    return;
  }

  el.removeEventListener('keydown', onHostKeyEvent);
  el.removeEventListener('keyup', onHostKeyEvent);
});
</script>

<style scoped>
.aw-wm-host {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--aw-wm-bg);
}

.aw-wm-guide {
  position: absolute;
  pointer-events: none;
  z-index: 999999;
  opacity: 0.9;
}

.aw-wm-guide-x {
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 200, 255, 0.85);
}

.aw-wm-guide-y {
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(0, 200, 255, 0.85);
}

.aw-wm-backdrop {
  background: var(--aw-wm-backdrop-color);
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  inset: 0;
}
</style>
