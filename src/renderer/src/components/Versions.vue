<script setup lang="ts">
import {reactive} from 'vue'

interface Versions {
  electron?: string
  chrome?: string
  node?: string
  v8?: string
  [key: string]: string | undefined
}

const versions: Versions = reactive({})

// 安全地访问electron对象
if (window.electron) {
  // 使用类型断言确保TypeScript不会报错
  const electronVersions = (window.electron as any).process?.versions || {}
  Object.assign(versions, electronVersions)
}
</script>

<template>
  <ul class="versions">
    <li class="electron-version">Electron v{{ versions.electron }}</li>
    <li class="chrome-version">Chromium v{{ versions.chrome }}</li>
    <li class="node-version">Node v{{ versions.node }}</li>
    <li class="v8-version">V8 v{{ versions.v8 }}</li>
  </ul>
</template>
