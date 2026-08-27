<script setup lang="ts">
import { ref } from 'vue'
import { useStudy } from '../composables'

const emit = defineEmits<{ close: [] }>()
const study = useStudy()
const message = ref('')
const file = ref<HTMLInputElement>()
function importFile() { file.value?.click() }
function readFile(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (!selected) return
  const reader = new FileReader()
  reader.onload = () => {
    try { study.importProgress(JSON.parse(String(reader.result))); message.value = '进度已恢复。' }
    catch (error) { message.value = error instanceof Error ? error.message : '导入失败。' }
  }
  reader.readAsText(selected)
}
function reset() {
  if (window.confirm('确定清空所有学习进度吗？此操作无法撤销。') && window.confirm('再确认一次：要删除所有本地学习记录吗？')) {
    study.reset(); message.value = '本地进度已清空。'
  }
}
</script>

<template>
  <main class="page settings-page">
    <header class="topbar"><div><p class="eyebrow">本地数据与显示</p><h1>设置</h1></div><button class="back-button" @click="emit('close')">完成</button></header>
    <section class="settings-group"><h2>外观</h2><label>主题<select :value="study.state.settings.theme" @change="study.setTheme(($event.target as HTMLSelectElement).value as 'system' | 'light' | 'dark')"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label></section>
    <section class="settings-group"><h2>数据管理</h2><p>学习状态、统计和当前位置只保存在本机浏览器。</p><button @click="study.exportProgress">导出进度</button><button @click="importFile">导入进度</button><input ref="file" class="sr-only" type="file" accept="application/json" @change="readFile" /><button class="danger" @click="reset">清空进度</button><p v-if="message" class="notice">{{ message }}</p></section>
    <section class="settings-group attribution"><h2>词库与许可</h2><p>词库来自 Allison Parrish 的 <a href="https://github.com/aparrish/wordfreq-en-25000" target="_blank" rel="noreferrer">wordfreq-en-25000</a>，原数据来自 Robyn Speer 的 wordfreq。</p><p>数据按 <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> 提供；本项目保留了原始词序和频率值。</p></section>
  </main>
</template>
