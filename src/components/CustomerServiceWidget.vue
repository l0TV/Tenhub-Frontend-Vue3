<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMallAppContext } from '../composables/mallContext'
import { QUICK_QUESTIONS, useCustomerService } from '../composables/useCustomerService'
import { useAuthSession } from '../services/authSession'

const { page, navigate, showToast } = useMallAppContext()
const { isAuthenticated } = useAuthSession()
const {
  isOpen,
  messages,
  sending,
  unread,
  error,
  health,
  toolHint,
  closePanel,
  togglePanel,
  clearConversation,
  sendMessage,
  stopStreaming,
  retryMessage,
} = useCustomerService()

const draft = ref('')
const scroller = ref(null)
const inputRef = ref(null)
const showQuick = ref(true)
const showAllSources = ref({})
const MESSAGE_MAX_LENGTH = 500

const serviceUnavailable = computed(() => health.value && health.value.llmReady === false)
// 登录/注册页不展示客服入口，进入时自动收起面板
const isAuthPage = computed(() => page.value === 'login' || page.value === 'register')
const canSend = computed(() => isAuthenticated.value && !sending.value && draft.value.trim().length > 0)
const remaining = computed(() => MESSAGE_MAX_LENGTH - draft.value.trim().length)

/* ------------------------------------------------------------------ */
/* 轻量 Markdown 渲染：仅支持 **加粗**、`代码`、有序/无序列表与换行，     */
/* 全部以文本节点输出，绝不使用 v-html，避免模型输出带来 XSS 风险。      */
/* ------------------------------------------------------------------ */
const parseInline = (text) => {
  const parts = []
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g
  let last = 0
  let match = pattern.exec(text)
  while (match !== null) {
    if (match.index > last) parts.push({ type: 'text', text: text.slice(last, match.index) })
    if (match[1] != null) parts.push({ type: 'strong', text: match[1] })
    else parts.push({ type: 'code', text: match[2] })
    last = match.index + match[0].length
    match = pattern.exec(text)
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', text }]
}

const renderBlocks = (content) => {
  const blocks = []
  let list = null
  const flushList = () => {
    if (list) {
      blocks.push(list)
      list = null
    }
  }
  String(content || '').split('\n').forEach((raw) => {
    const line = raw.trim()
    if (!line) {
      flushList()
      return
    }
    const ordered = line.match(/^(\d+)\s*[.、)]\s*(.+)$/)
    const bullet = line.match(/^[-*·•]\s+(.+)$/)
    if (ordered) {
      if (!list || list.type !== 'ol') {
        flushList()
        list = { type: 'ol', start: Math.max(1, Number(ordered[1]) || 1), items: [] }
      }
      list.items.push(parseInline(ordered[2]))
      return
    }
    if (bullet) {
      if (!list || list.type !== 'ul') {
        flushList()
        list = { type: 'ul', items: [] }
      }
      list.items.push(parseInline(bullet[1]))
      return
    }
    flushList()
    blocks.push({ type: 'p', items: parseInline(line) })
  })
  flushList()
  return blocks
}

const stepLabel = (step, streaming) => {
  const label = step?.label || '正在处理'
  return streaming ? label : label.replace(/^正在/, '已')
}

const messageSources = (message) => {
  const sources = (message.sources || []).filter((source) => source && (source.source || source.section))
  if (!sources.length) return []
  return showAllSources.value[message.id] ? sources : sources.slice(0, 3)
}

const toggleSources = (messageId) => {
  showAllSources.value = { ...showAllSources.value, [messageId]: !showAllSources.value[messageId] }
}

const scrollToBottom = async (force = false) => {
  await nextTick()
  const element = scroller.value
  if (!element) return
  const distance = element.scrollHeight - element.scrollTop - element.clientHeight
  if (!force && distance > 120) return
  element.scrollTop = element.scrollHeight
}

watch(
  () => messages.value.map((item) => `${item.id}:${item.status}:${item.content.length}:${item.steps.length}`).join('|'),
  () => scrollToBottom(),
)

