<script setup>
import { computed } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const { cashierOrder, cashierLoading, cashierError, loadCashierOrder, goHome, openOrders, formatPrice } = useMallAppContext()
const orderItems = computed(() => Array.isArray(cashierOrder.value?.items) ? cashierOrder.value.items : [])
const totalQuantity = computed(() => orderItems.value.reduce((sum, item) => sum + (Number(item?.skuQuantity) || 0), 0))
const statusText = computed(() => Number(cashierOrder.value?.status) === 0 ? '待付款' : '订单状态已更新')
const orderSn = () => new URLSearchParams(window.location.search).get('orderSn') || ''
</script>

<template>
  <main class="cashier-page">
    <header class="cashier-header"><div class="page-width"><button class="cashier-brand" @click="goHome"><img src="/index-img/logo.png" alt="拾汇商城" /><span>收银台</span></button><button class="cashier-orders" @click="openOrders">我的订单</button></div></header>
    <section class="page-width cashier-main">
      <div v-if="cashierLoading" class="cashier-state"><span class="orders-spinner"></span>正在读取订单…</div>
      <div v-else-if="cashierError" class="cashier-state error"><p>{{ cashierError }}</p><button @click="loadCashierOrder(orderSn())">重新加载</button></div>
      <template v-else-if="cashierOrder">
        <div class="cashier-success"><span>✓</span><div><h1>订单提交成功</h1><p>订单号：{{ cashierOrder.orderSn }}　{{ statusText }}</p></div></div>
        <section class="cashier-panel"><header><h2>订单金额</h2><strong>¥{{ formatPrice(cashierOrder.payAmount) }}</strong></header><div class="cashier-meta"><span>商品 {{ totalQuantity }} 件</span><span>收货人 {{ cashierOrder.receiverName || '未填写' }}</span><span>{{ cashierOrder.receiverProvince }} {{ cashierOrder.receiverCity }} {{ cashierOrder.receiverRegion }}</span></div><div class="cashier-placeholder"><b>支付功能暂未开放</b><p>订单已创建，支付渠道接入后可在此完成付款。</p><button @click="openOrders">返回我的订单</button></div></section>
        <section class="cashier-items"><h2>商品清单</h2><div v-for="item in orderItems" :key="item.id || item.skuId" class="cashier-item"><span>{{ item.skuName || '商品' }}</span><em>×{{ item.skuQuantity }}</em><b>¥{{ formatPrice(item.realAmount) }}</b></div></section>
      </template>
    </section>
  </main>
</template>
