<script setup>
import { computed } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  detailSku,
  detailError,
  detailItem,
  detailLoading,
  detailSkuId,
  detailImages,
  detailImageIndex,
  detailQuantity,
  detailSelectedAttrs,
  detailDescription,
  detailSeckillInfos,
  detailActiveSeckillInfos,
  detailSelectedSeckill,
  detailSelectedSeckillSessionId,
  seckillCountdownFor,
  selectDetailSeckillSession,
  isSeckillActive,
  seckillActionSkuId,
  cartActionSkuId,
  goHome,
  openSearch,
  loadDetail,
  formatPrice,
  saleAttrValueLabel,
  isSaleAttrValueAvailable,
  selectSaleAttr,
  showToast,
  addToCart,
  buyNow,
  buySelectedSeckill,
} = useMallAppContext()

const hasActiveSeckill = computed(() => detailActiveSeckillInfos.value.length > 0)
const displayedPrice = computed(() => hasActiveSeckill.value
  ? detailSelectedSeckill.value?.seckillPrice
  : detailSku.value.price)
const quantityLimit = computed(() => hasActiveSeckill.value
  ? Math.max(1, Number(detailSelectedSeckill.value?.seckillLimit) || 1)
  : 9999)
const purchaseBusy = computed(() => cartActionSkuId.value != null || seckillActionSkuId.value != null)
const sessionTiming = (session) => seckillCountdownFor(session)
const sessionTitle = (session) => session?.sessionName || `秒杀场次 ${session?.promotionSessionId || ''}`
const decrementQuantity = () => {
  detailQuantity.value = Math.max(1, (Number(detailQuantity.value) || 1) - 1)
}
const incrementQuantity = () => {
  detailQuantity.value = Math.min(quantityLimit.value, (Number(detailQuantity.value) || 1) + 1)
}
const normalBuy = () => buyNow(
  detailSku.value.skuId || detailSkuId.value,
  detailSku.value.skuTitle || detailSku.value.skuName || '商品',
  1,
)
</script>

