<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useStudy } from '../composables'
import { englishVoices } from '../utils/speech'

const emit = defineEmits<{ close: [] }>()
const study = useStudy()
const message = ref('')
const file = ref<HTMLInputElement>()
const voices = ref<SpeechSynthesisVoice[]>([])
function reloadVoices() { voices.value = englishVoices() }
function updateVoice(event: Event) { study.setVoice((event.target as HTMLSelectElement).value) }
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
onMounted(() => {
  reloadVoices()
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', reloadVoices)
})
onBeforeUnmount(() => {
  if ('speechSynthesis' in window) speechSynthesis.removeEventListener('voiceschanged', reloadVoices)
})
</script>

<template>
  <main class="page settings-page">
    <header class="topbar"><div><p class="eyebrow">本地数据与显示</p><h1>设置</h1></div><button class="back-button" @click="emit('close')">完成</button></header>
    <section class="settings-group"><h2>外观</h2><label>主题<select :value="study.state.settings.theme" @change="study.setTheme(($event.target as HTMLSelectElement).value as 'system' | 'light' | 'dark')"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label></section>
    <section class="settings-group"><h2>发音</h2><p>声音来自本机浏览器/系统，不同设备的清晰度会不同。音标比合成声音更适合用来确认尾音。</p><label>系统英语语音<select :value="study.state.settings.voiceURI" @change="updateVoice"><option value="">自动选择（优先美式）</option><option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">{{ voice.name }} · {{ voice.lang }}</option></select></label><p v-if="!voices.length" class="muted">未检测到英语语音；请在系统语言/语音设置中安装英文语音包。</p></section>
    <section class="settings-group"><h2>数据管理</h2><p>学习状态、统计和当前位置只保存在本机浏览器。</p><button @click="study.exportProgress">导出进度</button><button @click="importFile">导入进度</button><input ref="file" class="sr-only" type="file" accept="application/json" @change="readFile" /><button class="danger" @click="reset">清空进度</button><p v-if="message" class="notice">{{ message }}</p></section>
    <section class="settings-group attribution"><h2>词库与许可</h2><p>词库来自 Allison Parrish 的 <a href="https://github.com/aparrish/wordfreq-en-25000" target="_blank" rel="noreferrer">wordfreq-en-25000</a>，原数据来自 Robyn Speer 的 wordfreq。</p><p>美式 IPA 由 <a href="https://github.com/cmusphinx/cmudict" target="_blank" rel="noreferrer">CMU Pronouncing Dictionary</a> 转换而来，包含变体读音。</p><p>中文释义来自 <a href="https://github.com/skywind3000/ECDICT" target="_blank" rel="noreferrer">ECDICT</a> 的本地裁剪数据。</p><p>数据按 <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> 提供；本项目保留了原始词序和频率值。</p></section>
  </main>
</template>
