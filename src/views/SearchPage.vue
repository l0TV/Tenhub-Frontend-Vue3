<script setup>
import { useMallAppContext } from '../composables/mallContext'

const {
  query,
  selectedBrandId,
  selectedCatalogId,
  selectedAttrs,
  minPrice,
  maxPrice,
  hasStock,
  showAllAttrs,
  searchResult,
  isLoading,
  apiError,
  seckillProducts,
  sortBy,
  sortOptions,
  brandOptions,
  catalogOptions,
  selectedBrandName,
  selectedCatalogName,
  selectedFilterCount,
  visibleAttrs,
  unselectedAttrs,
  hiddenAttrCount,
  selectedAttributeFilters,
  goHome,
  normalizeImageUrl,
  formatPrice,
  selectBrand,
  clearFilter,
  openCatalogSearch,
  applyPrice,
  toggleAttr,
  clearAttributeFilter,
  selectSort,
  goToPage,
  applyStock,
  openProduct,
  showToast,
  addToCart,
} = useMallAppContext()

const setPriceRange = (min, max) => {
  minPrice.value = min
  maxPrice.value = max
  applyPrice()
}

const isAttributeSelected = (attrId, value) => selectedAttrs.value.some((item) => (
  item === `${attrId}_${value}` || item.startsWith(`${attrId}_`) && item.slice(String(attrId).length + 1).split(':').includes(value)
))
</script>

