<script setup>
import { useMallAppContext } from '../composables/mallContext'

const {
  page,
  searchInput,
  cartCount,
  navItems,
  isAuthenticated,
  currentDisplayName,
  authProfileLoading,
  navigate,
  logout,
  goHome,
  performSearch,
  openCatalogSearch,
  openSearch,
  showToast,
} = useMallAppContext()
</script>

<template>
  <div class="top-strip">
    <div class="page-width strip-inner">
      <span>拾汇商城首页</span><span class="location">当前地区：北京</span>
      <div class="strip-links">
        <template v-if="isAuthenticated">
          <span>你好，{{ authProfileLoading ? '加载中…' : currentDisplayName }}</span><a @click="logout">退出登录</a>
        </template>
        <template v-else>
          <a @click="navigate('/login')">你好，请登录</a><a @click="navigate('/register')">免费注册</a>
        </template>
        <i></i><a>我的订单</a><a>我的拾汇商城</a><a>客户服务</a><a>网站导航</a>
      </div>
    </div>
  </div>

  <header class="main-header">
    <div class="page-width head-main">
      <button class="brand" aria-label="返回首页" @click="goHome">
        <img src="/index-img/logo.png" alt="拾汇商城" />
      </button>
      <div class="search-area">
        <form class="search-box" @submit.prevent="performSearch">
          <span class="search-mark">⌕</span><input v-model="searchInput" placeholder="搜索商品、品牌或关键词" /><button type="submit">搜索</button>
        </form>
        <div class="hot-words">
          <a @click="openCatalogSearch({ catalogId: 225, catalogName: '手机' })">手机</a>
          <a @click="openSearch('家电')">家电5折</a>
          <a @click="openSearch('运动户外')">运动户外</a>
          <a @click="openSearch('保暖好物')">保暖好物</a>
          <a @click="openSearch('洗衣机')">洗衣机节</a>
          <a @click="openSearch('超市')">超市</a>
        </div>
      </div>
      <button class="cart-button" @click="showToast('购物车暂时为空，快去挑选好物吧')"><span>🛒</span> 我的购物车 <b>{{ cartCount }}</b><em>›</em></button>
    </div>
    <nav class="nav-bar page-width">
      <button class="catalog-button" @click="goHome">全部商品分类 <span>☰</span></button>
      <button v-for="item in navItems" :key="item" class="nav-link" :class="{ active: item === '秒杀' && page === 'home' }" @click="item === '秒杀' ? goHome() : openSearch(item)">{{ item }}</button>
    </nav>
  </header>
</template>
