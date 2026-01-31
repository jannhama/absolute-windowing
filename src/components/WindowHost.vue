<template>
  <div ref="hostEl" class="aw-wm-host aw-wm-root" :data-aw-theme="options.theme">
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
import { computed, ref } from 'vue';
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
  return props.windowManager.getWindows();
});

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
</style>
