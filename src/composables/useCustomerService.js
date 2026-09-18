/**
 * 智能客服会话状态（模块级单例，供浮窗组件与页头入口共用）。
 *
 * 设计要点：
 * - 与服务端 ``POST /api/ai/chat/stream`` 的 SSE 事件一一对应：tool_start / token / done / error；
 * - 会话 ID 与最近 40 条消息写入 sessionStorage，刷新页面后仍可继续追问；
 * - 请求必须携带用户 JWT，未登录时只提示登录，不发起请求。
 */
import { reactive, ref } from 'vue'
import { useAuthSession } from '../services/authSession'
import {
  aiBase,
  clearChatHistory,
  clearChatSession,
  fetchServiceHealth,
  readChatHistory,
  readChatSessionId,
  streamChat,
  writeChatHistory,
  writeChatSessionId,
} from '../services/customerService'

/** 首屏引导问题：覆盖退货、运费、发货、发票、价保、售后等高频政策咨询。 */
export const QUICK_QUESTIONS = [
  '七天无理由退货需要什么条件？',
  '运费怎么算？满多少免运费？',
  '下单后多久发货、多久能到？',
  '发票怎么开？可以开增值税专用发票吗？',
  '商品降价了怎么申请价保？',
  '订单可以取消吗？退款多久到账？',
  '评价和晒单能得多少拾汇积分？',
]

const MESSAGE_MAX_LENGTH = 500

/** 工具名 -> 结果提示，用于在气泡下方补充一句「接下来做什么」。 */
const TOOL_RESULT_HINTS = {
  create_complaint_ticket: '已为您创建投诉工单，可在「我的订单」中跟踪处理进度。',
  list_my_complaints: '已为您查询工单记录，如需继续处理可直接说明诉求。',
}

const isOpen = ref(false)
const messages = ref(readChatHistory())
const sessionId = ref(readChatSessionId())
const sending = ref(false)
const unread = ref(0)
const error = ref('')
const health = ref(null)
const healthChecked = ref(false)
const toolHint = ref('')

let controller = null

const nextId = (role) => `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createMessage = (role, content, extra = {}) => reactive({
  id: nextId(role),
  role,
  content,
  sources: [],
  steps: [],
  usedTools: [],
  status: 'done',
  error: '',
  createdAt: Date.now(),
  ...extra,
})

const persist = () => writeChatHistory(messages.value)

const checkHealth = async () => {
  if (healthChecked.value) return
  healthChecked.value = true
  health.value = await fetchServiceHealth()
}

const openPanel = () => {
  isOpen.value = true
  unread.value = 0
  error.value = ''
  checkHealth()
}

const closePanel = () => {
  isOpen.value = false
}

const togglePanel = () => {
  if (isOpen.value) closePanel()
  else openPanel()
}

const clearConversation = () => {
  controller?.abort()
  controller = null
  sending.value = false
  messages.value = []
  sessionId.value = ''
  unread.value = 0
  error.value = ''
  toolHint.value = ''
  clearChatSession()
  clearChatHistory()
}
/**
 * 发送一条消息并流式接收回答。
 * @param {string} rawText 用户输入
 * @returns {Promise<boolean>} 是否成功发起
 */
const sendMessage = async (rawText) => {
  const { isAuthenticated } = useAuthSession()
  const text = String(rawText || '').trim()
  if (!text || sending.value) return false
  if (!isAuthenticated.value) {
    error.value = '登录后即可咨询智能客服'
    return false
  }
  if (text.length > MESSAGE_MAX_LENGTH) {
    error.value = `单条消息最多 ${MESSAGE_MAX_LENGTH} 字，请分次描述`
    return false
  }

  error.value = ''
  toolHint.value = ''
  messages.value.push(createMessage('user', text))
  const assistant = createMessage('assistant', '', { status: 'streaming' })
  messages.value.push(assistant)
  persist()

  sending.value = true
  controller = new AbortController()
  try {
    await streamChat({
      message: text,
      sessionId: sessionId.value,
      mode: 'auto',
      signal: controller.signal,
      onEvent: (event) => {
        if (!event || typeof event !== 'object') return
        if (event.type === 'token') {
          assistant.content += event.content || ''
        } else if (event.type === 'tool_start') {
          assistant.steps.push({ tool: event.tool, label: event.label, arguments: event.arguments || {} })
        } else if (event.type === 'done') {
          if (event.answer) assistant.content = event.answer
          if (Array.isArray(event.steps) && event.steps.length) assistant.steps = event.steps
          assistant.usedTools = Array.isArray(event.used_tools) ? event.used_tools : []
          if (event.session_id) {
            sessionId.value = event.session_id
            writeChatSessionId(event.session_id)
          }
        }
      },
    })

    if (assistant.status === 'streaming') assistant.status = 'done'
    if (!String(assistant.content || '').trim()) {
      assistant.status = 'error'
      assistant.error = '智能客服本次没有返回内容，请重试或换个说法'
    }
    const hint = assistant.usedTools.map((tool) => TOOL_RESULT_HINTS[tool]).find(Boolean)
    if (hint && assistant.status === 'done') toolHint.value = hint
  } catch (err) {
    if (err?.name === 'AbortError') {
      assistant.status = 'done'
      if (!String(assistant.content || '').trim()) assistant.content = '已停止本次回答。'
    } else {
      assistant.status = 'error'
      assistant.error = err?.message || '智能客服暂时不可用，请稍后重试'
      error.value = assistant.error
    }
  } finally {
    sending.value = false
    controller = null
    persist()
    if (!isOpen.value) unread.value += 1
  }
  return true
}

const stopStreaming = () => {
  controller?.abort()
}

/** 重试某条失败回答：丢弃该回答与其对应的提问，再重新发起。 */
const retryMessage = async (target) => {
  if (sending.value) return false
  const index = messages.value.findIndex((item) => item.id === target?.id)
  if (index < 0) return false
  let questionIndex = -1
  for (let i = index - 1; i >= 0; i -= 1) {
    if (messages.value[i]?.role === 'user') {
      questionIndex = i
      break
    }
  }
  if (questionIndex < 0) return false
  const question = messages.value[questionIndex].content
  messages.value.splice(questionIndex, index - questionIndex + 1)
  persist()
  return sendMessage(question)
}

export const useCustomerService = () => ({
  aiBase,
  isOpen,
  messages,
  sending,
  unread,
  error,
  health,
  toolHint,
  sessionId,
  openPanel,
  closePanel,
  togglePanel,
  clearConversation,
  sendMessage,
  stopStreaming,
  retryMessage,
  checkHealth,
})
