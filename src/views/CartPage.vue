<script setup>
import { computed } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  cart,
  cartCount,
  cartSelectedCount,
  cartSelectedTypeCount,
  cartSelectedTotal,
  cartLoading,
  cartError,
  cartActionSkuId,
  normalizeImageUrl,
  formatPrice,
  loadCart,
  goHome,
  openProduct,
  updateCartCount,
  changeCartQuantity,
  updateCartChecked,
  toggleAllCartItems,
  removeCartItem,
  clearCart,
  showToast,
  openCheckout,
} = useMallAppContext()

const allCartSelected = computed(() => cart.value.items.length > 0 && cart.value.items.every((item) => item.check))
const cartBusy = computed(() => cartActionSkuId.value != null)
const itemTotal = (item) => (Number(item.price) || 0) * (Number(item.count) || 0)
const isCountValid = (value) => Number.isFinite(Number(value)) && Number(value) >= 1
const handleCountChange = (item, event) => {
  const value = Number(event.target.value)
  updateCartCount(item.skuId, isCountValid(value) ? value : item.count)
}
const checkout = () => openCheckout()
</script>

<template>
  <main class="page-width cart-page">
    <div class="breadcrumb cart-breadcrumb"><a @click="goHome">首页</a><span>›</span><b>购物车</b></div>

    <section class="cart-shell">
      <div class="cart-heading">
        <div>
          <h1>我的购物车</h1>
          <p>把喜欢的好物一次带回家</p>
        </div>
        <button class="cart-continue" @click="goHome">继续购物 <span>›</span></button>
      </div>

      <div v-if="cartLoading && !cart.items.length" class="cart-state loading">
        <span class="cart-spinner"></span>正在加载购物车…
      </div>
      <div v-else-if="cartError && !cart.items.length" class="cart-state error">
        <p>{{ cartError }}</p><button @click="loadCart(true)">重新加载</button>
      </div>
      <div v-else-if="!cart.items.length" class="cart-state empty">
        <div class="cart-empty-icon">🛒</div>
        <h2>购物车还是空的</h2>
        <p>去挑几件喜欢的好物，购物车会在这里等你。</p>
        <button class="cart-primary" @click="goHome">去逛逛</button>
      </div>
      <template v-else>
        <div class="cart-toolbar">
          <label class="cart-check-all"><input type="checkbox" :checked="allCartSelected" :disabled="cartBusy" @change="toggleAllCartItems($event.target.checked)" /><span>全选</span></label>
          <span class="cart-toolbar-count">共 {{ cartCount }} 件商品</span>
          <button class="cart-clear" :disabled="cartBusy" @click="clearCart">清空购物车</button>
        </div>

        <div class="cart-list">
          <article v-for="item in cart.items" :key="item.skuId" class="cart-item" :class="{ unchecked: !item.check }">
            <label class="cart-item-check"><input type="checkbox" :checked="item.check" :disabled="cartBusy" @change="updateCartChecked(item.skuId, $event.target.checked)" /><span></span></label>
            <button class="cart-item-image" @click="openProduct(item.skuId)"><img :src="normalizeImageUrl(item.image)" :alt="item.title || '商品图片'" /></button>
            <div class="cart-item-info">
              <button class="cart-item-title" @click="openProduct(item.skuId)">{{ item.title || '商品' }}</button>
              <p v-if="item.skuAttr?.length" class="cart-item-attrs">{{ item.skuAttr.join(' · ') }}</p>
              <span class="cart-service-tag">拾汇自营</span>
            </div>
            <div class="cart-item-price">¥{{ formatPrice(item.price) }}</div>
            <div class="cart-item-quantity">
              <button :disabled="cartBusy || item.count <= 1" @click="changeCartQuantity(item, -1)">−</button>
              <input :value="item.count" type="number" min="1" max="9999" :disabled="cartBusy" @change="handleCountChange(item, $event)" />
              <button :disabled="cartBusy || item.count >= 9999" @click="changeCartQuantity(item, 1)">＋</button>
            </div>
            <div class="cart-item-total">¥{{ formatPrice(itemTotal(item)) }}</div>
            <button class="cart-item-remove" :disabled="cartBusy" @click="removeCartItem(item.skuId)">删除</button>
          </article>
        </div>

        <div class="cart-summary">
          <div class="cart-summary-selection"><span>已选 <b>{{ cartSelectedTypeCount }}</b> 类商品</span><span>共 <b>{{ cartSelectedCount }}</b> 件</span></div>
          <div class="cart-summary-total"><span>合计：</span><strong>¥{{ formatPrice(cartSelectedTotal) }}</strong><small>不含运费</small></div>
          <button class="cart-checkout" :disabled="!cartSelectedCount || cartBusy" @click="checkout">去结算</button>
        </div>
      </template>
    </section>
  </main>
</template>