<template>
  <main class="page-width search-page">
    <div class="breadcrumb"><a @click="goHome">首页</a><span>›</span><b>{{ query || selectedCatalogName || '全部商品' }}</b><span class="result-count">共 {{ searchResult.totalRecordNum }} 件商品</span></div>
    <section class="filter-panel">
      <div class="filter-row brand-row"><label>品牌：</label>
        <div class="filter-values brand-values"><button class="all-brand-filter" :class="{ chosen: !selectedBrandId }" @click="selectBrand(null)">全部品牌</button><button v-for="brand in brandOptions" :key="brand.brandId" class="brand-filter-option" :class="{ chosen: String(selectedBrandId) === String(brand.brandId), 'text-only': !brand.brandImg }" :title="brand.brandName" @click="selectBrand(brand.brandId)"><img v-if="brand.brandImg" :src="normalizeImageUrl(brand.brandImg)" :alt="brand.brandName" /><span class="brand-name">{{ brand.brandName }}</span></button><span v-if="!brandOptions.length" class="muted">暂无品牌聚合</span></div>
      </div>
      <div class="filter-row"><label>分类：</label>
        <div class="filter-values"><button :class="{ chosen: !selectedCatalogId }" @click="clearFilter('catalog')">全部分类</button><button v-for="catalog in catalogOptions" :key="catalog.catalogId" :class="{ chosen: String(selectedCatalogId) === String(catalog.catalogId) }" @click="openCatalogSearch(catalog)">{{ catalog.catalogName }}</button><span v-if="!catalogOptions.length" class="muted">暂无分类聚合</span></div>
      </div>
      <div class="filter-row"><label>价格：</label>
        <div class="filter-values"><button @click="setPriceRange('', '999')">0-999</button><button @click="setPriceRange('1000', '2999')">1000-2999</button><button @click="setPriceRange('3000', '4999')">3000-4999</button><button @click="setPriceRange('5000', '')">5000以上</button><input v-model="minPrice" type="number" min="0" placeholder="¥ 最低价" /><span>-</span><input v-model="maxPrice" type="number" min="0" placeholder="¥ 最高价" /><button class="confirm-price" @click="applyPrice">确定</button></div>
      </div>
      <div v-for="attr in visibleAttrs" :key="attr.attrId" class="filter-row"><label>{{ attr.attrName }}：</label>
        <div class="filter-values"><button v-for="value in attr.attrValues || []" :key="value" :class="{ chosen: isAttributeSelected(attr.attrId, value) }" @click="toggleAttr(attr.attrId, value)">{{ value }}</button></div>
      </div>
      <div v-if="unselectedAttrs.length > 2" class="filter-more-row"><button class="expand-filter" @click="showAllAttrs = !showAllAttrs">{{ showAllAttrs ? '收起筛选条件' : `展开更多筛选条件（还有 ${hiddenAttrCount} 项）` }} <span>{{ showAllAttrs ? '↑' : '↓' }}</span></button></div>
    </section>
    <div class="active-filters"><span>已选条件：</span><button v-if="selectedBrandId" @click="clearFilter('brand')">品牌：{{ selectedBrandName }} ×</button><button v-if="selectedCatalogId" @click="clearFilter('catalog')">分类：{{ selectedCatalogName }} ×</button><button v-if="query" @click="clearFilter('keyword')">关键词：{{ query }} ×</button><button v-if="minPrice || maxPrice" @click="clearFilter('price')">价格：{{ minPrice || 0 }}-{{ maxPrice || '不限' }} ×</button><button v-if="hasStock" @click="clearFilter('stock')">仅有货 ×</button><button v-for="attribute in selectedAttributeFilters" :key="attribute.encoded" @click="clearAttributeFilter(attribute.encoded)">{{ attribute.label }} ×</button><span v-if="selectedFilterCount === 0" class="muted">暂无筛选条件</span></div>
    <section class="result-layout">
      <aside class="recommend-card">
        <div class="recommend-title">商品精选 <span>广告</span></div>
        <article v-for="item in seckillProducts.slice(0, 2)" :key="item.image"><img :src="`/index-img/${item.image}`" :alt="item.title" /><b>{{ item.title }}</b><strong>¥{{ item.price }}</strong><small>已有 {{ 1200 + item.price.replace('.', '') % 900 }} 人评价</small></article>
      </aside>
      <div class="results">
        <div class="result-toolbar">
          <div class="sort-tabs"><button v-for="sort in sortOptions" :key="sort.value" :class="{ current: sortBy === sort.value }" @click="selectSort(sort.value)">{{ sort.label }}</button></div>
          <div class="result-page">{{ searchResult.currentPage }}/{{ searchResult.totalPages || 1 }} <button :disabled="searchResult.currentPage <= 1" @click="goToPage(searchResult.currentPage - 1)">‹</button><button :disabled="searchResult.currentPage >= searchResult.totalPages" @click="goToPage(searchResult.currentPage + 1)">›</button></div>
        </div>
        <div class="delivery-row"><span>送货至</span><button>北京朝阳区三环以内</button><label><input v-model="hasStock" type="checkbox" @change="applyStock" /> 仅显示有货</label></div>
        <div class="product-grid">
          <article v-for="product in searchResult.products" :key="product.skuId" class="product-card" @click="openProduct(product.skuId)">
            <div class="product-image"><img :src="normalizeImageUrl(product.skuImg)" :alt="product.skuTitle" /><button class="heart" @click.stop="showToast('已收藏商品')">♡</button></div><strong class="product-price">¥{{ formatPrice(product.skuPrice) }}</strong>
            <h3 v-html="product.skuTitle"></h3>
            <p>已有 {{ product.saleCount || 0 }}+ 人评价 <span>·</span> {{ product.hasStock ? '有货' : '暂时无货' }}</p>
            <div class="product-tags"><span>自营</span><span>满减</span><button @click.stop="addToCart(product.skuTitle || '')">加入购物车</button></div>
          </article>
        </div>
        <div v-if="isLoading" class="empty-state">正在从搜索服务加载商品...</div>
        <div v-else-if="apiError" class="empty-state">{{ apiError }}</div>
        <div v-else-if="!searchResult.products.length" class="empty-state">没有找到匹配的商品，换个关键词试试</div>
        <div class="pagination"><button :disabled="searchResult.currentPage <= 1" @click="goToPage(searchResult.currentPage - 1)">‹ 上一页</button><button v-for="pageNo in searchResult.navPages" :key="pageNo" :class="{ active: pageNo === searchResult.currentPage }" @click="goToPage(pageNo)">{{ pageNo }}</button><button :disabled="searchResult.currentPage >= searchResult.totalPages" @click="goToPage(searchResult.currentPage + 1)">下一页 ›</button></div>
      </div>
    </section>
  </main>
</template>
