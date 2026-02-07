// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    // '@nuxt/fonts', // не используется, вызывает warning
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts'
  ]
})