<template>
  <main class="page-width detail-page">
    <div class="breadcrumb detail-breadcrumb"><a @click="goHome">首页</a><span>›</span><a @click="openSearch('')">全部商品</a><span>›</span><b>{{ detailSku.skuTitle || detailSku.skuName || '商品详情' }}</b></div>
    <div v-if="detailError && !detailItem" class="detail-state error">{{ detailError }}<button @click="loadDetail(detailSkuId)">重试</button></div>
    <template v-else-if="!detailItem">
      <section class="detail-main detail-skeleton" aria-label="正在加载商品详情">
        <div class="skeleton-gallery">
          <div class="skeleton-block skeleton-picture"></div>
          <div class="skeleton-thumbs"><i v-for="index in 5" :key="index" class="skeleton-block"></i></div>
        </div>
        <div class="skeleton-info"><i class="skeleton-block wide"></i><i class="skeleton-block medium"></i><i class="skeleton-block price"></i><i v-for="index in 4" :key="index" class="skeleton-block option"></i><span>正在加载商品详情...</span></div>
      </section>
      <section class="detail-tabs skeleton-tabs"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></section>
    </template>
    <template v-else>
      <section class="detail-main" :class="{ 'is-loading': detailLoading }">
        <div v-if="detailLoading" class="detail-loading-mask"><span class="detail-loading-spinner"></span>正在更新商品规格...</div>
        <div class="detail-gallery">
          <div class="detail-main-image"><img :src="detailImages[detailImageIndex]" :alt="detailSku.skuTitle" /></div>
          <div class="detail-thumbs"><button v-for="(image, index) in detailImages" :key="image + index" :class="{ active: index === detailImageIndex }" @click="detailImageIndex = index"><img :src="image" :alt="`商品图片${index + 1}`" /></button></div>
          <div class="detail-gallery-actions"><span>♡ 关注</span><span>分享</span></div>
        </div>
        <div class="detail-info">
          <h1>{{ detailSku.skuTitle || detailSku.skuName }}</h1>
          <p class="detail-subtitle">{{ detailSku.skuSubtitle || detailSku.skuDesc || '精选品质好物，放心选购' }}</p>
          <div class="detail-price" :class="{ 'is-seckill-price': hasActiveSeckill }"><span>¥</span>{{ formatPrice(displayedPrice) }}<del v-if="hasActiveSeckill">¥{{ formatPrice(detailSku.price) }}</del><del v-else-if="detailSku.marketPrice">¥{{ formatPrice(detailSku.marketPrice) }}</del></div>
          <div class="detail-promo" :class="{ 'is-seckill-promo': hasActiveSeckill }"><b>{{ hasActiveSeckill ? '秒杀价' : '拾汇价' }}</b><span>{{ hasActiveSeckill ? `${sessionTitle(detailSelectedSeckill)} · 限量抢购` : '限时优惠 · 正品保障 · 全场包邮' }}</span></div>
          <section v-if="detailSeckillInfos.length" class="detail-seckill-offers" aria-label="秒杀场次">
            <header><b>秒杀场次</b><span>同一商品可参与多个场次</span></header>
            <button v-for="session in detailSeckillInfos" :key="session.promotionSessionId" class="detail-seckill-offer" :class="{ selected: String(detailSelectedSeckillSessionId) === String(session.promotionSessionId), active: isSeckillActive(session) }" @click="selectDetailSeckillSession(session.promotionSessionId)">
              <span>{{ sessionTitle(session) }}</span><strong>¥{{ formatPrice(session.seckillPrice) }}</strong><small>{{ sessionTiming(session).status }} · {{ sessionTiming(session).text }}{{ sessionTiming(session).status === '进行中' ? ' 后结束' : '' }}</small>
            </button>
          </section>
          <div class="detail-meta">
            <span>累计销量：{{ detailSku.saleCount || 0 }}</span><span>配送至：北京</span><em :class="detailItem.hasStock ? 'sku-hasStock' : 'sku-noStock'">{{ detailItem.hasStock ? '有货' : '无货' }}</em>
          </div>
          <div v-for="attr in detailItem.saleAttrs || []" :key="attr.attrId" class="detail-option">
            <label>{{ attr.attrName }}：</label>
            <div>
              <button v-for="value in attr.attrValues || []" :key="saleAttrValueLabel(value)" :class="{ selected: detailSelectedAttrs[attr.attrId] === saleAttrValueLabel(value), unavailable: !isSaleAttrValueAvailable(attr.attrId, value) }" :title="isSaleAttrValueAvailable(attr.attrId, value) ? '' : '该选项会自动匹配其他可用规格'" @click="selectSaleAttr(attr.attrId, value)">{{ saleAttrValueLabel(value) }}</button>
            </div>
          </div>
          <div class="detail-buy-row"><label>数量：</label>
            <div class="quantity"><button @click="decrementQuantity">−</button><input v-model.number="detailQuantity" type="number" min="1" :max="quantityLimit" /><button @click="incrementQuantity">＋</button></div><button class="buy-now" :class="{ 'seckill-action': hasActiveSeckill }" :disabled="purchaseBusy || detailItem.hasStock === false" @click="hasActiveSeckill ? buySelectedSeckill() : normalBuy()">{{ purchaseBusy ? (hasActiveSeckill ? '抢购中…' : '购买中…') : hasActiveSeckill ? '立即抢购' : '立即购买' }}</button><button class="add-cart" :disabled="purchaseBusy" @click="addToCart(detailSku.skuId || detailSkuId, detailSku.skuTitle || detailSku.skuName || '商品', detailQuantity)">加入购物车</button>
          </div>
          <div class="detail-service"><span>✓ 七天无理由退货</span><span>✓ 极速发货</span><span>✓ 拾汇自营</span></div>
        </div>
      </section>
      <section class="detail-tabs">
        <div class="detail-tab-head"><button class="active">商品介绍</button><button>规格与包装</button><button>售后保障</button><button>商品评价（{{ detailSku.saleCount || 0 }}+）</button></div>
        <div class="detail-description">
          <div v-if="detailItem.spuBaseAttrGroups?.length" class="detail-attrs">
            <div v-for="group in detailItem.spuBaseAttrGroups" :key="group.groupName"><h3>{{ group.groupName }}</h3><p v-for="attr in group.attrGroups || []" :key="attr.attrName"><span>{{ attr.attrName }}</span>{{ attr.attrValue }}</p></div>
          </div>
          <div v-if="detailDescription" class="description-html"><img :src="detailDescription" alt="商品详情图" /></div>
          <p v-else class="muted">暂无图文详情</p>
        </div>
      </section>
    </template>
  </main>
</template>
