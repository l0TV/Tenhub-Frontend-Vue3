<script setup>
import { computed } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  orders,
  ordersLoading,
  ordersError,
  ordersPage,
  ordersTotalPages,
  ordersStatus,
  loadOrders,
  openOrders,
  goHome,
  formatPrice,
  navigate,
} = useMallAppContext()

const statusOptions = [
  { label: '全部订单', value: '' },
  { label: '待付款', value: '0' },
  { label: '已付款', value: '1' },
  { label: '配送中', value: '2' },
  { label: '已完成', value: '3' },
  { label: '已取消', value: '4' },
  { label: '售后中', value: '5' },
  { label: '售后完成', value: '6' },
]
const statusLabel = (status) => statusOptions.find((item) => String(item.value) === String(status))?.label || '订单'
const orderItems = (order) => Array.isArray(order?.items) ? order.items : []
const orderTitle = (order) => orderItems(order)[0]?.skuName || '拾汇商城订单'
const orderImage = (order) => orderItems(order)[0]?.skuPic || '/index-img/section_second_list_img1.jpg'
const itemCount = (order) => orderItems(order).reduce((sum, item) => sum + (Number(item?.skuQuantity) || 0), 0)
const canPay = (order) => Number(order?.status) === 0 && [1, 2].includes(Number(order?.payType))
const showPager = computed(() => ordersTotalPages.value > 1)
const selectStatus = (value) => loadOrders(1, value, false)
const changePage = (page) => {
  if (page < 1 || page > ordersTotalPages.value || page === ordersPage.value) return
  loadOrders(page, ordersStatus.value, false)
}
const viewCashier = (order) => navigate(`/cashier?orderSn=${encodeURIComponent(order.orderSn)}`)
</script>

<template>
  <main class="page-width orders-page">
    <div class="breadcrumb orders-breadcrumb"><a @click="goHome">首页</a><span>›</span><b>我的订单</b></div>
    <section class="orders-shell">
      <header class="orders-heading"><div><p>ACCOUNT / ORDERS</p><h1>我的订单</h1></div><button @click="goHome">继续购物 <span>›</span></button></header>
      <nav class="orders-tabs" aria-label="订单状态">
        <button v-for="option in statusOptions" :key="option.value" :class="{ active: String(ordersStatus) === String(option.value) }" @click="selectStatus(option.value)">{{ option.label }}</button>
      </nav>
      <div v-if="ordersLoading && !orders.length" class="orders-state"><span class="orders-spinner"></span>正在加载订单…</div>
      <div v-else-if="ordersError" class="orders-state error"><p>{{ ordersError }}</p><button @click="loadOrders(ordersPage, ordersStatus, true)">重新加载</button></div>
      <div v-else-if="!orders.length" class="orders-state empty"><div>□</div><h2>还没有相关订单</h2><p>去挑选一些喜欢的商品吧。</p><button @click="goHome">去逛逛</button></div>
      <div v-else class="orders-list">
        <article v-for="order in orders" :key="order.id || order.orderSn" class="order-card">
          <header><span>订单号：{{ order.orderSn }}</span><time>{{ order.createTime || '刚刚' }}</time><b :class="`status-${order.status}`">{{ statusLabel(order.status) }}</b></header>
          <div class="order-card-main"><img :src="orderImage(order)" alt="商品图片" /><div class="order-card-info"><h2>{{ orderTitle(order) }}</h2><p>{{ itemCount(order) }} 件商品<span v-if="orderItems(order).length > 1">，共 {{ orderItems(order).length }} 种</span></p></div><strong>¥{{ formatPrice(order.payAmount) }}</strong><div class="order-card-actions"><button v-if="canPay(order)" class="primary" @click="viewCashier(order)">去支付</button><button v-else @click="viewCashier(order)">查看订单</button></div></div>
        </article>
      </div>
      <footer v-if="showPager" class="orders-pagination"><button :disabled="ordersPage <= 1" @click="changePage(ordersPage - 1)">上一页</button><span>{{ ordersPage }} / {{ ordersTotalPages }}</span><button :disabled="ordersPage >= ordersTotalPages" @click="changePage(ordersPage + 1)">下一页</button></footer>
    </section>
  </main>
</template>
