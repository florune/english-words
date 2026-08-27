<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { dictionaryUrl } from '../services/dictionary'
import { speakWord } from '../utils/speech'
import { useStudy } from '../composables'
import type { StudyMode, WordStatus } from '../types/word'

const props = defineProps<{ mode: StudyMode }>()
const emit = defineEmits<{ close: [] }>()
const study = useStudy()
const rank = ref<number>()
const showInfo = ref(false)
const word = computed(() => study.wordFor(rank.value))
const ipa = computed(() => word.value ? study.phonetics.value[word.value.word] ?? [] : [])
const translation = computed(() => word.value ? study.translations.value[word.value.word] ?? [] : [])
const labels: Record<StudyMode, string> = { frequency: '按频率刷', random: '随机刷', unknown: '只刷不会', fuzzy: '只刷模糊', review: '复习模式' }

function next() {
  showInfo.value = false
  rank.value = study.nextRank(props.mode)
  if (rank.value) study.trackView(rank.value)
}
function mark(status: Exclude<WordStatus, 'new'>) {
  if (rank.value) study.setStatus(rank.value, status)
  next()
}
function pronounce(slow = false) {
  if (word.value) speakWord(word.value.word, { voiceURI: study.state.settings.voiceURI, slow })
}
function keyboard(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) return
  if (event.key === '1') mark('unknown')
  if (event.key === '2') mark('fuzzy')
  if (event.key === '3') mark('known')
  if (event.code === 'Space') { event.preventDefault(); showInfo.value = !showInfo.value }
  if (event.key === 'Enter') next()
}
onMounted(() => { next(); window.addEventListener('keydown', keyboard) })
onBeforeUnmount(() => window.removeEventListener('keydown', keyboard))
</script>

<template>
  <main class="study-page">
    <header class="study-header"><button class="back-button" @click="emit('close')">← 返回</button><span>{{ labels[mode] }}</span><span v-if="word">{{ word.rank }} / {{ study.words.value.length }}</span></header>
    <section v-if="word" class="word-stage">
      <p class="word-label">{{ study.getProgress(word.rank).status === 'new' ? '新词' : study.getProgress(word.rank).status }}</p>
      <h1 lang="en">{{ word.word }}</h1>
      <div v-if="ipa.length" class="phonetic-line" aria-label="美式国际音标"><span>US IPA</span><strong lang="en">/{{ ipa.join('/ · /') }}/</strong></div>
      <button class="listen-button" @click="pronounce()"><span>◖</span> 系统发音</button>
      <p class="voice-note">由本机浏览器语音提供，可在设置中切换</p>
      <button class="reveal-button" :aria-expanded="showInfo" @click="showInfo = !showInfo">{{ showInfo ? '收起信息' : '显示信息' }}</button>
      <div v-if="showInfo" class="word-info">
        <div class="definition-block"><p>词频排名 <strong>{{ word.rank }}</strong></p><template v-if="translation.length"><span>中文释义</span><ul><li v-for="item in translation" :key="item">{{ item }}</li></ul></template><p v-else class="missing-definition">暂无本地中文释义，可使用查词。</p></div>
        <div class="word-actions"><button @click="pronounce()">发音</button><button @click="pronounce(true)">慢速</button><a :href="dictionaryUrl(word.word)" target="_blank" rel="noreferrer">查词 ↗</a></div>
      </div>
    </section>
    <section v-else class="empty-stage"><h1>这里暂时没有词</h1><p>先在首页刷几个词，或换一个更大的词库范围。</p><button class="primary-action" @click="emit('close')">回到首页</button></section>
    <footer v-if="word" class="answer-bar"><button class="unknown" @click="mark('unknown')">不会 <kbd>1</kbd></button><button class="fuzzy" @click="mark('fuzzy')">模糊 <kbd>2</kbd></button><button class="known" @click="mark('known')">认识 <kbd>3</kbd></button></footer>
    <p class="shortcut-tip">Space 显示信息 · Enter 下一个</p>
  </main>
</template>
