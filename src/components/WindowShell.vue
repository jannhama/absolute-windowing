<template>
  <div
    ref="shellEl"
    class="aw-wm-window"
    :class="{ 'is-active': win.isActive, 'is-minimized': win.state === 'minimized' }"
    :style="windowStyle"
    @pointerdown="onActivate"
  >
    <div
      v-if="options.showTitleBar"
      :class="win.isActive ? 'aw-wm-titlebar active' : 'aw-wm-titlebar'"
      @pointerdown.stop="onTitleBarPointerDown"
      @dblclick.stop="onMinimize"
    >
      <div class="aw-wm-title">
        {{ win.title }}
      </div>

      <div v-if="options.showWindowControls" class="aw-wm-controls">
        <button
          v-if="win.flags.minimizable"
          class="aw-wm-btn"
          type="button"
          @click.stop="onMinimize"
        >
          _
        </button>

        <button
          v-if="win.flags.maximizable"
          class="aw-wm-btn"
          type="button"
          @click.stop="onMaximize"
        >
          ☐
        </button>

        <button
          v-if="win.flags.closable"
          class="aw-wm-btn aw-wm-btn-close"
          type="button"
          @click.stop="onClose"
        >
          ×
        </button>
      </div>
    </div>

    <div v-if="win.state === 'open' || win.state === 'maximized'" class="aw-wm-content">
      <component :is="win.component" v-bind="win.props ?? {}" />
    </div>

    <ResizeHandles
      v-if="win.flags.resizable && win.state === 'open'"
      @resizeStart="onResizeStart"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref } from 'vue';
import ResizeHandles from './ResizeHandles.vue';
import { AwBounds, AwDragSession, AwResizeDirection, AwDragMode } from '../internal/types';
import { AwOptions, AwWindowId, AwWindowModel, AwWindowRect } from '../types';
import {
  clampRectPosition,
  moveRectWithinBounds,
  normalizeRectWithinBounds,
  resizeRectWithinBounds,
  resizeRectWithWindowSnap,
  snapRectToOtherRectsWithGuides,
} from '../input/geometry';
import { AW_DEFAULT_OPTIONS, AW_TITLEBAR_HEIGHT } from '../constants';
import { readCssVarPx } from '../internal/utils';

interface Props {
  win: AwWindowModel;
  options: AwOptions;
  getBounds: () => AwBounds;
  getSnapTargets: (id: AwWindowId) => AwWindowRect[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'activate', id: AwWindowId): void;
  (e: 'move', payload: { id: AwWindowId; rect: AwWindowRect; bounds: AwBounds }): void;
  (e: 'resize', payload: { id: AwWindowId; rect: AwWindowRect; bounds: AwBounds }): void;
  (e: 'close', id: AwWindowId): void;
  (e: 'minimize', id: AwWindowId): void;
  (e: 'maximize', payload: { id: AwWindowId; bounds: AwBounds }): void;
  (e: 'guides', payload: { id: AwWindowId; guides: { x?: number; y?: number } }): void;
}>();

const shellEl = ref<HTMLElement | null>(null);


const titleBarHeightPx = computed(() => {
  const el = shellEl.value;
  if (!el) {
    return AW_TITLEBAR_HEIGHT;
  }

  const host = (el.closest('.aw-wm-root') as HTMLElement | null) ?? el;
  const px = readCssVarPx(host, '--aw-wm-titlebar-h');
  return px > 0 ? px : AW_TITLEBAR_HEIGHT;
});


const session = shallowRef<AwDragSession | null>(null);

const windowStyle = computed<Record<string, string>>(() => {
  const { x, y, w, h } = props.win.rect;

  const titleBarHeight = titleBarHeightPx.value;
  const height = props.win.state === 'minimized' ? `${titleBarHeight}px` : `${h}px`;

  return {
    transform: `translate(${x}px, ${y}px)`,
    width: `${w}px`,
    height,
  };
});

const onActivate = (): void => {
  emit('activate', props.win.id);
};

const onClose = (): void => {
  emit('close', props.win.id);
};

const onMinimize = (): void => {
  emit('minimize', props.win.id);
};

const onMaximize = (): void => {
  const bounds = props.getBounds();
  emit('maximize', { id: props.win.id, bounds });
};

const onTitleBarPointerDown = (e: PointerEvent): void => {
  const win = props.win;
  if (!win.flags.movable || props.options.locked) {
    return;
  }
  if (win.state !== 'open' && win.state !== 'minimized') {
    return;
  }

  emit('activate', win.id);

  e.preventDefault();

  session.value = {
    mode: 'move',
    id: win.id,
    pointerId: e.pointerId,
    startClientX: e.clientX,
    startClientY: e.clientY,
    startRect: { ...win.rect },
  };

  attachGlobalPointerListeners();
};

const onResizeStart = (payload: { event: PointerEvent; dir: AwResizeDirection }): void => {
  const win = props.win;
  if (!win.flags.resizable || props.options.locked) {
    return;
  }
  if (win.state !== 'open') {
    return;
  }

  emit('activate', win.id);

  payload.event.preventDefault();

  session.value = {
    mode: 'resize',
    id: win.id,
    pointerId: payload.event.pointerId,
    dir: payload.dir,
    startClientX: payload.event.clientX,
    startClientY: payload.event.clientY,
    startRect: { ...win.rect },
  };

  attachGlobalPointerListeners();
};