watch(isOpen, (open) => {
  if (open) {
    scrollToBottom(true)
    nextTick(() => inputRef.value?.focus())
  }
})

watch(
  () => messages.value.length,
  (count, previous) => {
    if (count === 0) showQuick.value = true
    if (count > previous) scrollToBottom(true)
  },
)

watch(isAuthPage, (value) => {
  if (value) closePanel()
})

const submit = async () => {
  if (sending.value) return
  const text = draft.value.trim()
  if (!text) return
  if (!isAuthenticated.value) {
    showToast('请先登录后再咨询智能客服')
    return
  }
  draft.value = ''
  const started = await sendMessage(text)
  if (!started) draft.value = text
  scrollToBottom(true)
}

const useQuickQuestion = (question) => {
  if (sending.value) return
  draft.value = question
  showQuick.value = false
  submit()
}

const onKeydown = (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  submit()
}

const handleEscape = (event) => {
  if (event.key === 'Escape' && isOpen.value) closePanel()
}

const goLogin = () => {
  closePanel()
  navigate('/login')
}

const restart = () => {
  clearConversation()
  showQuick.value = true
  showToast('已开启新的客服会话')
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <div v-if="!isAuthPage" class="cs-widget">
    <transition name="cs-panel">
      <section v-if="isOpen" class="cs-panel" role="dialog" aria-label="拾汇商城智能客服">
        <header class="cs-head">
          <div class="cs-head-main">
            <span class="cs-head-avatar">客服</span>
            <div>
              <b>拾汇商城智能客服</b>
              <small>{{ serviceUnavailable ? '服务维护中' : '政策咨询 · 订单售后 · 投诉受理' }}</small>
            </div>
          </div>
          <div class="cs-head-actions">
            <button type="button" title="开启新会话" @click="restart">新会话</button>
            <button type="button" class="cs-close" title="收起客服" @click="closePanel">✕</button>
          </div>
        </header>

        <div v-if="serviceUnavailable" class="cs-banner">
          智能客服当前未配置大模型密钥，暂时无法对话，请稍后再试或联系人工客服。
        </div>

        <div ref="scroller" class="cs-body" aria-live="polite">
          <div v-if="!isAuthenticated" class="cs-guest">
            <p class="cs-guest-title">登录后即可咨询智能客服</p>
            <p class="cs-guest-desc">登录后可询问退换货、运费、发票、价保、订单进度等问题，也可以直接提交投诉诉求。</p>
            <button type="button" class="cs-primary" @click="goLogin">立即登录</button>
          </div>

          <template v-else>
            <div v-if="!messages.length" class="cs-welcome">
              <p class="cs-welcome-title">你好，我是拾汇商城智能客服</p>
              <p class="cs-welcome-desc">我会依据平台政策知识库回答你的问题；如果要投诉商家，也可以直接告诉我订单号和诉求。</p>
              <div class="cs-quick">
                <button
                  v-for="question in QUICK_QUESTIONS"
                  :key="question"
                  type="button"
                  class="cs-quick-item"
                  @click="useQuickQuestion(question)"
                >{{ question }}</button>
              </div>
            </div>

            <div v-for="message in messages" :key="message.id" class="cs-row" :class="`is-${message.role}`">
              <span class="cs-avatar">{{ message.role === 'user' ? '我' : 'AI' }}</span>
              <div class="cs-bubble">
                <template v-if="message.content">
                  <template v-for="(block, blockIndex) in renderBlocks(message.content)" :key="blockIndex">
                    <p v-if="block.type === 'p'" class="cs-line">
                      <template v-for="(part, partIndex) in block.items" :key="partIndex">
                        <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
                        <code v-else-if="part.type === 'code'">{{ part.text }}</code>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </p>
                    <ol v-else-if="block.type === 'ol'" class="cs-list" :start="block.start">
                      <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                        <template v-for="(part, partIndex) in item" :key="partIndex">
                          <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
                          <code v-else-if="part.type === 'code'">{{ part.text }}</code>
                          <template v-else>{{ part.text }}</template>
                        </template>
                      </li>
                    </ol>
                    <ul v-else class="cs-list">
                      <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                        <template v-for="(part, partIndex) in item" :key="partIndex">
                          <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
                          <code v-else-if="part.type === 'code'">{{ part.text }}</code>
                          <template v-else>{{ part.text }}</template>
                        </template>
                      </li>
                    </ul>
                  </template>
                </template>
                <p v-else-if="message.status === 'streaming'" class="cs-typing"><i></i><i></i><i></i></p>

                <div v-if="message.steps.length" class="cs-steps">
                  <span
                    v-for="(step, stepIndex) in message.steps"
                    :key="`${message.id}-${stepIndex}`"
                    class="cs-step"
                    :class="{ 'is-running': message.status === 'streaming' && stepIndex === message.steps.length - 1 }"
                  >{{ stepLabel(step, message.status === 'streaming' && stepIndex === message.steps.length - 1) }}</span>
                </div>

                <div v-if="messageSources(message).length" class="cs-sources">
                  <p class="cs-sources-title">参考依据</p>
                  <button
                    v-for="(source, sourceIndex) in messageSources(message)"
                    :key="`${message.id}-src-${sourceIndex}`"
                    type="button"
                    class="cs-source"
                    :title="source.snippet || ''"
                  >
                    <span class="cs-source-file">{{ source.source || '平台政策' }}</span>
                    <span v-if="source.section" class="cs-source-section">{{ source.section }}</span>
                    <em v-if="source.score">{{ Number(source.score).toFixed(2) }}</em>
                  </button>
                  <button
                    v-if="(message.sources || []).length > 3"
                    type="button"
                    class="cs-source-more"
                    @click="toggleSources(message.id)"
                  >{{ showAllSources[message.id] ? '收起' : `展开全部 ${message.sources.length} 条` }}</button>
                </div>

                <p v-if="message.status === 'error' && message.error" class="cs-error">
                  {{ message.error }}
                  <button type="button" @click="retryMessage(message)">重试</button>
                </p>
              </div>
            </div>

            <p v-if="toolHint" class="cs-hint">{{ toolHint }}</p>
          </template>
        </div>

        <footer class="cs-foot">
          <div v-if="isAuthenticated && showQuick && messages.length" class="cs-quick is-compact">
            <button
              v-for="question in QUICK_QUESTIONS.slice(0, 4)"
              :key="`foot-${question}`"
              type="button"
              class="cs-quick-item"
              @click="useQuickQuestion(question)"
            >{{ question }}</button>
          </div>

          <div class="cs-input">
            <textarea
              ref="inputRef"
              v-model="draft"
              :maxlength="MESSAGE_MAX_LENGTH"
              :disabled="!isAuthenticated"
              rows="1"
              :placeholder="isAuthenticated ? '描述你的问题，Enter 发送 / Shift+Enter 换行' : '登录后即可咨询'"
              @keydown="onKeydown"
            ></textarea>
            <button v-if="sending" type="button" class="cs-stop" @click="stopStreaming">停止</button>
            <button v-else type="button" class="cs-primary cs-send" :disabled="!canSend" @click="submit">发送</button>
          </div>

          <div class="cs-foot-meta">
            <span v-if="isAuthenticated && remaining < 100" class="cs-counter">还可输入 {{ remaining }} 字</span>
            <span v-else>回答基于平台政策知识库，如与人工客服答复不一致，以人工客服为准</span>
            <button
              v-if="isAuthenticated && messages.length"
              type="button"
              class="cs-quick-toggle"
              @click="showQuick = !showQuick"
            >{{ showQuick ? '收起常见问题' : '常见问题' }}</button>
          </div>
          <p v-if="error && !messages.length" class="cs-error cs-error-top">{{ error }}</p>
        </footer>
      </section>
    </transition>

    <button type="button" class="cs-launcher" :class="{ 'is-open': isOpen }" @click="togglePanel">
      <span class="cs-launcher-text">{{ isOpen ? '收起' : '客服' }}</span>
      <b v-if="unread > 0" class="cs-badge">{{ unread > 9 ? '9+' : unread }}</b>
    </button>
  </div>
</template>

<style scoped>
.cs-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 30;
}

