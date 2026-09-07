<script setup>
import { computed, ref } from 'vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  orderConfirm,
  orderConfirmLoading,
  orderConfirmError,
  orderSelectedAddressId,
  orderPayType,
  orderFreight,
  orderFreightLoading,
  orderFreightError,
  orderAddressSaving,
  orderSubmitting,
  normalizeImageUrl,
  formatPrice,
  loadOrderConfirm,
  selectOrderAddress,
  saveOrderAddress,
  submitOrder,
  backToCart,
  goHome,
  showToast,
} = useMallAppContext()

const showAddressModal = ref(false)
const showAllAddresses = ref(false)
const addressForm = ref({
  name: '',
  phone: '',
  province: '',
  city: '',
  region: '',
  detailAddress: '',
  postCode: '',
  defaultStatus: 0,
})
const orderNote = ref('')

const addresses = computed(() => orderConfirm.value?.memberReceiveAddresses || [])
const visibleAddresses = computed(() => showAllAddresses.value ? addresses.value : addresses.value.slice(0, 4))
const items = computed(() => orderConfirm.value?.orderItems || [])
const merchandiseTotal = computed(() => Number(orderConfirm.value?.totalPrice) || items.value.reduce(
  (sum, item) => sum + (Number(item.price) || 0) * (Number(item.count) || 0),
  0,
))
const pointDiscount = computed(() => Math.max(0, merchandiseTotal.value - (Number(orderConfirm.value?.payPrice) || merchandiseTotal.value)))
const freight = computed(() => Number(orderFreight.value) || 0)
const payableTotal = computed(() => Math.max(0, (Number(orderConfirm.value?.payPrice) || merchandiseTotal.value) + freight.value))
const selectedAddress = computed(() => addresses.value.find(
  (address) => String(address?.id) === String(orderSelectedAddressId.value),
) || null)
const selectedItemCount = computed(() => items.value.reduce((sum, item) => sum + (Number(item.count) || 0), 0))
const unavailableCount = computed(() => items.value.filter((item) => {
  const value = orderConfirm.value?.stocks?.[item.skuId] ?? orderConfirm.value?.stocks?.[String(item.skuId)]
  return value === false || value === 'false'
}).length)

const addressText = (address) => [address?.province, address?.city, address?.region, address?.detailAddress]
  .filter(Boolean)
  .join(' ')
const maskPhone = (phone) => {
  const value = String(phone || '')
  return value.length >= 7 ? `${value.slice(0, 3)}****${value.slice(-4)}` : value
}
const itemTotal = (item) => (Number(item.price) || 0) * (Number(item.count) || 0)
const stockAvailable = (item) => {
  const value = orderConfirm.value?.stocks?.[item.skuId] ?? orderConfirm.value?.stocks?.[String(item.skuId)]
  return value !== false && value !== 'false'
}
const openAddressModal = () => {
  addressForm.value = {
    name: '', phone: '', province: '', city: '', region: '', detailAddress: '', postCode: '', defaultStatus: 0,
  }
  showAddressModal.value = true
}
const closeAddressModal = () => {
  if (!orderAddressSaving.value) showAddressModal.value = false
}
const submitAddress = async () => {
  const form = addressForm.value
  if (![form.name, form.phone, form.province, form.city, form.region, form.detailAddress].every((value) => String(value || '').trim())) {
    showToast('请完整填写收货地址')
    return
  }
  if (!/^1\d{10}$/.test(String(form.phone).trim())) {
    showToast('请输入正确的手机号码')
    return
  }
  const saved = await saveOrderAddress(form)
  if (saved) {
    showAddressModal.value = false
    showAllAddresses.value = true
  }
}
</script>

