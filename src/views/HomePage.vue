<script setup>
import CategoryMenu from '../components/CategoryMenu.vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  activeSlide,
  slides,
  seckillProducts,
  isAuthenticated,
  currentDisplayName,
  navigate,
  logout,
  openSearch,
  showToast,
  prevSlide,
  nextSlide,
} = useMallAppContext()
</script>

<template>
  <main class="page-width home-page">
    <section class="hero-grid">
      <CategoryMenu />
      <section class="hero-slider">
        <div class="hero-image-wrap">
          <transition name="fade" mode="out-in">
            <img :key="activeSlide" :src="slides[activeSlide].image" :alt="slides[activeSlide].title" />
          </transition>
          <div class="hero-copy">
            <small>{{ slides[activeSlide].eyebrow }}</small>
            <strong>{{ slides[activeSlide].title }}</strong>
            <span>{{ slides[activeSlide].sub }}</span>
            <button @click="openSearch('精选')">立即抢购 <b>→</b></button>
          </div>
          <button class="slider-arrow left" aria-label="上一张" @click="prevSlide">‹</button><button class="slider-arrow right" aria-label="下一张" @click="nextSlide">›</button>
          <div class="dots"><button v-for="(_, index) in slides" :key="index" :class="{ on: index === activeSlide }" @click="activeSlide = index"></button></div>
        </div>
        <div class="hero-promos"><img :src="'/index-img/5a1698b7Nd63c86ed.jpg!q90'" alt="数码生活" /><img :src="'/index-img/5a0cf69eN35720550.jpg!q90'" alt="品质家电" /></div>
      </section>
      <aside class="member-panel">
        <div class="member-card">
          <div class="avatar">{{ isAuthenticated ? currentDisplayName.slice(0, 1) : '拾' }}</div>
          <div v-if="isAuthenticated"><b>Hi，{{ currentDisplayName }}</b><span>会员权益已为你开启</span></div>
          <div v-else><b>Hi，欢迎来到拾汇</b><span>登录后享更多专属权益</span></div>
          <button v-if="isAuthenticated" @click="logout">退出登录</button><button v-else @click="navigate('/login')">登录 / 注册</button>
        </div>
        <div class="member-benefits"><button @click="showToast('新人礼包已领取')"><b>新人礼包</b><span>注册即享好礼</span></button><button @click="showToast('PLUS会员详情')"><b>PLUS会员</b><span>专享折扣和免邮</span></button></div>
        <div class="notice-tabs"><b>促销</b><span>公告</span><span>更多 ›</span></div>
        <ul class="notice-list">
          <li>全员新用户专享大礼包</li>
          <li>家具建材满999减300元</li>
          <li>黑科技热销，下单立减千元</li>
        </ul>
        <div class="quick-entry"><button v-for="entry in ['话费', '机票', '酒店', '游戏', '企业购', '加油卡', '电影票', '火车票']" :key="entry" @click="showToast(`${entry}服务即将开放`)"><span>{{ ['▣', '✈', '▤', '⌁', '▥', '◌', '▰', '▥'][entry.length % 8] }}</span>{{ entry }}</button></div>
      </aside>
    </section>

    <section class="seckill-section">
      <div class="section-heading red-heading">
        <div class="heading-title"><span class="flash-icon">ϟ</span><strong>限时秒杀</strong><small>总有你想不到的低价</small></div>
        <div class="countdown"><span>当前场次</span><b>03</b><i>:</i><b>59</b><i>:</i><b>50</b><span>后结束</span></div>
      </div>
      <div class="seckill-body">
        <article v-for="product in seckillProducts" :key="product.image" class="seckill-card" @click="showToast('请进入商品详情后加入购物车')"><img :src="`/index-img/${product.image}`" :alt="product.title" />
          <div class="seckill-info"><h3>{{ product.title }}</h3><strong>¥{{ product.price }}</strong><del>¥{{ product.old }}</del></div>
        </article>
        <article class="seckill-ad"><img src="/index-img/section_second_list_right_img.jpg" alt="品牌秒杀" /><span>品牌好物 · 限时专享</span></article>
      </div>
    </section>

    <section class="feature-grid">
      <div class="feature-intro"><small>SHOPPING GUIDE</small><h2>发现<br /><b>生活的更多可能</b></h2><p>精选品质好物，灵感每天更新</p><button @click="openSearch('精选')">探索好物 →</button></div>
      <div class="feature-cards">
        <article><img src="/index-img/section_img (1).webp" alt="品质生活" /><div><small>生活家</small><b>把日子过成喜欢的样子</b></div></article>
        <article><img src="/index-img/section_img (2).webp" alt="数码潮品" /><div><small>数码潮品</small><b>科技，让生活更轻松</b></div></article>
        <article><img src="/index-img/section_img (3).webp" alt="全球好物" /><div><small>全球购</small><b>世界好物，放心购</b></div></article>
      </div>
    </section>
  </main>
</template>
