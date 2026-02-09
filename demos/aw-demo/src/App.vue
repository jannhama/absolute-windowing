<template>
  <div class="button-area">
    <button @click="onOpenHello">Open window</button>
    <button @click="onToggleTheme" :class="isDarkTheme ? 'is-active' : ''">Toggle theme</button>
    <button @click="onToggleSnap" :class="snapping ? 'is-active' : ''">Toggle snap</button>
    <button @click="onToggleGuides" :class="showGuides ? 'is-active' : ''">Toggle guides</button>
    <button @click="onToggleLock" :class="locked ? 'is-active' : ''">Toggle lock</button>
    <button @click="onToggleShowTitles" :class="showTitleBar ? 'is-active' : ''">Toggle show title bar</button>
  </div>

  <div class="surface">
    <WindowHost
      :window-manager="manager"
      :options="{
        theme: isDarkTheme ? 'dark' : 'light',
        snapToEdges: snapping,
        snapToWindows: snapping,
        snapToGrid: snapping,
        gridSize: 32,
        showGuides: showGuides,
        locked: locked,
        showTitleBar: showTitleBar
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  WindowHost,
  awCreateWindowManager,
  type AwWindowManager,
  type AwWindowModel,
} from 'absolute-windowing';
import HelloWindow from './components/HelloWindow.vue';

const manager: AwWindowManager = awCreateWindowManager({
  onWindowOpened: (win: AwWindowModel) => console.log('opened', win.id),
  onWindowClosed: (win: AwWindowModel) => console.log('closed', win.id),
});

const isDarkTheme = ref(false);
const showTitleBar = ref(true);
const showGuides = ref(false);
const snapping = ref(false);
const locked = ref(false);


const onOpenHello = () => {
  manager.openWindow({
    title: 'Hello',
    component: HelloWindow,
    rect: { x: 80, y: 80, w: 520, h: 340 },
    layer: 'normal',
    flags: {
      closeOnEsc: true,
      minimizable: true,
      maximizable: true,
    },
    props: { message: 'Hello from Absolute Windowing' },
  });
};

const onToggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
};
const onToggleSnap = () => {
  snapping.value = !snapping.value;
};
const onToggleGuides = () => {
  showGuides.value = !showGuides.value;
};
const onToggleLock = () => {
  locked.value = !locked.value;
};
const onToggleShowTitles = () => {
  showTitleBar.value = !showTitleBar.value;
};


</script>

<style scoped>
.button-area {
  display: block;
  position: relative;
  height: 3rem;
}

.surface {
  display: block;
  position: absolute;
  left: 0;
  top: 3rem;
  bottom: 0;
  right: 0;
}

button.is-active {
  background-color: red;
}
</style>
