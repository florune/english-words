import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'English Words',
        short_name: 'English Words',
        description: '一个随时打开、随手刷几分钟的英语高频词工具。',
        theme_color: '#2457d6',
        background_color: '#f7f8fb',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,ico,png}'],
        navigateFallback: '/index.html'
      }
    })
  ]
})
