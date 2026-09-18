/**
 * 智能客服（ai-customer-service）前端调用层。
 *
 * 与服务端 ``app/api/routes.py`` 的契约保持一致：
 * - ``POST {aiBase}/chat/stream``  SSE 流式对话，事件为 tool_start / token / done / error
 * - ``POST {aiBase}/chat``         一次性对话（降级用）
 * - ``GET  {aiBase}/health``       组件健康检查（无需 JWT）
 *
 * 除健康检查外，所有请求都必须携带用户 JWT —— 由 ``authFetch`` 统一注入。
 */
import { useAuthSession } from './authSession'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export const aiBase = (import.meta.env.VITE_AI_BASE_URL || `${apiBase}/ai`).replace(/\/$/, '')

const SESSION_KEY = 'tenhub.ai.session'
const HISTORY_KEY = 'tenhub.ai.history'
const HISTORY_LIMIT = 40

const storage = () => (typeof window === 'undefined' ? null : window.sessionStorage)

const readStorage = (key) => {
  const target = storage()
  if (!target) return ''
  try {
    return target.getItem(key) || ''
  } catch {
    return ''
  }
}

const writeStorage = (key, value) => {
  const target = storage()
  if (!target) return
  try {
    if (value) target.setItem(key, value)
    else target.removeItem(key)
  } catch {
    /* 隐私模式下 storage 可能被禁用，忽略即可 */
  }
}

export const readChatSessionId = () => readStorage(SESSION_KEY)
export const writeChatSessionId = (sessionId) => writeStorage(SESSION_KEY, sessionId || '')
export const clearChatSession = () => writeStorage(SESSION_KEY, '')

/** 读取本地留存的会话记录（仅保留可渲染字段，防止脏数据污染界面）。 */
export const readChatHistory = () => {
  const raw = readStorage(HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-HISTORY_LIMIT)
      .map((item) => ({
        id: String(item.id || `local-${Math.random().toString(36).slice(2)}`),
        role: item.role,
        content: item.content,
        sources: Array.isArray(item.sources) ? item.sources : [],
        steps: Array.isArray(item.steps) ? item.steps : [],
        usedTools: Array.isArray(item.usedTools) ? item.usedTools : [],
        status: item.status === 'error' ? 'error' : 'done',
        error: typeof item.error === 'string' ? item.error : '',
        createdAt: Number(item.createdAt) || Date.now(),
      }))
  } catch {
    return []
  }
}

/** 持久化会话记录（刷新页面后仍能继续上下文）。 */
export const writeChatHistory = (messages) => {
  const payload = (Array.isArray(messages) ? messages : [])
    .slice(-HISTORY_LIMIT)
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      sources: item.sources || [],
      steps: item.steps || [],
      usedTools: item.usedTools || [],
      status: item.status === 'error' ? 'error' : 'done',
      error: item.error || '',
      createdAt: item.createdAt,
    }))
  writeStorage(HISTORY_KEY, payload.length ? JSON.stringify(payload) : '')
}

export const clearChatHistory = () => writeStorage(HISTORY_KEY, '')

const describeHttpError = async (response) => {
  if (response.status === 401) return '登录已过期，请重新登录后再咨询'
  const fallback = `智能客服暂时不可用（HTTP ${response.status}）`
  const text = await response.text().catch(() => '')
  if (!text) return fallback
  try {
    const payload = JSON.parse(text)
    return payload?.detail || payload?.msg || payload?.message || fallback
  } catch {
    return text.length > 160 ? fallback : text
  }
}

/**
 * 从 SSE 缓冲区中切出完整事件。
 *
 * 兼容前置代理把行尾改写为 CRLF 的情况：只归一化完整的 ``\r\n`` 对，
 * 不会把跨分片的 ``\r`` + ``\n`` 误判成事件边界。
 * @returns {{events: Array<object|'[DONE]'>, rest: string}}
 */
export const drainSseEvents = (buffer) => {
  const events = []
  let rest = String(buffer || '').replace(/\r\n/g, '\n')
  let boundary = rest.indexOf('\n\n')
  while (boundary !== -1) {
    const block = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('')
    if (data === '[DONE]') events.push('[DONE]')
    else if (data) {
      try {
        events.push(JSON.parse(data))
      } catch {
        /* 忽略无法解析的片段（例如服务端的 keep-alive 注释） */
      }
    }
    boundary = rest.indexOf('\n\n')
  }
  return { events, rest }
}

/**
 * 流式对话。
 *
 * @param {object} options
 * @param {string} options.message   用户消息
 * @param {string} [options.sessionId] 会话 ID，用于多轮记忆
 * @param {'auto'|'rag'|'agent'} [options.mode] 路由模式
 * @param {AbortSignal} [options.signal] 中断信号
 * @param {(event: object) => void} options.onEvent 事件回调
 * @returns {Promise<string>} 完整回答
 */
export const streamChat = async ({ message, sessionId = '', mode = 'auto', signal, onEvent }) => {
  const { authFetch } = useAuthSession()
  const response = await authFetch(`${aiBase}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    credentials: 'include',
    body: JSON.stringify({ message, session_id: sessionId || null, mode }),
    signal,
  })

  if (!response.ok) throw new Error(await describeHttpError(response))

  let answer = ''
  const emit = (event) => {
    if (event?.type === 'token' && typeof event.content === 'string') answer += event.content
    if (typeof onEvent === 'function') onEvent(event)
  }

  // 网关若缓冲了 SSE（content-type 退化为 application/json），这里兜底解析整包响应
  const contentType = response.headers.get('content-type') || ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    const payload = await response.json().catch(() => null)
    if (payload?.answer) {
      emit({ type: 'done', ...payload })
      return payload.answer
    }
    throw new Error('智能客服返回了无法识别的响应格式')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false
  try {
    while (!finished) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = drainSseEvents(buffer)
      buffer = rest
      for (const event of events) {
        if (event === '[DONE]') {
          finished = true
          break
        }
        emit(event)
        if (event?.type === 'done') {
          finished = true
          break
        }
        if (event?.type === 'error') throw new Error(event.message || '智能客服处理失败，请稍后重试')
      }
    }
  } finally {
    // 主动取消读取，避免中断后连接悬挂
    reader.cancel().catch(() => {})
  }

  return answer
}

/** 非流式对话（流式不可用时的降级路径）。 */
export const chatOnce = async ({ message, sessionId = '', mode = 'auto', signal }) => {
  const { authFetch } = useAuthSession()
  const response = await authFetch(`${aiBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message, session_id: sessionId || null, mode }),
    signal,
  })
  if (!response.ok) throw new Error(await describeHttpError(response))
  const payload = await response.json().catch(() => ({}))
  return {
    answer: payload.answer || '',
    sessionId: payload.session_id || sessionId || '',
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    steps: Array.isArray(payload.steps) ? payload.steps : [],
    usedTools: Array.isArray(payload.used_tools) ? payload.used_tools : [],
  }
}

/** 探测智能客服组件状态；失败时静默返回 null，不影响主流程。 */
export const fetchServiceHealth = async (signal) => {
  try {
    const response = await fetch(`${aiBase}/health`, { signal, credentials: 'include' })
    if (!response.ok) return null
    const payload = await response.json()
    const components = Array.isArray(payload?.components) ? payload.components : []
    return {
      status: payload?.status || 'unknown',
      llmReady: components.find((item) => item?.name === 'llm')?.healthy !== false,
      components,
    }
  } catch {
    return null
  }
}
