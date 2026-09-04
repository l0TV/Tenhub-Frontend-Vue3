import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Client } from '@stomp/stompjs'
import QRCode from 'qrcode'
import { useAuthSession } from '../services/authSession'

export function useMallApp() {
  const {
    isAuthenticated,
    currentMember,
    currentDisplayName,
    setAuthToken,
    clearAuthSession,
    setCurrentMember,
    authFetch,
  } = useAuthSession()
  const page = ref('home')
  const query = ref('')
  const searchInput = ref('')
  const emptyCart = () => ({ items: [], itemCount: 0, typeCount: 0, totalPrice: 0, discount: 0 })
  const cart = ref(emptyCart())
  const cartCount = computed(() => cart.value.items.reduce((sum, item) => sum + Math.max(0, Number(item?.count) || 0), 0))
  const cartSelectedCount = computed(() => cart.value.items
    .filter((item) => item?.check)
    .reduce((sum, item) => sum + Math.max(0, Number(item?.count) || 0), 0))
  const cartSelectedTypeCount = computed(() => cart.value.items.filter((item) => item?.check).length)
  const cartSelectedTotal = computed(() => cart.value.items
    .filter((item) => item?.check)
    .reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.count) || 0), 0))
  const cartLoading = ref(false)
  const cartError = ref('')
  const cartActionSkuId = ref(null)
  const emptyOrderConfirm = () => ({
    memberReceiveAddresses: [],
    orderItems: [],
    integration: 0,
    totalPrice: 0,
    payPrice: 0,
    stocks: {},
    orderToken: '',
  })
  const orderConfirm = ref(null)
  const orderConfirmLoading = ref(false)
  const orderConfirmError = ref('')
  const orderSelectedAddressId = ref(null)
  const orderPayType = ref('online')
  const orderFreight = ref(null)
  const orderFreightLoading = ref(false)
  const orderFreightError = ref('')
  const orderAddressSaving = ref(false)
  const orderSubmitting = ref(false)
  const orders = ref([])
  const ordersLoading = ref(false)
  const ordersError = ref('')
  const ordersPage = ref(1)
  const ordersTotalPages = ref(0)
  const ordersStatus = ref('')
  const cashierOrder = ref(null)
  const cashierLoading = ref(false)
  const cashierError = ref('')
  const activeSlide = ref(0)
  const sortBy = ref('')
  const selectedBrandId = ref(null)
  const selectedCatalogId = ref(null)
  const selectedAttrs = ref([])
  const minPrice = ref('')
  const maxPrice = ref('')
  const hasStock = ref(false)
  const showAllAttrs = ref(false)
  const categoryTree = ref([])
  const activeTopCategory = ref(null)
  const categoryMenuExpanded = ref(false)
  const searchResult = ref({ products: [], brands: [], catalogs: [], attrs: [], currentPage: 1, totalPages: 0, totalRecordNum: 0, navPages: [] })
  const isLoading = ref(false)
  const isCategoryLoading = ref(false)
  const categoryError = ref('')
  const apiError = ref('')
  const toast = ref('')
  const detailSkuId = ref(null)
  const detailItem = ref(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const detailImageIndex = ref(0)
  const detailQuantity = ref(1)
  const detailSelectedAttrs = ref({})
  const authMode = ref('login')
  const authForm = ref({ account: '', password: '', userName: '', email: '', code: '' })
  const authEmail = computed({
    get: () => authMode.value === 'login' ? authForm.value.account : authForm.value.email,
    set: (value) => {
      if (authMode.value === 'login') authForm.value.account = value
      else authForm.value.email = value
    },
  })
  const authSubmitting = ref(false)
  const authMessage = ref('')
  const authError = ref('')
  const authProfileLoading = ref(false)
  const rememberLogin = ref(false)
  const emailCodeSending = ref(false)
  const emailCountdown = ref(0)
  const wechatQrUrl = ref('')
  const wechatQrImage = ref('')
  const wechatLoading = ref(false)
  const wechatCallbackLoading = ref(false)
  let emailCountdownTimer
  let wechatCallbackKey = ''
  let wechatClient
  let carouselTimer
  let toastTimer
  let activeRequest
  let categoryRequest
  let detailRequest
  let orderConfirmRequest
  let orderFareRequest
  let ordersRequest
  let cashierRequest
  let routeListener

  const slides = [
    { image: '/index-img/lunbo1.png', eyebrow: '全球精选', title: '趁“澡”出发，放肆去买', sub: '部分 3 件 6 折' },
    { image: '/index-img/lunbo3.png', eyebrow: '拾汇品质生活', title: '好物集结，焕新日常', sub: '每周上新 · 限时优惠' },
    { image: '/index-img/lunbo6.png', eyebrow: '数码潮流', title: '科技好礼，低至 5 折', sub: '新品首发 · 会员专享' },
    { image: '/index-img/lunbo.png', eyebrow: '影迷专场', title: '英雄集结，拾汇好价', sub: '部分每满 199 减 100' },
  ]

  const navItems = ['秒杀', '优惠券', '闪购', '拍卖', '服饰', '超市', '生鲜', '全球购', '金融']

  const seckillProducts = [
    { image: 'section_second_list_img1.jpg', title: '花王 (Merries) 妙而舒 纸尿裤 大号 L54片', price: '83.90', old: '99.90' },
    { image: 'section_second_list_img2.jpg', title: '华为 Mate9 4GB+32GB 月光银 移动联通电信4G', price: '17.90', old: '29.90' },
    { image: 'section_second_list_img3.jpg', title: '超能 植翠低泡洗衣液 2kg 袋装', price: '20.70', old: '44.90' },
    { image: 'section_second_list_img4.jpg', title: '长城特选5年橡木桶解百纳干红葡萄酒', price: '399.00', old: '599.00' },
    { image: 'section_second_list_img5.jpg', title: '惠普暗影精灵游戏笔记本电脑 15.6英寸', price: '5999.00', old: '6499.00' },
  ]

  const sortOptions = [
    { label: '综合排序', value: '' },
    { label: '销量优先', value: 'saleCount_desc' },
    { label: '价格从低到高', value: 'skuPrice_asc' },
    { label: '价格从高到低', value: 'skuPrice_desc' },
  ]
  const homeCategories = computed(() => categoryMenuExpanded.value ? categoryTree.value : categoryTree.value.slice(0, 15))
  const brandOptions = computed(() => searchResult.value.brands || [])
  const catalogOptions = computed(() => searchResult.value.catalogs || [])
  const selectedBrandName = computed(() => brandOptions.value.find((brand) => String(brand.brandId) === String(selectedBrandId.value))?.brandName || '')
  const selectedCatalogName = computed(() => catalogOptions.value.find((catalog) => String(catalog.catalogId) === String(selectedCatalogId.value))?.catalogName || '')
  const currentSortLabel = computed(() => sortOptions.find((option) => option.value === sortBy.value)?.label || '综合排序')
  const selectedFilterCount = computed(() => Number(Boolean(selectedBrandId.value)) + Number(Boolean(selectedCatalogId.value)) + selectedAttrs.value.length + Number(Boolean(minPrice.value || maxPrice.value)) + Number(hasStock.value))
  const unselectedAttrs = computed(() => (searchResult.value.attrs || []).filter((attr) => !selectedAttrs.value.some((item) => item.startsWith(`${attr.attrId}_`))))
  const visibleAttrs = computed(() => showAllAttrs.value ? unselectedAttrs.value : unselectedAttrs.value.slice(0, 2))
  const hiddenAttrCount = computed(() => Math.max(0, unselectedAttrs.value.length - visibleAttrs.value.length))
  const selectedAttributeFilters = computed(() => selectedAttrs.value.map((encoded) => {
    const separator = encoded.indexOf('_')
    const attrId = separator > -1 ? encoded.slice(0, separator) : encoded
    const values = separator > -1 ? encoded.slice(separator + 1).split(':').filter(Boolean) : []
    const attr = (searchResult.value.attrs || []).find((item) => String(item.attrId) === String(attrId))
  return {
    encoded,
    label: `${attr?.attrName || `属性${attrId}`}：${values.join('、')}`,
  }
}))
const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const showToast = (message) => {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}
const normalizeCartItem = (item) => {
  if (!item || item.skuId == null) return null
  return {
    ...item,
    skuId: item.skuId,
    count: Math.max(1, Number(item.count) || 1),
    price: Number(item.price) || 0,
    check: item.check === true || item.check === 'true' || item.check === 1 || item.check === '1',
    skuAttr: Array.isArray(item.skuAttr) ? item.skuAttr : [],
  }
}
const normalizeCart = (payload) => {
  const items = (Array.isArray(payload?.items) ? payload.items : []).map(normalizeCartItem).filter(Boolean)
  return {
    ...emptyCart(),
    ...payload,
    items,
    discount: Number(payload?.discount) || 0,
    itemCount: items.filter((item) => item.check).reduce((sum, item) => sum + item.count, 0),
    typeCount: items.filter((item) => item.check).length,
    totalPrice: items.filter((item) => item.check).reduce((sum, item) => sum + item.price * item.count, 0),
  }
}
const cartApiError = (result, fallback) => result?.msg || result?.message || fallback
const normalizeOrderConfirmItem = (item) => {
  if (!item || item.skuId == null) return null
  const count = Math.max(1, Number(item.count) || 1)
  const price = Number(item.price) || 0
  return {
    ...item,
    skuId: item.skuId,
    count,
    price,
    totalPrice: Number.isFinite(Number(item.totalPrice)) ? Number(item.totalPrice) : price * count,
    skuAttr: Array.isArray(item.skuAttr) ? item.skuAttr : [],
  }
}
const normalizeOrderConfirm = (payload) => {
  const orderItems = (Array.isArray(payload?.orderItems) ? payload.orderItems : [])
    .map(normalizeOrderConfirmItem)
    .filter(Boolean)
  const calculatedTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalPrice = Number.isFinite(Number(payload?.totalPrice)) ? Number(payload.totalPrice) : calculatedTotal
  const payPrice = Number.isFinite(Number(payload?.payPrice)) ? Number(payload.payPrice) : totalPrice
  return {
    ...emptyOrderConfirm(),
    ...payload,
    memberReceiveAddresses: Array.isArray(payload?.memberReceiveAddresses) ? payload.memberReceiveAddresses : [],
    orderItems,
    integration: Math.max(0, Number(payload?.integration) || 0),
    totalPrice,
    payPrice,
    stocks: payload?.stocks && typeof payload.stocks === 'object' ? payload.stocks : {},
  }
}
const resetOrderConfirm = () => {
  orderConfirm.value = null
  orderConfirmError.value = ''
  orderSelectedAddressId.value = null
  orderFreight.value = null
  orderFreightError.value = ''
}
const selectedOrderAddress = () => orderConfirm.value?.memberReceiveAddresses?.find(
  (address) => String(address?.id) === String(orderSelectedAddressId.value),
) || null
const loadOrderFreight = async () => {
  orderFareRequest?.abort()
  const address = selectedOrderAddress()
  const items = orderConfirm.value?.orderItems || []
  if (!address?.id || !items.length) {
    orderFreight.value = null
    orderFreightError.value = ''
    orderFreightLoading.value = false
    return false
  }

  const request = new AbortController()
  orderFareRequest = request
  orderFreightLoading.value = true
  orderFreightError.value = ''
  try {
    const skuIds = [...new Set(items.map((item) => item.skuId).filter((skuId) => skuId != null))]
    const fares = await Promise.all(skuIds.map(async (skuId) => {
      const response = await authFetch(
        `${apiBase}/ware/wareinfo/fare?addrId=${encodeURIComponent(address.id)}&skuId=${encodeURIComponent(skuId)}`,
        { signal: request.signal, credentials: 'include' },
      )
      const payload = await response.json().catch(() => null)
      const value = Number(payload?.data ?? payload)
      if (!response.ok || !Number.isFinite(value) || value < 0) {
        throw new Error(payload?.msg || '运费计算失败')
      }
      return value
    }))
    if (orderFareRequest !== request) return false
    orderFreight.value = fares.reduce((sum, fare) => sum + fare, 0)
    return true
  } catch (error) {
    if (error.name === 'AbortError') return false
    if (orderFareRequest === request) {
      orderFreight.value = null
      orderFreightError.value = error.message || '运费暂时无法计算'
    }
    return false
  } finally {
    if (orderFareRequest === request) orderFreightLoading.value = false
  }
}
const loadOrderConfirm = async (notifyOnError = false) => {
  if (!isAuthenticated.value) {
    resetOrderConfirm()
    return false
  }
  orderConfirmRequest?.abort()
  const request = new AbortController()
  orderConfirmRequest = request
  orderConfirmLoading.value = true
  orderConfirmError.value = ''
  try {
    const response = await authFetch(`${apiBase}/order/order/confirm-data`, {
      signal: request.signal,
      credentials: 'include',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.data) {
      throw new Error(cartApiError(result, response.status === 401 ? '登录已过期，请重新登录' : '订单信息加载失败'))
    }
    if (orderConfirmRequest !== request) return false
    const payload = normalizeOrderConfirm(result.data)
    orderConfirm.value = payload
    const previousAddressStillExists = payload.memberReceiveAddresses.some(
      (address) => String(address?.id) === String(orderSelectedAddressId.value),
    )
    if (!previousAddressStillExists) {
      orderSelectedAddressId.value = payload.memberReceiveAddresses.find((address) => Number(address?.defaultStatus) === 1)?.id
        ?? payload.memberReceiveAddresses[0]?.id
        ?? null
    }
    await loadOrderFreight()
    return true
  } catch (error) {
    if (error.name === 'AbortError') return false
    if (orderConfirmRequest === request) {
      resetOrderConfirm()
      orderConfirmError.value = error.message || '订单信息加载失败'
      if (notifyOnError) showToast(orderConfirmError.value)
    }
    return false
  } finally {
    if (orderConfirmRequest === request) orderConfirmLoading.value = false
  }
}
const selectOrderAddress = (addressId) => {
  if (String(addressId) === String(orderSelectedAddressId.value)) return
  orderSelectedAddressId.value = addressId
  loadOrderFreight()
}
const saveOrderAddress = async (address) => {
  if (!isAuthenticated.value || orderAddressSaving.value) return false
  orderAddressSaving.value = true
  try {
    const response = await authFetch(`${apiBase}/member/memberreceiveaddress/put`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: String(address?.name || '').trim(),
        phone: String(address?.phone || '').trim(),
        province: String(address?.province || '').trim(),
        city: String(address?.city || '').trim(),
        region: String(address?.region || '').trim(),
        detailAddress: String(address?.detailAddress || '').trim(),
        postCode: String(address?.postCode || '').trim(),
        areacode: String(address?.areacode || '').trim(),
        defaultStatus: Number(address?.defaultStatus) === 1 ? 1 : 0,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0) throw new Error(cartApiError(result, '地址保存失败'))
    await loadOrderConfirm(false)
    showToast('收货地址已添加')
    return true
  } catch (error) {
    showToast(error.message || '地址保存失败')
    return false
  } finally {
    orderAddressSaving.value = false
  }
}
const openCheckout = () => {
  if (!isAuthenticated.value) {
    showToast('请先登录后再结算')
    navigate('/login')
    return false
  }
  if (!cartSelectedCount.value) {
    showToast('请先选择要结算的商品')
    return false
  }
  navigate('/order/confirm')
  return true
}
const backToCart = () => navigate('/cart')
const openOrders = () => {
  if (!isAuthenticated.value) {
    showToast('请先登录后查看订单')
    navigate('/login')
    return false
  }
  navigate('/orders')
  return true
}
const loadOrders = async (pageNum = ordersPage.value, status = ordersStatus.value, notifyOnError = false) => {
  if (!isAuthenticated.value) {
    orders.value = []
    return false
  }
  ordersRequest?.abort()
  const request = new AbortController()
  ordersRequest = request
  ordersLoading.value = true
  ordersError.value = ''
  try {
    const params = new URLSearchParams({ page: String(pageNum), limit: '8' })
    if (status) params.set('status', status)
    const response = await authFetch(`${apiBase}/order/order/my-list?${params.toString()}`, {
      signal: request.signal,
      credentials: 'include',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.page) {
      throw new Error(cartApiError(result, response.status === 401 ? '登录已过期，请重新登录' : '订单加载失败'))
    }
    if (ordersRequest !== request) return false
    const pageData = result.page
    orders.value = Array.isArray(pageData.list) ? pageData.list : []
    ordersPage.value = Number(pageData.currPage) || pageNum
    ordersTotalPages.value = Number(pageData.totalPage) || 0
    ordersStatus.value = status || ''
    return true
  } catch (error) {
    if (error.name === 'AbortError') return false
    if (ordersRequest === request) {
      orders.value = []
      ordersError.value = error.message || '订单加载失败'
      if (notifyOnError) showToast(ordersError.value)
    }
    return false
  } finally {
    if (ordersRequest === request) ordersLoading.value = false
  }
}
const loadCashierOrder = async (orderSn) => {
  if (!isAuthenticated.value || !orderSn) return false
  cashierRequest?.abort()
  const request = new AbortController()
  cashierRequest = request
  cashierLoading.value = true
  cashierError.value = ''
  cashierOrder.value = null
  try {
    const response = await authFetch(`${apiBase}/order/order/my/${encodeURIComponent(orderSn)}`, {
      signal: request.signal,
      credentials: 'include',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.data) {
      throw new Error(cartApiError(result, response.status === 404 ? '订单不存在或已失效' : '订单信息加载失败'))
    }
    if (cashierRequest !== request) return false
    cashierOrder.value = result.data
    return true
  } catch (error) {
    if (error.name === 'AbortError') return false
    if (cashierRequest === request) cashierError.value = error.message || '订单信息加载失败'
    return false
  } finally {
    if (cashierRequest === request) cashierLoading.value = false
  }
}
const submitOrder = async (note = '') => {
  if (orderSubmitting.value) return false
  if (!orderConfirm.value?.orderItems?.length) {
    showToast('没有可提交的商品，请返回购物车重新选择')
    return false
  }
  if (!selectedOrderAddress()) {
    showToast('请选择收货地址')
    return false
  }
  const outOfStock = orderConfirm.value.orderItems.find((item) => orderConfirm.value.stocks?.[item.skuId] === false
    || orderConfirm.value.stocks?.[String(item.skuId)] === false)
  if (outOfStock) {
    showToast(`“${String(outOfStock.title || '商品').slice(0, 18)}”库存不足`)
    return false
  }
  const freight = Number(orderFreight.value) || 0
  const payPrice = Math.max(0, (Number(orderConfirm.value.payPrice) || 0) + freight)
  orderSubmitting.value = true
  try {
    const response = await authFetch(`${apiBase}/order/order/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        addrId: selectedOrderAddress()?.id,
        payType: orderPayType.value === 'cod' ? 4 : 2,
        orderToken: orderConfirm.value.orderToken,
        payPrice,
        note: String(note || '').trim(),
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.data?.orderEntity?.orderSn) {
      throw new Error(cartApiError(result, '订单提交失败，请稍后重试'))
    }
    const orderSn = result.data.orderEntity.orderSn
    await loadCart(false)
    showToast('订单提交成功，正在进入收银台')
    navigate(`/cashier?orderSn=${encodeURIComponent(orderSn)}`)
    return true
  } catch (error) {
    if (error.name !== 'AbortError') showToast(error.message || '订单提交失败，请稍后重试')
    return false
  } finally {
    orderSubmitting.value = false
  }
}
const loadCart = async (notifyOnError = false) => {
  if (!isAuthenticated.value) {
    cart.value = emptyCart()
    cartError.value = ''
    return false
  }
  cartLoading.value = true
  cartError.value = ''
  try {
    const response = await authFetch(`${apiBase}/cart/cart`, { credentials: 'include' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.data) {
      throw new Error(cartApiError(result, response.status === 401 ? '登录已过期，请重新登录' : '购物车加载失败'))
    }
    cart.value = normalizeCart(result.data)
    return true
  } catch (error) {
    cart.value = emptyCart()
    cartError.value = error.message || '购物车加载失败'
    if (notifyOnError) showToast(cartError.value)
    return false
  } finally {
    cartLoading.value = false
  }
}
const runCartAction = async (skuId, request) => {
  const key = String(skuId)
  if (cartActionSkuId.value != null) return false
  cartActionSkuId.value = key
  try {
    const response = await request()
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0) {
      if (response.status === 401) {
        clearAuthSession()
        cart.value = emptyCart()
      }
      throw new Error(cartApiError(result, '购物车操作失败'))
    }
    await loadCart(false)
    return true
  } catch (error) {
    showToast(error.message || '购物车操作失败')
    return false
  } finally {
    cartActionSkuId.value = null
  }
}
const resetFilters = () => {
  selectedBrandId.value = null
  selectedCatalogId.value = null
  selectedAttrs.value = []
  minPrice.value = ''
  maxPrice.value = ''
  hasStock.value = false
  sortBy.value = ''
  showAllAttrs.value = false
}
const buildSearchQuery = (pageNum = 1) => {
  const params = new URLSearchParams()
  if (query.value.trim()) params.set('keyword', query.value.trim())
  if (selectedCatalogId.value) params.set('catalog3Id', selectedCatalogId.value)
  if (selectedBrandId.value) params.append('brandId', selectedBrandId.value)
  if (sortBy.value) params.set('sort', sortBy.value)
  if (hasStock.value) params.set('hasStock', '1')
  if (minPrice.value || maxPrice.value) params.set('skuPrice', `${minPrice.value || ''}_${maxPrice.value || ''}`)
  selectedAttrs.value.forEach((attr) => params.append('attrs', attr))
  params.set('pageNum', String(pageNum))
  return params
}
const normalizeImageUrl = (url) => {
  if (!url) return '/index-img/section_second_list_img1.jpg'
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('/')) return url
  return `/${url}`
}
const formatPrice = (price) => Number(price || 0).toFixed(2)
const detailSku = computed(() => detailItem.value?.skuInfo || {})
const detailImages = computed(() => {
  const images = (detailItem.value?.images || []).map((item) => normalizeImageUrl(item.imgUrl)).filter(Boolean)
  const fallback = normalizeImageUrl(detailSku.value.skuDefaultImg)
  return images.length ? images : [fallback]
})
const detailDescription = computed(() => detailItem.value?.description?.description || '')
const saleAttrValueLabel = (value) => typeof value === 'string' ? value : value?.attrValue || ''
const saleAttrValueSkuIds = (value) => {
  if (!value || typeof value === 'string') return []
  if (Array.isArray(value.skuIds)) return value.skuIds.map(String)
  return value.skuIds ? Array.from(value.skuIds, String) : []
}
const isSaleAttrValueAvailable = (attrId, value) => {
  const candidateIds = saleAttrValueSkuIds(value)
  if (!candidateIds.length) return false
  const otherSelectedSkuIds = (detailItem.value?.saleAttrs || [])
    .filter((attr) => String(attr.attrId) !== String(attrId))
    .map((attr) => {
      const selectedValue = (attr.attrValues || []).find(
        (item) => saleAttrValueLabel(item) === detailSelectedAttrs.value[attr.attrId],
      )
      return new Set(saleAttrValueSkuIds(selectedValue))
    })
  return candidateIds.some((skuId) => otherSelectedSkuIds.every((ids) => !ids.size || ids.has(String(skuId))))
}
const selectSaleAttr = (attrId, value) => {
  const attrValue = saleAttrValueLabel(value)
  if (!attrValue || detailSelectedAttrs.value[attrId] === attrValue) return

  const candidateSkuIds = saleAttrValueSkuIds(value)
  if (!candidateSkuIds.length) {
    showToast('该规格暂时没有可选商品')
    return
  }

  const otherSelectedSkuIds = (detailItem.value?.saleAttrs || [])
    .filter((attr) => String(attr.attrId) !== String(attrId))
    .map((attr) => {
      const selectedValue = (attr.attrValues || []).find(
        (item) => saleAttrValueLabel(item) === detailSelectedAttrs.value[attr.attrId],
      )
      return new Set(saleAttrValueSkuIds(selectedValue))
    })

  const targetSkuId = candidateSkuIds.reduce((best, candidateSkuId) => {
    const score = otherSelectedSkuIds.reduce(
      (total, skuIds) => total + Number(skuIds.has(String(candidateSkuId))),
      0,
    )
    return !best || score > best.score ? { skuId: candidateSkuId, score } : best
  }, null)?.skuId

  if (!targetSkuId) {
    showToast('没有找到对应的商品规格')
    return
  }

  detailSelectedAttrs.value = { ...detailSelectedAttrs.value, [attrId]: attrValue }
  navigate(`/item/${encodeURIComponent(targetSkuId)}`)
}
const navigate = (path, replace = false) => {
  if (window.location.pathname + window.location.search === path) return
  if (replace) window.history.replaceState({}, '', path)
  else window.history.pushState({}, '', path)
  handleRoute(path)
}
const goHome = () => {
  query.value = ''
  searchInput.value = ''
  navigate('/')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const loadDetail = async (skuId) => {
  detailRequest?.abort()
  const request = new AbortController()
  detailRequest = request
  const previousSkuId = detailItem.value?.skuInfo?.skuId
  detailLoading.value = true
  detailError.value = ''
  try {
    const response = await authFetch(`${apiBase}/product/item/skuItem/${encodeURIComponent(skuId)}`, { signal: request.signal, credentials: 'include' })
    if (!response.ok) throw new Error(`商品详情服务返回 HTTP ${response.status}`)
    const result = await response.json()
    const payload = result?.data?.skuInfo ? result.data : (result?.skuInfo ? result : result?.data)
    if (!payload?.skuInfo) throw new Error(result?.msg || '商品详情不存在')
    detailItem.value = payload
    detailImageIndex.value = 0
    detailQuantity.value = 1
    const attrs = {}
      ; (payload.saleAttrs || []).forEach((attr) => {
        const currentValue = (attr.attrValues || []).find((value) => value?.isCurrent)
          || attr.attrValues?.[0]
        attrs[attr.attrId] = saleAttrValueLabel(currentValue)
      })
    detailSelectedAttrs.value = attrs
  } catch (error) {
    if (error.name === 'AbortError') return
    detailError.value = error.message || '商品详情暂时不可用'
    if (previousSkuId) {
      detailSkuId.value = previousSkuId
      window.history.replaceState({}, '', `/item/${encodeURIComponent(previousSkuId)}`)
      showToast(`${detailError.value}，已保留当前商品`)
    }
  } finally {
    if (detailRequest === request) detailLoading.value = false
  }
}
const handleRoute = (path = window.location.pathname) => {
  const normalized = String(path).split('?')[0].replace(/\/+$/, '') || '/'
  const itemMatch = normalized.match(/^\/item\/([^/]+)$/)
  if (itemMatch) {
    page.value = 'item'
    detailSkuId.value = decodeURIComponent(itemMatch[1])
    loadDetail(detailSkuId.value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/search') {
    page.value = 'search'
    loadSearch(1, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/cart') {
    if (!isAuthenticated.value) {
      authMode.value = 'login'
      authMessage.value = '请先登录后查看购物车'
      authError.value = ''
      window.history.replaceState({}, '', '/login')
      page.value = 'login'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    page.value = 'cart'
    loadCart(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/orders') {
    if (!isAuthenticated.value) {
      authMode.value = 'login'
      authMessage.value = '请先登录后查看订单'
      authError.value = ''
      window.history.replaceState({}, '', '/login')
      page.value = 'login'
      return
    }
    page.value = 'orders'
    loadOrders(1, ordersStatus.value, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/cashier') {
    if (!isAuthenticated.value) {
      authMode.value = 'login'
      authMessage.value = '请先登录后查看收银台'
      authError.value = ''
      window.history.replaceState({}, '', '/login')
      page.value = 'login'
      return
    }
    page.value = 'cashier'
    const orderSn = new URLSearchParams(window.location.search).get('orderSn')
    loadCashierOrder(orderSn)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/order/confirm' || normalized === '/checkout') {
    if (!isAuthenticated.value) {
      authMode.value = 'login'
      authMessage.value = '请先登录后确认订单'
      authError.value = ''
      window.history.replaceState({}, '', '/login')
      page.value = 'login'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    page.value = 'checkout'
    loadOrderConfirm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/login' || normalized === '/register') {
    if (isAuthenticated.value) {
      window.history.replaceState({}, '', '/')
      page.value = 'home'
      return
    }
    page.value = normalized.slice(1)
    authMode.value = page.value
    authMessage.value = ''
    authError.value = ''
    wechatQrUrl.value = ''
    wechatQrImage.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (normalized === '/auth/wechat/callback') {
    page.value = 'login'
    authMode.value = 'login'
    completeWeixinAuth(new URLSearchParams(window.location.search).get('code'), new URLSearchParams(window.location.search).get('state'))
    return
  }
  if (normalized !== '/') window.history.replaceState({}, '', '/')
  page.value = 'home'
}
const openProduct = (skuId) => {
  if (!skuId) return
  navigate(`/item/${encodeURIComponent(skuId)}`)
}
const loadCategories = async () => {
  categoryRequest?.abort()
  categoryRequest = new AbortController()
  isCategoryLoading.value = true
  categoryError.value = ''
  try {
    const response = await authFetch(`${apiBase}/product/category/list-tree2`, {
      signal: categoryRequest.signal,
      credentials: 'include',
    })
    if (!response.ok) throw new Error(`分类服务返回 HTTP ${response.status}`)
    const result = await response.json()
    if (!Array.isArray(result.data)) throw new Error(result.msg || '分类服务返回的数据格式不正确')
    categoryTree.value = result.data
  } catch (error) {
    if (error.name === 'AbortError') return
    categoryTree.value = []
    categoryError.value = error.message || '分类服务暂时不可用'
  } finally {
    isCategoryLoading.value = false
  }
}
const loadSearch = async (pageNum = 1, notifyOnError = false) => {
  activeRequest?.abort()
  activeRequest = new AbortController()
  isLoading.value = true
  apiError.value = ''
  try {
    const response = await authFetch(`${apiBase}/search/products?${buildSearchQuery(pageNum).toString()}`, { signal: activeRequest.signal, credentials: 'include' })
    if (!response.ok) throw new Error(`搜索服务返回 HTTP ${response.status}`)
    const result = await response.json()
    searchResult.value = {
      products: Array.isArray(result.products) ? result.products : [],
      brands: Array.isArray(result.brands) ? result.brands : [],
      catalogs: Array.isArray(result.catalogs) ? result.catalogs : [],
      attrs: Array.isArray(result.attrs) ? result.attrs : [],
      currentPage: result.currentPage || pageNum,
      totalPages: result.totalPages || 0,
      totalRecordNum: result.totalRecordNum || 0,
      navPages: Array.isArray(result.navPages) ? result.navPages : [],
    }
  } catch (error) {
    if (error.name === 'AbortError') return
    apiError.value = error.message || '搜索服务暂时不可用'
    if (notifyOnError) showToast(apiError.value)
  } finally {
    isLoading.value = false
  }
}
const prepareSearchTerm = (term) => {
  resetFilters()
  const catalog = catalogOptions.value.find((item) => item.catalogName === term)
  if (catalog) {
    query.value = ''
    selectedCatalogId.value = catalog.catalogId
  } else {
    query.value = term
  }
  searchInput.value = term
}
const performSearch = () => {
  prepareSearchTerm(searchInput.value.trim())
  navigate('/search')
  loadSearch(1, true)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const openSearch = (term = '') => {
  prepareSearchTerm(term)
  navigate('/search')
  loadSearch(1, true)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const openCatalogSearch = (catalog) => {
  searchInput.value = ''
  query.value = ''
  resetFilters()
  selectedCatalogId.value = catalog.catalogId || null
  navigate('/search')
  loadSearch(1, true)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const openTreeCategory = (category) => {
  closeCategoryMenu()
  if (Number(category.catLevel) === 3) {
    openCatalogSearch({ catalogId: category.catId, catalogName: category.name })
  } else {
    openSearch(category.name)
  }
}
const activateTopCategory = (category) => {
  categoryMenuExpanded.value = true
  activeTopCategory.value = category
}
const closeCategoryMenu = () => {
  categoryMenuExpanded.value = false
  activeTopCategory.value = null
}
const selectBrand = (brandId) => {
  selectedBrandId.value = selectedBrandId.value === brandId ? null : brandId
  if (page.value !== 'search') navigate('/search')
  loadSearch(1, true)
}
const selectSort = (value) => {
  sortBy.value = value
  loadSearch(1, true)
}
const applyPrice = () => loadSearch(1, true)
const applyStock = () => loadSearch(1, true)
const toggleAttr = (attrId, value) => {
  const prefix = `${attrId}_`
  const current = selectedAttrs.value.find((attr) => attr.startsWith(prefix))
  const values = current ? current.slice(prefix.length).split(':') : []
  const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
  selectedAttrs.value = selectedAttrs.value.filter((attr) => !attr.startsWith(prefix))
  if (nextValues.length) selectedAttrs.value.push(`${prefix}${nextValues.join(':')}`)
  loadSearch(1, true)
}
const goToPage = (pageNum) => {
  if (pageNum < 1 || (searchResult.value.totalPages && pageNum > searchResult.value.totalPages)) return
  loadSearch(pageNum, true)
}
const clearFilter = (type) => {
  if (type === 'brand') selectedBrandId.value = null
  if (type === 'catalog') selectedCatalogId.value = null
  if (type === 'keyword') { query.value = ''; searchInput.value = '' }
  if (type === 'price') { minPrice.value = ''; maxPrice.value = '' }
  if (type === 'stock') hasStock.value = false
  if (type === 'attrs') selectedAttrs.value = []
  loadSearch(1, true)
}
const clearAttributeFilter = (encoded) => {
  selectedAttrs.value = selectedAttrs.value.filter((item) => item !== encoded)
  loadSearch(1, true)
}
const addToCart = async (skuId, name = '商品', quantity = 1) => {
  if (!isAuthenticated.value) {
    showToast('请先登录后再加入购物车')
    navigate('/login')
    return false
  }
  const normalizedSkuId = Number(skuId)
  const count = Math.max(1, Math.min(9999, Math.floor(Number(quantity) || 1)))
  if (!Number.isSafeInteger(normalizedSkuId) || normalizedSkuId <= 0) {
    showToast('该商品暂未关联可购买的库存')
    return false
  }
  const succeeded = await runCartAction(normalizedSkuId, () => authFetch(
    `${apiBase}/cart/add?skuId=${encodeURIComponent(normalizedSkuId)}&num=${encodeURIComponent(count)}`,
    { method: 'POST', credentials: 'include' },
  ))
  if (succeeded) showToast(`${String(name || '商品').slice(0, 16)} 已加入购物车`)
  return succeeded
}
const updateCartCount = async (skuId, count) => {
  if (!isAuthenticated.value) return false
  const normalizedCount = Math.max(1, Math.min(9999, Math.floor(Number(count) || 1)))
  return runCartAction(skuId, () => authFetch(
    `${apiBase}/cart/items/${encodeURIComponent(skuId)}?count=${encodeURIComponent(normalizedCount)}`,
    { method: 'PATCH', credentials: 'include' },
  ))
}
const changeCartQuantity = (item, delta) => updateCartCount(item.skuId, Number(item.count) + delta)
const updateCartChecked = async (skuId, checked) => {
  if (!isAuthenticated.value) return false
  return runCartAction(skuId, () => authFetch(
    `${apiBase}/cart/items/${encodeURIComponent(skuId)}/checked?checked=${checked ? 'true' : 'false'}`,
    { method: 'PATCH', credentials: 'include' },
  ))
}
const toggleAllCartItems = async (checked) => {
  const items = cart.value.items.filter((item) => Boolean(item?.check) !== checked)
  for (const item of items) {
    // Sequential updates keep Redis and the UI deterministic on slower gateways.
    await updateCartChecked(item.skuId, checked)
  }
}
const removeCartItem = async (skuId) => {
  if (!isAuthenticated.value) return false
  const succeeded = await runCartAction(skuId, () => authFetch(
    `${apiBase}/cart/items/${encodeURIComponent(skuId)}`,
    { method: 'DELETE', credentials: 'include' },
  ))
  if (succeeded) showToast('商品已从购物车移除')
  return succeeded
}
const clearCart = async () => {
  const items = [...cart.value.items]
  for (const item of items) await removeCartItem(item.skuId)
}
const openCart = () => {
  if (!isAuthenticated.value) {
    showToast('请先登录后查看购物车')
    navigate('/login')
    return
  }
  navigate('/cart')
}
const authApiError = (result, fallback) => {
  if (result?.errors && typeof result.errors === 'object') {
    const firstError = Object.values(result.errors).find(Boolean)
    if (firstError) return String(firstError)
  }
  return result?.msg || result?.message || fallback
}
const loadCurrentMember = async (notifyOnError = false) => {
  if (!isAuthenticated.value) {
    setCurrentMember(null)
    return false
  }
  authProfileLoading.value = true
  try {
    const response = await authFetch(`${apiBase}/member/member/curr-info`, { credentials: 'include' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.member) {
      throw new Error(authApiError(result, response.status === 401 ? '登录已过期，请重新登录' : '用户信息加载失败'))
    }
    setCurrentMember(result.member)
    return true
  } catch (error) {
    setCurrentMember(null)
    if (notifyOnError) showToast(error.message || '用户信息加载失败')
    return false
  } finally {
    authProfileLoading.value = false
  }
}
const acceptAuthToken = async (rawToken, message, remember = false) => {
  if (!rawToken) throw new Error('认证成功，但服务器没有返回登录凭证')
  setAuthToken(rawToken, { remember })
  await loadCurrentMember(false)
  await loadCart(false)
  authError.value = ''
  authMessage.value = message
}
const logout = () => {
  clearAuthSession()
  cart.value = emptyCart()
  cartError.value = ''
  wechatClient?.deactivate()
  showToast('已安全退出登录')
  goHome()
}
const submitAuth = async () => {
  authMessage.value = ''
  authError.value = ''
  if (authMode.value === 'login') {
    if (!authForm.value.account.trim() || !authForm.value.password) {
      authError.value = '请输入邮箱和密码'
      return
    }
  } else if (!authForm.value.userName.trim() || !authForm.value.email.trim() || !authForm.value.password || !authForm.value.code.trim()) {
    authError.value = '请完整填写注册信息'
    return
  }
  authSubmitting.value = true
  try {
    const endpoint = authMode.value === 'login' ? '/auth/local/login' : '/auth/local/register'
    const body = authMode.value === 'login'
      ? { account: authForm.value.account.trim(), password: authForm.value.password }
      : {
        userName: authForm.value.userName.trim(),
        password: authForm.value.password,
        email: authForm.value.email.trim(),
        code: authForm.value.code.trim(),
      }
    const response = await authFetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0) throw new Error(authApiError(result, '认证服务暂时不可用'))
    await acceptAuthToken(
      result.token,
      authMode.value === 'login' ? '登录成功，欢迎回来' : '注册成功，欢迎加入拾汇商城',
      authMode.value === 'login' && rememberLogin.value,
    )
    if (authMode.value === 'register') {
      authForm.value.code = ''
    }
    authForm.value.password = ''
    window.setTimeout(goHome, 700)
  } catch (error) {
    authError.value = error.message || '认证服务暂时不可用'
  } finally {
    authSubmitting.value = false
  }
}
const sendEmailCode = async () => {
  authMessage.value = ''
  authError.value = ''
  const email = authForm.value.email.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    authError.value = '请输入正确的邮箱地址'
    return
  }
  emailCodeSending.value = true
  try {
    const response = await authFetch(`${apiBase}/auth/local/email/send-code?target=${encodeURIComponent(email)}`, {
      credentials: 'include',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0) throw new Error(authApiError(result, '验证码发送失败'))
    emailCountdown.value = 60
    clearInterval(emailCountdownTimer)
    emailCountdownTimer = window.setInterval(() => {
      emailCountdown.value -= 1
      if (emailCountdown.value <= 0) clearInterval(emailCountdownTimer)
    }, 1000)
    authMessage.value = '验证码已发送，请查收邮件'
  } catch (error) {
    authError.value = error.message || '验证码发送失败'
  } finally {
    emailCodeSending.value = false
  }
}
const loadWeixinQr = async () => {
  authMessage.value = ''
  authError.value = ''
  wechatLoading.value = true
  try {
    const currentMainPath = window.location.origin
    const response = await authFetch(`${apiBase}/auth/oauth/wx-redirect-path?currentMainPath=${encodeURIComponent(currentMainPath)}`, {
      credentials: 'include',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0 || !result.qrUrl) throw new Error(authApiError(result, '微信登录暂时不可用'))
    wechatQrUrl.value = result.qrUrl
    wechatQrImage.value = await QRCode.toDataURL(result.qrUrl, { width: 192, margin: 1, errorCorrectionLevel: 'M' })
    connectWeixinNotice(result.state)
  } catch (error) {
    authError.value = error.message || '微信登录暂时不可用'
  } finally {
    wechatLoading.value = false
  }
}
const connectWeixinNotice = (state) => {
  if (!state) return
  wechatClient?.deactivate()
  const websocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  wechatClient = new Client({
    brokerURL: `${websocketProtocol}//${window.location.host}/ws/auth`,
    reconnectDelay: 3000,
    connectionTimeout: 6000,
    onConnect: () => {
      wechatClient.subscribe(`/topic/wechat/${state}`, async (message) => {
        let notice = {}
        try { notice = JSON.parse(message.body) } catch { notice = { message: message.body } }
        if (String(notice.code) === '200') {
          try {
            await acceptAuthToken(notice.token, notice.message || '微信登录成功', rememberLogin.value)
            wechatQrUrl.value = ''
            wechatQrImage.value = ''
            wechatClient?.deactivate()
            window.setTimeout(goHome, 1000)
          } catch (error) {
            authError.value = error.message || '微信登录凭证无效，请重新扫码'
          }
        }
      })
    },
  })
  wechatClient.activate()
}
const completeWeixinAuth = async (code, state) => {
  const callbackKey = `${code || ''}:${state || ''}`
  if (wechatCallbackLoading.value || wechatCallbackKey === callbackKey) return
  wechatCallbackKey = callbackKey
  authError.value = ''
  authMessage.value = ''
  if (!code || !state) {
    authError.value = '微信授权参数不完整，请重新扫码'
    return
  }
  wechatCallbackLoading.value = true
  try {
    const response = await authFetch(`${apiBase}/auth/oauth/wx-auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, { credentials: 'include' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.code !== 0) throw new Error(authApiError(result, '微信授权失败，请重新扫码'))
    await acceptAuthToken(result.token, '微信登录成功，正在返回商城', rememberLogin.value)
    window.setTimeout(goHome, 1000)
  } catch (error) {
    authError.value = error.message || '微信授权失败，请重新扫码'
  } finally {
    wechatCallbackLoading.value = false
  }
}
const nextSlide = () => (activeSlide.value = (activeSlide.value + 1) % slides.length)
const prevSlide = () => (activeSlide.value = (activeSlide.value + slides.length - 1) % slides.length)
onMounted(() => {
  carouselTimer = setInterval(nextSlide, 4800)
  loadCategories()
  routeListener = () => handleRoute()
  window.addEventListener('popstate', routeListener)
  handleRoute()
  if (isAuthenticated.value) {
    loadCurrentMember(true)
    loadCart(false)
  }
})
watch(isAuthenticated, (authenticated) => {
  if (authenticated) loadCart(false)
  else cart.value = emptyCart()
})
onBeforeUnmount(() => {
  clearInterval(carouselTimer)
  clearTimeout(toastTimer)
  activeRequest?.abort()
  categoryRequest?.abort()
  detailRequest?.abort()
  orderConfirmRequest?.abort()
  orderFareRequest?.abort()
  ordersRequest?.abort()
  cashierRequest?.abort()
  clearInterval(emailCountdownTimer)
  wechatClient?.deactivate()
  if (routeListener) window.removeEventListener('popstate', routeListener)
})

  return {
    page,
    query,
    searchInput,
    cart,
    cartCount,
    cartSelectedCount,
    cartSelectedTypeCount,
    cartSelectedTotal,
    cartLoading,
    cartError,
    cartActionSkuId,
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
    orders,
    ordersLoading,
    ordersError,
    ordersPage,
    ordersTotalPages,
    ordersStatus,
    cashierOrder,
    cashierLoading,
    cashierError,
    activeSlide,
    sortBy,
    selectedBrandId,
    selectedCatalogId,
    selectedAttrs,
    minPrice,
    maxPrice,
    hasStock,
    showAllAttrs,
    categoryTree,
    activeTopCategory,
    categoryMenuExpanded,
    searchResult,
    isLoading,
    isCategoryLoading,
    categoryError,
    apiError,
    toast,
    detailSkuId,
    detailItem,
    detailLoading,
    detailError,
    detailImageIndex,
    detailQuantity,
    detailSelectedAttrs,
    authMode,
    authForm,
    authEmail,
    authSubmitting,
    authMessage,
    authError,
    authProfileLoading,
    rememberLogin,
    isAuthenticated,
    currentMember,
    currentDisplayName,
    emailCodeSending,
    emailCountdown,
    wechatQrUrl,
    wechatQrImage,
    wechatLoading,
    wechatCallbackLoading,
    slides,
    navItems,
    seckillProducts,
    sortOptions,
    homeCategories,
    brandOptions,
    catalogOptions,
    selectedBrandName,
    selectedCatalogName,
    currentSortLabel,
    selectedFilterCount,
    unselectedAttrs,
    visibleAttrs,
    hiddenAttrCount,
    selectedAttributeFilters,
    showToast,
    normalizeImageUrl,
    formatPrice,
    detailSku,
    detailImages,
    detailDescription,
    saleAttrValueLabel,
    isSaleAttrValueAvailable,
    selectSaleAttr,
    navigate,
    goHome,
    loadDetail,
    openProduct,
    loadCategories,
    performSearch,
    openSearch,
    openCatalogSearch,
    openTreeCategory,
    activateTopCategory,
    closeCategoryMenu,
    selectBrand,
    selectSort,
    applyPrice,
    applyStock,
    toggleAttr,
    goToPage,
    clearFilter,
    clearAttributeFilter,
    addToCart,
    loadCart,
    updateCartCount,
    changeCartQuantity,
    updateCartChecked,
    toggleAllCartItems,
    removeCartItem,
    clearCart,
    openCart,
    loadOrderConfirm,
    loadOrderFreight,
    selectOrderAddress,
    saveOrderAddress,
    openCheckout,
    openOrders,
    loadOrders,
    loadCashierOrder,
    backToCart,
    submitOrder,
    submitAuth,
    sendEmailCode,
    loadWeixinQr,
    loadCurrentMember,
    logout,
    prevSlide,
    nextSlide,
  }
}
