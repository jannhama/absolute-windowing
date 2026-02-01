<template>
  <div
    ref="hostEl"
    class="aw-wm-host aw-wm-root"
    :data-aw-theme="options.theme"
    tabindex="0"
    @mousedown="onHostMouseDown"
  >
      <WindowShell
        v-for="(win, index) in normalWindows"
        :key="win.id"
        :win="win"
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
      <WindowShell
        v-for="(win, index) in utilityWindows"
        :key="win.id"
        :win="win"
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
      <WindowShell
        v-for="(win, index) in overlayWindows"
        :key="win.id"
        :win="win"
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
      v-if="modalBackdropVisible"
      class="aw-wm-backdrop"
      @mousedown.stop.prevent="onBackdropMouseDown"
    ></div>
    <WindowShell
      v-for="(win, index) in modalWindows"
      :key="win.id"
      :win="win"
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
      v-if="systemBackdropVisible"
      class="aw-wm-backdrop"
      @mousedown.stop.prevent="onSystemBackdropMouseDown"
    ></div>
    <WindowShell
      v-for="(win, index) in systemWindows"
      :key="win.id"
      :win="win"
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

interface Props {
  windowManager: AwWindowManager;
  options?: Partial<AwOptions>;
}

const props = defineProps<Props>();

interface Bounds {
  w: number;
  h: number;
}

const hostEl = ref<HTMLDivElement | null>(null);

const windows = computed(() => {
  return props.windowManager.getWindowsForRender();
});

const normalWindows = computed(() => {
  return props.windowManager.getWindowsForLayer('normal');
});
const utilityWindows = computed(() => {
  return props.windowManager.getWindowsForLayer('utility');
});
const overlayWindows = computed(() => {
  return props.windowManager.getWindowsForLayer('overlay');
});
const modalWindows = computed(() => {
  return props.windowManager.getWindowsForLayer('modal');
});
const systemWindows = computed(() => {
  return props.windowManager.getWindowsForLayer('system');
});

const options = computed<AwOptions>(() => {
  const options = {
    ...AW_DEFAULT_OPTIONS,
    ...(props.options ?? {}),
  };
  return options;
});
const snapGuides = shallowRef<{ x?: number; y?: number }>({});
const guideOwner = shallowRef<AwWindowId | null>(null);

const systemBackdropVisible = computed(() => {
  if (systemWindows.value.length > 0) {
    return systemWindows.value.some((win) => {
      return win.flags.closeOnBackdrop || win.flags.closeOnEsc;
    });
  }
  return false;
});

const getBlockingOverlay = (): AwWindowModel | null => {
  const blockingSystem = systemWindows.value.find(
    (w) => w.flags.closeOnBackdrop || w.flags.closeOnEsc,
  );
  if (blockingSystem) {
    return blockingSystem;
  }
  return modalWindows.value.at(-1) ?? null;
};

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
    .filter((candidate) => candidate.id !== id)
    .map((candidate) => getVisibleRect(candidate));
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
  const win = modalWindows.value.find((w) => w.isActive && w.layer === 'modal');
  return win ?? null;
};

const getActiveWindow = (): AwWindowModel | null => {
  const win = windows.value.find((w) => w.isActive);
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

const isBlockingSystemWindow = (win: AwWindowModel): boolean => {
  return win.flags.closeOnBackdrop === true || win.flags.closeOnEsc === true;
};

const onHostKeyEvent = (event: KeyboardEvent): void => {
  const system = props.windowManager.getTopmostInLayer('system');
  const blockingSystem = system && isBlockingSystemWindow(system) ? system : null;

  const modal = getTopmostModalWindow();

  if (blockingSystem) {
    // Trap Tab so focus can't escape behind the system dialog.
    if (event.type === 'keydown' && event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.type === 'keydown' && event.key === 'Escape') {
      const canClose = blockingSystem.flags.closable && blockingSystem.flags.closeOnEsc === true;
      if (canClose) {
        props.windowManager.closeWindow(blockingSystem.id);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    const handled = deliverKey(blockingSystem, event);
    event.stopPropagation();
    if (handled) {
      event.preventDefault();
    }
    return;
  }

  if (modal) {
    // Trap Tab so focus can't escape behind the modal.
    if (event.type === 'keydown' && event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.type === 'keydown' && event.key === 'Escape') {
      const canClose = modal.flags.closable && modal.flags.closeOnEsc === true;
      if (canClose) {
        props.windowManager.closeWindow(modal.id);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    const handled = deliverKey(modal, event);
    event.stopPropagation();
    if (handled) {
      event.preventDefault();
    }
    return;
  }

  // No blocking overlay => keep your existing behavior (don't hijack typing in inputs).
  if (isTextInputTarget(event.target)) {
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
    if (win.layer === 'modal') {
      return win;
    }
  }
  return null;
};

const modalBackdropVisible = computed((): boolean => {
  return props.windowManager.hasModalWindows();
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
const onSystemBackdropMouseDown = (): void => {
  console.log('System backdrop clicked');
  const el = hostEl.value;
  if (el) {
    el.focus();
  }

  const system = props.windowManager.getTopmostInLayer('system');
  if (!system) {
    throw new Error('Expected system window to exist');
  }
  if (system.flags.closeOnBackdrop === false) {
    props.windowManager.activateWindow(system.id);
  } else {
    props.windowManager.closeWindow(system.id);
  }
};

const onGuides = (payload: { id: AwWindowId; guides: { x?: number; y?: number } }): void => {
  const isEmpty = payload.guides.x === undefined && payload.guides.y === undefined;

  if (!guideOwner.value) {
    if (isEmpty) {
      return;
    }
    guideOwner.value = payload.id;
  }

  if (payload.id !== guideOwner.value) {
    return;
  }

  if (isEmpty) {
    guideOwner.value = null;
    snapGuides.value = {};
    return;
  }

  snapGuides.value = payload.guides;
};

onMounted((): void => {
  // Capture phase so we trap keys even if focus is inside underlying content.
  window.addEventListener('keydown', onHostKeyEvent, { capture: true });
  window.addEventListener('keyup', onHostKeyEvent, { capture: true });
});

onBeforeUnmount((): void => {
  window.removeEventListener('keydown', onHostKeyEvent, { capture: true });
  window.removeEventListener('keyup', onHostKeyEvent, { capture: true });
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