.cs-launcher {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: #e51b2a;
  box-shadow: 0 8px 22px rgba(229, 27, 42, .32);
  transition: transform .18s, box-shadow .18s, background .18s;
}

.cs-launcher:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(229, 27, 42, .38);
}

.cs-launcher.is-open {
  background: #4a4f58;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .2);
}

.cs-launcher-icon {
  font-size: 20px;
  line-height: 1;
}

.cs-launcher-text {
  margin-top: 3px;
  font-size: 11px;
  letter-spacing: 1px;
}

.cs-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  color: #fff;
  background: #ff9500;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.cs-panel {
  position: absolute;
  right: 0;
  bottom: 76px;
  display: flex;
  flex-direction: column;
  width: 384px;
  height: 566px;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(28, 32, 40, .22);
}

.cs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  color: #fff;
  background: linear-gradient(135deg, #e51b2a, #ff5a48);
}

.cs-head-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cs-head-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #e51b2a;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
}

.cs-head b {
  display: block;
  font-size: 14px;
}

.cs-head small {
  display: block;
  margin-top: 2px;
  color: rgba(255, 255, 255, .82);
  font-size: 11px;
}

.cs-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cs-head-actions button {
  height: 26px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, .55);
  border-radius: 13px;
  color: #fff;
  background: transparent;
  font-size: 12px;
}

