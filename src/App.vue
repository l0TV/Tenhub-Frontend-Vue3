<script setup>
import { provide } from 'vue'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import CustomerServiceWidget from './components/CustomerServiceWidget.vue'
import ToastMessage from './components/ToastMessage.vue'
import { mallAppKey } from './composables/mallContext'
import { useMallApp } from './composables/useMallApp'
import AuthPage from './views/AuthPage.vue'
import CartPage from './views/CartPage.vue'
import HomePage from './views/HomePage.vue'
import OrderConfirmPage from './views/OrderConfirmPage.vue'
import OrdersPage from './views/OrdersPage.vue'
import CashierPage from './views/CashierPage.vue'
import ProductDetailPage from './views/ProductDetailPage.vue'
import SearchPage from './views/SearchPage.vue'
import SeckillPage from './views/SeckillPage.vue'
import './assets/styles/app.css'

const mallApp = useMallApp()

provide(mallAppKey, mallApp)
</script>

<template>
  <div class="app-shell">
    <template v-if="mallApp.page.value === 'checkout'">
      <OrderConfirmPage />
    </template>
    <template v-else-if="mallApp.page.value === 'cashier'">
      <CashierPage />
    </template>
    <template v-else>
      <AppHeader />
      <HomePage v-if="mallApp.page.value === 'home'" />
      <SeckillPage v-else-if="mallApp.page.value === 'seckill'" />
      <ProductDetailPage v-else-if="mallApp.page.value === 'item'" />
      <CartPage v-else-if="mallApp.page.value === 'cart'" />
      <OrdersPage v-else-if="mallApp.page.value === 'orders'" />
      <AuthPage v-else-if="mallApp.page.value === 'login' || mallApp.page.value === 'register'" />
      <SearchPage v-else />
      <AppFooter />
    </template>
    <ToastMessage />
    <!-- 智能客服浮窗：下单、收银等页面同样可用 -->
    <CustomerServiceWidget />
  </div>
</template>
