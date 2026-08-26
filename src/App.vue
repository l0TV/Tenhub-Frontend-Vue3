<script setup>
import { provide } from 'vue'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import ToastMessage from './components/ToastMessage.vue'
import { mallAppKey } from './composables/mallContext'
import { useMallApp } from './composables/useMallApp'
import AuthPage from './views/AuthPage.vue'
import HomePage from './views/HomePage.vue'
import ProductDetailPage from './views/ProductDetailPage.vue'
import SearchPage from './views/SearchPage.vue'
import './assets/styles/app.css'

const mallApp = useMallApp()

provide(mallAppKey, mallApp)
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <HomePage v-if="mallApp.page.value === 'home'" />
    <ProductDetailPage v-else-if="mallApp.page.value === 'item'" />
    <AuthPage v-else-if="mallApp.page.value === 'login' || mallApp.page.value === 'register'" />
    <SearchPage v-else />
    <AppFooter />
    <ToastMessage />
  </div>
</template>