.cs-head-actions button:hover {
  background: rgba(255, 255, 255, .16);
}

.cs-head-actions .cs-close {
  width: 26px;
  padding: 0;
  border-radius: 50%;
  font-size: 13px;
}

.cs-banner {
  padding: 8px 14px;
  color: #8a5a00;
  background: #fff7e6;
  border-bottom: 1px solid #ffe1a8;
  font-size: 12px;
}

.cs-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #f7f8fa;
}

.cs-guest,
.cs-welcome {
  padding: 18px 16px;
  border: 1px solid #eceef1;
  border-radius: 8px;
  background: #fff;
}

.cs-guest {
  text-align: center;
}

.cs-guest-title,
.cs-welcome-title {
  margin: 0 0 8px;
  color: #282b33;
  font-size: 14px;
  font-weight: 700;
}

.cs-guest-desc,
.cs-welcome-desc {
  margin: 0;
  color: #7c828c;
  font-size: 12px;
  line-height: 1.7;
}

.cs-welcome-desc {
  margin: 0 0 12px;
}

.cs-guest .cs-primary {
  margin-top: 14px;
}

.cs-quick {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.cs-quick.is-compact {
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0 0 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cs-quick-item {
  padding: 7px 10px;
  border: 1px solid #e6e8ec;
  border-radius: 4px;
  color: #4a4f58;
  background: #fff;
  font-size: 12px;
  text-align: left;
  transition: border-color .15s, color .15s;
}

.cs-quick-item:hover {
  border-color: #e51b2a;
  color: #e51b2a;
}

.cs-quick.is-compact .cs-quick-item {
  flex: 0 0 auto;
  white-space: nowrap;
}

.cs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.cs-row.is-user {
  flex-direction: row-reverse;
}

.cs-avatar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  background: #b9bec7;
  font-size: 11px;
  font-weight: 700;
}

.cs-row.is-assistant .cs-avatar {
  background: #e51b2a;
}

.cs-bubble {
  max-width: 276px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(28, 32, 40, .08);
  font-size: 13px;
  line-height: 1.72;
  word-break: break-word;
}

.cs-row.is-user .cs-bubble {
  color: #fff;
  background: #e51b2a;
}

.cs-line {
  margin: 0 0 6px;
}

.cs-line:last-child {
  margin-bottom: 0;
}

.cs-list {
  margin: 4px 0 6px;
  padding-left: 18px;
}

.cs-list li {
  margin-bottom: 3px;
}

.cs-bubble code {
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, .06);
  font-size: 12px;
}

