<template>
  <div
    class="aw-wm-handlewm-resize-layer"
    aria-hidden="true"
  >
    <div
      class="aw-wm-handle aw-wm-handle-n"
      @pointerdown.stop="start($event, 'n')"
    />
    <div
      class="aw-wm-handle aw-wm-handle-e"
      @pointerdown.stop="start($event, 'e')"
    />
    <div
      class="aw-wm-handle aw-wm-handle-s"
      @pointerdown.stop="start($event, 's')"
    />
    <div
      class="aw-wm-handle aw-wm-handle-w"
      @pointerdown.stop="start($event, 'w')"
    />

    <div
      class="aw-wm-handle aw-wm-handle-ne"
      @pointerdown.stop="start($event, 'ne')"
    />
    <div
      class="aw-wm-handle aw-wm-handle-nw"
      @pointerdown.stop="start($event, 'nw')"
    />
    <div
      class="aw-wm-handle aw-wm-handle-se"
      @pointerdown.stop="start($event, 'se')"
    />
    <div
      class="aw-wm-handle aw-wm-handle-sw"
      @pointerdown.stop="start($event, 'sw')"
    />
  </div>
</template>

<script setup lang="ts">
import type { AwResizeDirection } from '../internal/types';

const emit = defineEmits<{
  (e: 'resizeStart', payload: { event: PointerEvent; dir: AwResizeDirection }): void;
}>();

const start = (event: PointerEvent, dir: AwResizeDirection): void => {
  emit('resizeStart', { event, dir });
};
</script>

<style scoped>
.aw-wm-resize-layer {
  position: absolute;
  inset: 0;
}

.aw-wm-handle {
  position: absolute;
}

.aw-wm-handle-n {
  top: -3px;
  left: 10px;
  right: 10px;
  height: 6px;
  cursor: ns-resize;
}

.aw-wm-handle-s {
  bottom: -3px;
  left: 10px;
  right: 10px;
  height: 6px;
  cursor: ns-resize;
}

.aw-wm-handle-e {
  right: -3px;
  top: 10px;
  bottom: 10px;
  width: 6px;
  cursor: ew-resize;
}

.aw-wm-handle-w {
  left: -3px;
  top: 10px;
  bottom: 10px;
  width: 6px;
  cursor: ew-resize;
}

.aw-wm-handle-ne {
  top: -3px;
  right: -3px;
  width: 12px;
  height: 12px;
  cursor: nesw-resize;
}

.aw-wm-handle-nw {
  top: -3px;
  left: -3px;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
}

.aw-wm-handle-se {
  bottom: -3px;
  right: -3px;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
}

.aw-wm-handle-sw {
  bottom: -3px;
  left: -3px;
  width: 12px;
  height: 12px;
  cursor: nesw-resize;
}

.aw-wm-resize-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.aw-wm-handle {
  position: absolute;
  pointer-events: auto;
}
</style>