const onPointerUp = (e: PointerEvent): void => {
  const ses = session.value;
  if (!ses) {
    return;
  }
  if (e.pointerId !== ses.pointerId) {
    return;
  }

  session.value = null;
  detachGlobalPointerListeners();
  emit('guides', { id: ses.id, guides: {} });
};

const onPointerMove = (e: PointerEvent): void => {
  const ses = session.value;
  if (!ses) {
    return;
  }
  if (e.pointerId !== ses.pointerId) {
    return;
  }

  const dx = e.clientX - ses.startClientX;
  const dy = e.clientY - ses.startClientY;

  const bounds = props.getBounds();

  const disableSnap = e.altKey;
  const enableGridSnap = e.shiftKey && !disableSnap && props.options.snapToGrid;
  const enableEdgeSnap = !disableSnap && props.options.snapToEdges;
  const enableWindowSnap = !disableSnap && props.options.snapToWindows;

  if (ses.mode === 'move') {
    const effectiveSize =
      props.win.state === 'minimized'
        ? { w: ses.startRect.w, h: titleBarHeightPx.value }
        : undefined;

    let rect = moveRectWithinBounds({
      start: ses.startRect,
      dx,
      dy,
      bounds,
      edgeSnapPx: props.options.edgeSnapOffset,
      effectiveSize,
      gridSize: props.options.gridSize,
      enableEdgeSnap,
      enableGridSnap,
    });

    if (enableWindowSnap) {
      const targets = props.getSnapTargets(ses.id);

      const snapped = snapRectToOtherRectsWithGuides(rect, targets, props.options.windowSnapOffset);
      rect = snapped.rect;
      rect = clampRectPosition(rect, bounds, effectiveSize);

      emit('guides', { id: ses.id, guides: snapped.guides });
    } else {
      emit('guides', { id: ses.id, guides: {} });
    }

    emit('move', { id: ses.id, rect, bounds });
    return;
  }

  if (ses.mode === 'resize') {
    const dir = ses.dir ?? 'se';

    let rect = resizeRectWithinBounds({
      start: ses.startRect,
      dx,
      dy,
      direction: dir,
      bounds,
      minWidth: props.options.minWidth ?? AW_DEFAULT_OPTIONS.minWidth,
      minHeight: props.options.minHeight,
      gridSize: props.options.gridSize,
      enableGridSnap,
    });

    if (enableWindowSnap) {
      const targets = props.getSnapTargets(ses.id);

      const snapped = resizeRectWithWindowSnap(rect, dir, targets, props.options.windowSnapOffset);
      rect = normalizeRectWithinBounds(
        snapped.rect,
        bounds,
        props.options.minWidth,
        props.options.minHeight,
      );

      emit('guides', { id: ses.id, guides: snapped.guides });
    } else {
      emit('guides', { id: ses.id, guides: {} });
    }

    emit('resize', { id: ses.id, rect, bounds });
  }
};

const attachGlobalPointerListeners = (): void => {
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
};

const detachGlobalPointerListeners = (): void => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
};
</script>

<style scoped>
.aw-wm-window {
  font-family: var(--aw-wm-font-family), sans-serif;
  box-sizing: content-box;
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--aw-wm-border);
  border-radius: var(--aw-wm-radius);
  background: var(--aw-wm-window-bg);
  box-shadow: var(--aw-wm-shadow);
  touch-action: none;
}

.aw-wm-window.is-active {
  border-color: var(--aw-wm-border-active);
}

.aw-wm-window.is-minimized > .aw-wm-titlebar {
  border-radius: var(--aw-wm-radius);
}

.aw-wm-titlebar {
  height: var(--aw-wm-titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--aw-wm-titlebar-padding-x);
  border-bottom: var(--aw-wm-titlebar-border-bottom);
  border-radius: var(--aw-wm-radius) var(--aw-wm-radius) 0 0;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  background: var(--aw-wm-titlebar-bg);
  gap: var(--aw-wm-controls-gap);
  color: var(--aw-wm-title-text);
}

.aw-wm-titlebar:active {
  cursor: grabbing;
}

.aw-wm-titlebar.active {
  background-color: var(--aw-wm-titlebar-active-bg);
}

.aw-wm-title {
  font-size: 12px;
  opacity: 0.9;
}

.aw-wm-controls {
  display: flex;
  gap: 6px;
}

.aw-wm-btn {
  height: 20px;
  min-width: 22px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid var(--aw-wm-btn-border);
  background: var(--aw-wm-btn-bg);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}

.aw-wm-btn:hover {
  background: var(--aw-wm-btn-bg-hover);
}

.aw-wm-btn-close:hover {
  background: var(--aw-wm-btn-close-hover);
}

.aw-wm-content {
  height: calc(100% - 28px);
  overflow: auto;
}
</style>
