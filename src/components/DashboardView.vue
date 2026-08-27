<script setup lang="ts">
import type { StudyMode } from '../types/word'

defineProps<{
  total: { total: number; viewed: number; unknown: number; fuzzy: number; known: number }
  today: { viewed: number; marked: number }
  streak: number
  totalStudyDays: number
  rangeMax: number
  recent: Array<{ word: { rank: number; word: string } | undefined; progress: { status: string } }>
}>()
const emit = defineEmits<{ study: [StudyMode]; range: [number]; settings: [] }>()
const ranges = [1000, 3000, 5000, 10000, 25000]
</script>

<template>
  <main class="page dashboard">
    <header class="topbar">
      <div><p class="eyebrow">你的随手词库</p><h1>English Words</h1></div>
      <button class="icon-button" aria-label="设置" @click="emit('settings')">⚙</button>
    </header>

    <section class="summary-card">
      <div class="progress-line"><span>已浏览 {{ total.viewed }} / {{ total.total }}</span><span>{{ Math.round(total.viewed / total.total * 100) || 0 }}%</span></div>
      <div class="progress-track"><i :style="{ width: `${total.viewed / total.total * 100}%` }" /></div>
      <div class="stat-grid">
        <div><b>{{ total.known }}</b><span>认识</span></div><div><b>{{ total.fuzzy }}</b><span>模糊</span></div><div><b>{{ total.unknown }}</b><span>不会</span></div>
      </div>
    </section>

    <section class="action-stack" aria-label="开始学习">
      <button class="primary-action" @click="emit('study', 'frequency')"><span>继续刷词</span><small>从第 {{ rangeMax }} 范围内的进度继续</small><b>→</b></button>
      <button class="review-action" @click="emit('study', 'review')"><span>复习不会和模糊的词</span><b>↗</b></button>
      <div class="split-actions"><button @click="emit('study', 'random')">随机刷</button><button @click="emit('study', 'frequency')">按频率刷</button></div>
    </section>

    <section class="section-block">
      <div class="section-title"><h2>词库范围</h2><span>当前 1–{{ rangeMax }}</span></div>
      <div class="range-grid"><button v-for="max in ranges" :key="max" :class="{ selected: max === rangeMax }" @click="emit('range', max)">{{ max === 25000 ? '全部 25000' : `1–${max}` }}</button></div>
    </section>

    <section class="section-block compact-modes">
      <button @click="emit('study', 'unknown')">只刷不会 <span>{{ total.unknown }}</span></button>
      <button @click="emit('study', 'fuzzy')">只刷模糊 <span>{{ total.fuzzy }}</span></button>
    </section>

    <section class="section-block activity">
      <div class="section-title"><h2>这次的脚步</h2><span>连续 {{ streak }} 天 · 共 {{ totalStudyDays }} 天</span></div>
      <p>今天浏览 <strong>{{ today.viewed }}</strong> 词，标记 <strong>{{ today.marked }}</strong> 词</p>
      <div v-if="recent.length" class="recent-list"><span v-for="item in recent" :key="item.word?.rank" :class="item.progress.status">{{ item.word?.word }}</span></div>
      <p v-else class="muted">从一个词开始就好，不需要完成任务。</p>
    </section>
  </main>
</template>
