<template>
  <div class="env-test">
    <h3>环境变量测试</h3>
    <p>BASE_URL: {{ baseUrl }}</p>
    <p>APP_TITLE: {{ appTitle }}</p>
    <p>所有环境变量: {{ allEnv }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const baseUrl = ref('')
const appTitle = ref('')
const allEnv = ref({})

onMounted(() => {
  console.log('环境变量测试组件已加载')
  console.log('import.meta.env:', import.meta.env)

  // 获取环境变量
  baseUrl.value = import.meta.env.VITE_BASE_URL || '未获取到'
  appTitle.value = import.meta.env.VITE_APP_TITLE || '未获取到'

  // 获取所有环境变量
  allEnv.value = {...import.meta.env}
})
</script>

<style scoped>
.env-test {
  margin: 20px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>