.cs-typing {
  display: flex;
  gap: 4px;
  margin: 2px 0;
}

.cs-typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c8ccd3;
  animation: cs-blink 1.1s infinite ease-in-out;
}

.cs-typing i:nth-child(2) {
  animation-delay: .18s;
}

.cs-typing i:nth-child(3) {
  animation-delay: .36s;
}

@keyframes cs-blink {
  0%, 80%, 100% { opacity: .3; }
  40% { opacity: 1; }
}

.cs-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.cs-step {
  padding: 3px 8px;
  border-radius: 10px;
  color: #7c828c;
  background: #f1f3f6;
  font-size: 11px;
}

.cs-step.is-running {
  color: #e51b2a;
  background: #fdecec;
}

.cs-sources {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e6e8ec;
}

.cs-sources-title {
  margin: 0 0 6px;
  color: #9ca1a9;
  font-size: 11px;
}

.cs-source {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-bottom: 4px;
  padding: 5px 8px;
  border: 1px solid #eceef1;
  border-radius: 4px;
  color: #4a4f58;
  background: #fbfcfd;
  font-size: 11px;
  text-align: left;
}

.cs-source:hover {
  border-color: #f3c2c6;
  color: #e51b2a;
}

.cs-source-file {
  flex: 0 0 auto;
  font-weight: 700;
}

.cs-source-section {
  flex: 1;
  overflow: hidden;
  color: #9ca1a9;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs-source em {
  flex: 0 0 auto;
  color: #c0c4cb;
  font-style: normal;
}

.cs-source-more {
  padding: 0;
  border: 0;
  color: #e51b2a;
  background: transparent;
  font-size: 11px;
}

.cs-error {
  margin: 6px 0 0;
  color: #d4380d;
  font-size: 12px;
}

.cs-row.is-user .cs-error {
  color: #ffe0dc;
}

.cs-error button {
  margin-left: 6px;
  padding: 1px 8px;
  border: 1px solid currentColor;
  border-radius: 9px;
  color: inherit;
  background: transparent;
  font-size: 11px;
}

.cs-error-top {
  margin: 6px 0 0;
  text-align: center;
}

.cs-hint {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: #8a5a00;
  background: #fff7e6;
  font-size: 12px;
}

.cs-foot {
  padding: 10px 12px 12px;
  border-top: 1px solid #eceef1;
  background: #fff;
}

.cs-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.cs-input textarea {
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  flex: 1;
  max-height: 92px;
  min-height: 38px;
  padding: 9px 10px;
  border: 1px solid #e2e5e9;
  border-radius: 6px;
  color: #282b33;
  background: #fbfcfd;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: 0;
}

.cs-input textarea:focus {
  border-color: #f0a6ac;
  background: #fff;
}

.cs-input textarea:disabled {
  color: #b9bec7;
  background: #f5f6f8;
}

.cs-primary {
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 6px;
  color: #fff;
  background: #e51b2a;
  font-size: 13px;
  font-weight: 700;
}

.cs-primary:hover:not(:disabled) {
  background: #cf1626;
}

.cs-primary:disabled {
  background: #f3c2c6;
  cursor: not-allowed;
}

.cs-stop {
  height: 38px;
  padding: 0 16px;
  border: 1px solid #e51b2a;
  border-radius: 6px;
  color: #e51b2a;
  background: #fff;
  font-size: 13px;
}

.cs-foot-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: #a5a8ad;
  font-size: 11px;
}

.cs-counter {
  color: #e51b2a;
}

.cs-quick-toggle {
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  color: #e51b2a;
  background: transparent;
  font-size: 11px;
}

.cs-panel-enter-active,
.cs-panel-leave-active {
  transition: opacity .2s, transform .2s;
}

.cs-panel-enter-from,
.cs-panel-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
