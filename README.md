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

### 智能客服

右下角客服浮窗（`src/components/CustomerServiceWidget.vue`）对接 `ai-customer-service`，默认经网关访问 `/api/ai`：

| 能力 | 前端调用 |
| --- | --- |
| 流式对话（政策问答 / 投诉建单，Agent 自主决策） | `POST /api/ai/chat/stream`，SSE 事件 `tool_start` / `token` / `done` / `error` |
| 非流式对话（网关缓冲 SSE 时降级） | `POST /api/ai/chat` |
| 组件健康检查（无需 JWT，用于「服务维护中」提示） | `GET /api/ai/health` |

- 状态与逻辑在 `src/composables/useCustomerService.js`，会话 ID 与最近 40 条消息存入 `sessionStorage`，刷新后可继续追问；
- 请求统一走 `authFetch` 透传 `Authorization: Bearer <JWT>`，服务端不解析 JWT，仅原样转发给 Java 端工具；未登录时浮窗只展示登录引导，不发起请求；
- 回答以文本节点渲染（不启用 `v-html`），支持 `**加粗**`、列表与换行，并展示命中的政策片段来源与相似度；
- AI 服务与前端分离部署时，用 `VITE_AI_BASE_URL` 覆盖默认的 `${VITE_API_BASE_URL}/ai`。
