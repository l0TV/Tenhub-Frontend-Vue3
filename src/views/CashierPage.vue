<script setup>
import { computed } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  cashierOrder,
  cashierLoading,
  cashierError,
  alipayLoading,
  alipayError,
  loadCashierOrder,
  payWithAlipay,
  goHome,
  openOrders,
  formatPrice,
} = useMallAppContext()
const orderItems = computed(() => Array.isArray(cashierOrder.value?.items) ? cashierOrder.value.items : [])
const totalQuantity = computed(() => orderItems.value.reduce((sum, item) => sum + (Number(item?.skuQuantity) || 0), 0))
const orderSn = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('orderSn') || params.get('out_trade_no') || ''
}
const paymentReturnStatus = new URLSearchParams(window.location.search).get('trade_status') || ''
const isPending = computed(() => Number(cashierOrder.value?.status) === 0)
// 2 was used for online payment by older frontend builds; keep those orders payable.
const isAlipayOrder = computed(() => [1, 2].includes(Number(cashierOrder.value?.payType)))
const statusText = computed(() => {
  if (isPending.value && paymentReturnStatus === 'TRADE_SUCCESS') return '支付宝已返回，订单状态确认中'
  return isPending.value ? '待付款' : '订单状态已更新'
})
const paymentReturnNotice = computed(() => {
  if (paymentReturnStatus === 'TRADE_SUCCESS' || paymentReturnStatus === 'TRADE_FINISHED') {
    return isPending.value ? '支付结果已返回，订单状态正在同步，请稍候刷新。' : '支付宝支付成功，订单已更新。'
  }
  if (paymentReturnStatus) return '支付宝支付未完成，可重新发起支付。'
  return ''
})
const startAlipayPayment = () => payWithAlipay(cashierOrder.value?.orderSn || orderSn())
</script>

<template>
  <main class="cashier-page">
    <header class="cashier-header"><div class="page-width"><button class="cashier-brand" @click="goHome"><img src="/index-img/logo.png" alt="拾汇商城" /><span>收银台</span></button><button class="cashier-orders" @click="openOrders">我的订单</button></div></header>
    <section class="page-width cashier-main">
      <div v-if="cashierLoading" class="cashier-state"><span class="orders-spinner"></span>正在读取订单…</div>
      <div v-else-if="cashierError" class="cashier-state error"><p>{{ cashierError }}</p><button @click="loadCashierOrder(orderSn())">重新加载</button></div>
      <template v-else-if="cashierOrder">
        <div class="cashier-success"><span>✓</span><div><h1>订单提交成功</h1><p>订单号：{{ cashierOrder.orderSn }}　{{ statusText }}</p></div></div>
        <section class="cashier-panel"><header><h2>订单金额</h2><strong>¥{{ formatPrice(cashierOrder.payAmount) }}</strong></header><div class="cashier-meta"><span>商品 {{ totalQuantity }} 件</span><span>收货人 {{ cashierOrder.receiverName || '未填写' }}</span><span>{{ cashierOrder.receiverProvince }} {{ cashierOrder.receiverCity }} {{ cashierOrder.receiverRegion }}</span></div><div class="cashier-payment-box"><template v-if="isPending && isAlipayOrder"><b>使用支付宝完成付款</b><p>支付完成后请等待订单状态同步。</p><button class="cashier-pay-button" :disabled="alipayLoading" @click="startAlipayPayment"><span>▣</span>{{ alipayLoading ? '正在跳转支付宝…' : '支付宝付款' }}</button><p v-if="alipayError" class="cashier-payment-error">{{ alipayError }}</p><p v-if="paymentReturnNotice" class="cashier-payment-notice">{{ paymentReturnNotice }}</p></template><template v-else-if="isPending"><b>货到付款订单</b><p>商品送达时请按配送员提示完成付款。</p><button @click="openOrders">返回我的订单</button></template><template v-else><b class="cashier-paid-title">订单已完成支付</b><p>{{ paymentReturnNotice || '感谢您的购买，我们会尽快为您安排发货。' }}</p><button @click="openOrders">返回我的订单</button></template></div></section>
        <section class="cashier-items"><h2>商品清单</h2><div v-for="item in orderItems" :key="item.id || item.skuId" class="cashier-item"><span>{{ item.skuName || '商品' }}</span><em>×{{ item.skuQuantity }}</em><b>¥{{ formatPrice(item.realAmount) }}</b></div></section>
      </template>
    </section>
  </main>
</template>
