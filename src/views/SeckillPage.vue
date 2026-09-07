<script setup>
import { computed, ref } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  seckillItems,
  seckillLoading,
  seckillError,
  seckillActionSkuId,
  seckillCountdown,
  isSeckillActive,
  seckillCountdownFor,
  navigate,
  openProduct,
  loadSeckillItems,
  submitSeckill,
  formatPrice,
} = useMallAppContext()

const quantities = ref({})
const currentItems = computed(() => [...seckillItems.value].sort((left, right) => {
  const leftActive = isSeckillActive(left)
  const rightActive = isSeckillActive(right)
  return Number(rightActive) - Number(leftActive) || Number(left.seckillSort) - Number(right.seckillSort)
}))
const sessionGroups = computed(() => {
  const groups = new Map()
  currentItems.value.forEach((item) => {
    const key = String(item.promotionSessionId)
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.promotionSessionId,
        name: item.sessionName || `秒杀场次 ${item.promotionSessionId}`,
        startTime: item.startTime,
        endTime: item.endTime,
        items: [],
      })
    }
    groups.get(key).items.push(item)
  })
  return [...groups.values()].sort((left, right) => left.endTime - right.endTime)
})
const itemTitle = (item) => item?.skuInfo?.skuTitle || item?.skuInfo?.skuName || `秒杀商品 ${item?.skuId || ''}`
const itemImage = (item) => item?.skuInfo?.skuDefaultImg || '/index-img/section_second_list_img1.jpg'
const isActive = isSeckillActive
const itemStatus = (item) => isActive(item) ? '立即抢购' : item?.startTime > Date.now() ? '即将开始' : '已结束'
const buy = (item) => submitSeckill(item, quantities.value[item.skuId] || 1)
</script>

<template>
  <main class="page-width seckill-page">
    <section class="seckill-hero">
      <div>
        <span class="seckill-kicker">TENHUB · LIMITED TIME</span>
        <h1>限时秒杀</h1>
        <p>精选好物限量直降，抢到就是赚到</p>
      </div>
      <div class="seckill-clock">
        <span>{{ seckillCountdown.status }}</span>
        <strong>{{ seckillCountdown.hours }}<i>:</i>{{ seckillCountdown.minutes }}<i>:</i>{{ seckillCountdown.seconds }}</strong>
        <small>最近场次倒计时</small>
      </div>
    </section>

    <div class="seckill-toolbar">
      <div><b>正在抢购</b><span>{{ currentItems.length }} 件限量好物</span></div>
      <button class="outline-button" :disabled="seckillLoading" @click="loadSeckillItems(true)">↻ 刷新活动</button>
    </div>

    <div v-if="seckillError" class="seckill-state error">{{ seckillError }} <button @click="loadSeckillItems(true)">重试</button></div>
    <div v-else-if="seckillLoading && !currentItems.length" class="seckill-grid">
      <article v-for="index in 6" :key="index" class="seckill-product skeleton-product"><div></div><i></i><i></i></article>
    </div>
    <div v-else-if="!currentItems.length" class="seckill-state empty"><b>当前没有进行中的秒杀活动</b><span>活动开始后，商品会自动展示在这里</span><button @click="navigate('/')">返回首页</button></div>
    <div v-else class="seckill-session-list">
      <section v-for="session in sessionGroups" :key="session.id" class="seckill-session-block">
        <header class="seckill-session-heading"><div><b>{{ session.name }}</b><span>{{ session.items.length }} 件商品</span></div><div class="session-countdown"><span>{{ seckillCountdownFor(session).status }}</span><strong>{{ seckillCountdownFor(session).text }}</strong><small>后结束</small></div></header>
        <div class="seckill-grid">
          <article v-for="item in session.items" :key="`${item.promotionSessionId}-${item.skuId}`" class="seckill-product">
            <button class="product-image" @click="openProduct(item.skuId)"><img :src="itemImage(item)" :alt="itemTitle(item)" /></button>
            <div class="product-copy">
              <h2>{{ itemTitle(item) }}</h2>
              <p>{{ item.skuInfo?.skuSubtitle || item.skuInfo?.skuDesc || '限时直降，数量有限' }}</p>
              <div class="product-price"><strong>¥{{ formatPrice(item.seckillPrice) }}</strong><del v-if="item.skuInfo?.price">¥{{ formatPrice(item.skuInfo.price) }}</del></div>
              <div class="stock-line"><span>每人限购 {{ item.seckillLimit }} 件</span><span v-if="item.seckillCount">本场限量 {{ item.seckillCount }} 件</span><span v-else>已售罄</span></div>
              <div class="product-actions">
                <div class="quantity-stepper"><button @click="quantities[item.skuId] = Math.max(1, (quantities[item.skuId] || 1) - 1)">−</button><span>{{ quantities[item.skuId] || 1 }}</span><button @click="quantities[item.skuId] = Math.min(item.seckillLimit, (quantities[item.skuId] || 1) + 1)">＋</button></div>
                <button class="seckill-buy" :disabled="!isActive(item) || !item.seckillCount || seckillActionSkuId === item.skuId" @click="buy(item)">{{ seckillActionSkuId === item.skuId ? '抢购中…' : itemStatus(item) }}</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>
