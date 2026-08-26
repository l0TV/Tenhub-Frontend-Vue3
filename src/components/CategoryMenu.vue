<script setup>
import { useMallAppContext } from '../composables/mallContext'

const {
  categoryTree,
  homeCategories,
  activeTopCategory,
  categoryMenuExpanded,
  isCategoryLoading,
  categoryError,
  activateTopCategory,
  closeCategoryMenu,
  openTreeCategory,
  loadCategories,
} = useMallAppContext()

const categoryIcons = ['▣', '▤', '▥', '◈', '⌂', '▦', '♨', '✦']
</script>

<template>
  <div class="category-menu" @mouseleave="closeCategoryMenu">
    <aside class="category-panel" :class="{ 'is-expanded': categoryMenuExpanded }">
      <div class="category-title"></div>
      <div v-if="isCategoryLoading" class="category-state">分类加载中...</div>
      <button
        v-for="(category, index) in homeCategories"
        v-else
        :key="category.catId"
        :class="{ active: activeTopCategory?.catId === category.catId }"
        @mouseenter="activateTopCategory(category)"
        @focus="activateTopCategory(category)"
        @click="openTreeCategory(category)"
      >
        <span class="category-icon">{{ categoryIcons[index % categoryIcons.length] }}</span>{{ category.name }}<i>›</i>
      </button>
      <button v-if="categoryError && !isCategoryLoading" class="category-retry" @click="loadCategories">
        {{ categoryError }}，点击重试
      </button>
      <div v-else-if="!isCategoryLoading && !categoryTree.length" class="category-state">暂无分类</div>
    </aside>

    <section v-if="categoryMenuExpanded && activeTopCategory" class="category-flyout" :aria-label="`${activeTopCategory.name}的子分类`">
      <div class="category-flyout-heading">
        <button @click="openTreeCategory(activeTopCategory)">{{ activeTopCategory.name }}频道 <span>›</span></button>
      </div>
      <div v-if="activeTopCategory.subCategoryList?.length" class="category-details">
        <div v-for="secondCategory in activeTopCategory.subCategoryList" :key="secondCategory.catId" class="category-detail-row">
          <button class="second-category" @click="openTreeCategory(secondCategory)">{{ secondCategory.name }}<span>›</span></button>
          <div class="third-categories">
            <button v-for="thirdCategory in secondCategory.subCategoryList || []" :key="thirdCategory.catId" @click="openTreeCategory(thirdCategory)">{{ thirdCategory.name }}</button>
            <span v-if="!secondCategory.subCategoryList?.length">暂无下级分类</span>
          </div>
        </div>
      </div>
      <div v-else class="category-flyout-empty">该分类暂无下级分类</div>
    </section>
  </div>
</template>