<template>
  <div class="checkout-page">
    <header class="checkout-header">
      <div class="checkout-header-inner page-width">
        <button class="checkout-brand" aria-label="返回首页" @click="goHome">
          <img src="/index-img/logo.png" alt="拾汇商城" />
          <span>结算页</span>
        </button>
        <div class="checkout-progress" aria-label="结算进度">
          <div class="checkout-progress-step done"><i>✓</i><span>1.购物车</span></div>
          <b></b>
          <div class="checkout-progress-step current"><i>2</i><span>2.填写核对订单信息</span></div>
          <b></b>
          <div class="checkout-progress-step"><i>3</i><span>3.成功提交订单</span></div>
        </div>
      </div>
    </header>

    <main class="page-width checkout-main">
      <div class="checkout-title-row">
        <div>
          <p class="checkout-kicker">CHECKOUT</p>
          <h1>填写并核对订单信息</h1>
          <p class="checkout-kicker" style="margin-top: 10px;">温馨提示：若您多开订单提交结算页，只能提交最后一个打开的页面。实际提交的购买物品项以购物车数据为准。</p>
        </div>
        <button class="checkout-back-link" @click="backToCart">返回修改购物车 <span>›</span></button>
      </div>

      <div v-if="orderConfirmLoading && !orderConfirm" class="checkout-state loading">
        <span class="checkout-spinner"></span>
        正在读取订单信息…
      </div>
      <div v-else-if="orderConfirmError && !orderConfirm" class="checkout-state error">
        <p>{{ orderConfirmError }}</p>
        <button @click="loadOrderConfirm(true)">重新加载</button>
      </div>
      <div v-else-if="!items.length" class="checkout-state empty">
        <div class="checkout-empty-icon">🧾</div>
        <h2>暂无可结算商品</h2>
        <p>请回到购物车选择需要购买的商品。</p>
        <button class="checkout-primary" @click="backToCart">返回购物车</button>
      </div>
      <template v-else>
        <section class="checkout-card checkout-address-card">
          <div class="checkout-card-heading">
            <h2>收货人信息</h2>
            <button class="checkout-add-address" @click="openAddressModal"><span>＋</span>新增收货地址</button>
          </div>
          <div v-if="!addresses.length" class="checkout-no-address">
            <span class="checkout-no-address-icon">⌖</span>
            <div><b>还没有收货地址</b><p>添加地址后才能配送商品</p></div>
            <button @click="openAddressModal">添加地址</button>
          </div>
          <div v-else class="checkout-address-grid">
            <button
              v-for="address in visibleAddresses"
              :key="address.id"
              class="checkout-address-item"
              :class="{ selected: String(address.id) === String(orderSelectedAddressId) }"
              @click="selectOrderAddress(address.id)"
            >
              <span class="checkout-address-check">✓</span>
              <span class="checkout-address-name">{{ address.name || '收货人' }}</span>
              <span class="checkout-address-phone">{{ maskPhone(address.phone) }}</span>
              <span v-if="Number(address.defaultStatus) === 1" class="checkout-default-tag">默认</span>
              <span class="checkout-address-detail">{{ addressText(address) }}</span>
              <span class="checkout-address-action">选择</span>
            </button>
          </div>
          <button v-if="addresses.length > 4" class="checkout-more-address" @click="showAllAddresses = !showAllAddresses">
            {{ showAllAddresses ? '收起地址' : `更多地址（${addresses.length - 4}）` }} <span>{{ showAllAddresses ? '⌃' : '⌄' }}</span>
          </button>
        </section>

        <section class="checkout-card checkout-payment-card">
          <div class="checkout-section-heading"><h2>支付方式</h2><span>订单提交后可选择支付渠道</span></div>
          <div class="checkout-payment-options">
            <label class="checkout-payment-option" :class="{ selected: orderPayType === 'online' }">
              <input v-model="orderPayType" type="radio" value="online" />
              <span class="payment-option-icon">▣</span><b>在线支付</b><small>支付宝</small>
            </label>
            <label class="checkout-payment-option" :class="{ selected: orderPayType === 'cod' }">
              <input v-model="orderPayType" type="radio" value="cod" />
              <span class="payment-option-icon">▤</span><b>货到付款</b><small>配送范围以实际为准</small>
            </label>
          </div>
        </section>

        <section class="checkout-card checkout-delivery-card">
          <div class="checkout-section-heading"><h2>配送清单</h2><span>共 {{ selectedItemCount }} 件商品</span></div>
          <div class="checkout-delivery-head"><span>配送方式</span><span>商品信息</span><span>单价</span><span>数量</span><span>小计</span></div>
          <div class="checkout-delivery-method"><span class="delivery-method-tag">拾汇配送</span><b>普通快递</b><em>预计 1–3 个工作日送达</em></div>
          <div v-for="item in items" :key="item.skuId" class="checkout-item" :class="{ unavailable: !stockAvailable(item) }">
            <div class="checkout-item-image"><img :src="normalizeImageUrl(item.image)" :alt="item.title || '商品图片'" /></div>
            <div class="checkout-item-info"><h3>{{ item.title || '商品' }}</h3><p v-if="item.skuAttr?.length">{{ item.skuAttr.join(' · ') }}</p><span v-if="stockAvailable(item)" class="checkout-stock good">有货</span><span v-else class="checkout-stock bad">库存不足</span></div>
            <div class="checkout-item-price">¥{{ formatPrice(item.price) }}</div>
            <div class="checkout-item-count">×{{ item.count }}</div>
            <div class="checkout-item-total">¥{{ formatPrice(itemTotal(item)) }}</div>
          </div>
          <label class="checkout-note"><span>订单备注</span><input v-model="orderNote" maxlength="100" placeholder="给商家留言（选填）" /><em>{{ orderNote.length }}/100</em></label>
        </section>

        <section class="checkout-card checkout-extra-card">
          <div class="checkout-extra-row"><b>发票信息</b><span>不开发票</span><button @click="showToast('发票服务即将开放')">修改</button></div>
          <div class="checkout-extra-row"><b>优惠券</b><span class="muted">暂无可用优惠券</span><button @click="showToast('优惠券服务即将开放')">查看</button></div>
        </section>

        <section class="checkout-summary-card">
          <div class="checkout-summary-main">
            <div class="checkout-summary-address" v-if="selectedAddress"><span class="summary-pin">⌖</span><div><b>配送至：{{ selectedAddress.name }} {{ maskPhone(selectedAddress.phone) }}</b><p>{{ addressText(selectedAddress) }}</p></div></div>
            <div v-else class="checkout-summary-address missing"><span class="summary-pin">!</span><div><b>请选择收货地址</b><p>请先添加或选择收货地址</p></div></div>
            <div class="checkout-summary-fields"><span>商品金额 <b>¥{{ formatPrice(merchandiseTotal) }}</b></span><span>运费 <b v-if="orderFreightLoading">计算中…</b><b v-else>¥{{ formatPrice(freight) }}</b></span><span>积分抵扣 <b class="discount">-¥{{ formatPrice(pointDiscount) }}</b></span></div>
          </div>
          <div class="checkout-summary-bottom">
            <p v-if="orderFreightError" class="checkout-freight-error">{{ orderFreightError }}，暂按 ¥0.00 计入</p>
            <p v-if="unavailableCount" class="checkout-stock-error">有 {{ unavailableCount }} 件商品库存不足，请返回购物车调整</p>
            <span>应付总额：</span><strong><i>¥</i>{{ formatPrice(payableTotal) }}</strong><button class="checkout-submit" :disabled="!selectedAddress || unavailableCount > 0 || orderSubmitting" @click="submitOrder(orderNote)">{{ orderSubmitting ? '提交中…' : '提交订单' }}</button>
          </div>
        </section>
      </template>
    </main>

    <footer class="checkout-footer"><div class="page-width"><span>拾汇商城 · 安全购物</span><span>隐私保护　|　服务条款　|　帮助中心</span></div></footer>

    <div v-if="showAddressModal" class="address-modal-backdrop" @click.self="closeAddressModal">
      <form class="address-modal" @submit.prevent="submitAddress">
        <div class="address-modal-head"><div><p>DELIVERY ADDRESS</p><h2>新增收货地址</h2></div><button type="button" aria-label="关闭" @click="closeAddressModal">×</button></div>
        <div class="address-form-grid">
          <label><span>收货人</span><input v-model="addressForm.name" maxlength="20" placeholder="请输入姓名" /></label>
          <label><span>手机号码</span><input v-model="addressForm.phone" inputmode="tel" maxlength="11" placeholder="请输入手机号码" /></label>
          <label><span>省 / 直辖市</span><input v-model="addressForm.province" maxlength="20" placeholder="例如：北京市" /></label>
          <label><span>城市</span><input v-model="addressForm.city" maxlength="20" placeholder="例如：北京市" /></label>
          <label><span>区 / 县</span><input v-model="addressForm.region" maxlength="20" placeholder="例如：朝阳区" /></label>
          <label><span>邮编（选填）</span><input v-model="addressForm.postCode" maxlength="10" placeholder="邮政编码" /></label>
          <label class="full"><span>详细地址</span><input v-model="addressForm.detailAddress" maxlength="100" placeholder="街道、门牌号、小区、楼栋等" /></label>
        </div>
        <label class="address-default-check"><input v-model="addressForm.defaultStatus" type="checkbox" :true-value="1" :false-value="0" />设为默认收货地址</label>
        <div class="address-modal-actions"><button type="button" @click="closeAddressModal">取消</button><button type="submit" class="save" :disabled="orderAddressSaving">{{ orderAddressSaving ? '保存中…' : '保存地址' }}</button></div>
      </form>
    </div>
  </div>
</template>
