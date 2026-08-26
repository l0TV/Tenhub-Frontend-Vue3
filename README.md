# Tenhub-Frontend-Vue3

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## API

搜索页调用 Spring Gateway 的 `GET /api/search/products`，参数与 `tenhub-search` 的 `SearchParam` 对齐：`keyword`、`catalog3Id`、`brandId`、`sort`、`hasStock`、`skuPrice`、`attrs` 和 `pageNum`。

首页分类菜单调用 `tenhub-product` 的 `GET /api/product/category/list-tree2`。页面初次加载只请求分类树；商品搜索请求会在用户发起搜索或选择分类后发送。

开发环境默认将 `/api` 代理到 `http://localhost:88`。如果 Gateway 不在本机，可复制 `.env.example` 为 `.env.local` 并修改 `VITE_GATEWAY_URL`；生产环境默认使用同源 `/api`。
