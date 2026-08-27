<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardView from './components/DashboardView.vue'
import SettingsView from './components/SettingsView.vue'
import StudyView from './components/StudyView.vue'
import { useStudy } from './composables'
import type { StudyMode } from './types/word'

const study = useStudy()
const hash = ref(window.location.hash || '#/')
const mode = ref<StudyMode>('frequency')
const page = computed(() => hash.value === '#/settings' ? 'settings' : hash.value === '#/study' ? 'study' : 'home')
function go(value: '#/' | '#/settings' | '#/study') { window.location.hash = value; hash.value = value }
function start(value: StudyMode) { mode.value = value; go('#/study') }
function close() { go('#/') }
onMounted(() => {
  study.initialize()
  window.addEventListener('hashchange', () => hash.value = window.location.hash || '#/')
})
</script>

<template>
  <div v-if="!study.ready.value && !study.error.value" class="loading-screen"><span>English Words</span><i /></div>
  <div v-else-if="study.error.value" class="loading-screen"><strong>词库没有加载成功</strong><p>{{ study.error.value }}</p><button @click="study.initialize">重试</button></div>
  <DashboardView v-else-if="page === 'home'" :total="study.totals.value" :today="study.today.value" :streak="study.streak.value" :total-study-days="study.totalStudyDays.value" :range-max="study.state.rangeMax" :recent="study.recentProgress.value" @study="start" @range="study.setRange" @settings="go('#/settings')" />
  <StudyView v-else-if="page === 'study'" :mode="mode" @close="close" />
  <SettingsView v-else @close="close" />
</template>
