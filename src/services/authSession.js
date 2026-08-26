import { computed, readonly, ref } from 'vue'

const TOKEN_KEY = 'tenhub.auth.token'
const VALID_USER_TYPES = new Set(['user', 'admin'])

const token = ref('')
const tokenClaims = ref(null)
const currentMember = ref(null)
const persistent = ref(false)
let expiryTimer

const storageAvailable = () => typeof window !== 'undefined'

const decodeTokenClaims = (rawToken) => {
  if (typeof rawToken !== 'string') return null
  const parts = rawToken.trim().split('.')
  if (parts.length !== 3) return null

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = window.atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

const inspectToken = (rawToken) => {
  const claims = decodeTokenClaims(rawToken)
  const expiresAt = Number(claims?.exp) * 1000
  if (!claims?.sub || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null
  if (!VALID_USER_TYPES.has(claims.userType)) return null
  return { claims, expiresAt }
}

const removeStoredTokens = () => {
  if (!storageAvailable()) return
  try { window.sessionStorage.removeItem(TOKEN_KEY) } catch { /* storage may be disabled */ }
  try { window.localStorage.removeItem(TOKEN_KEY) } catch { /* storage may be disabled */ }
}

const clearAuthSession = () => {
  clearTimeout(expiryTimer)
  expiryTimer = undefined
  token.value = ''
  tokenClaims.value = null
  currentMember.value = null
  persistent.value = false
  removeStoredTokens()
}

const scheduleExpiry = (expiresAt) => {
  clearTimeout(expiryTimer)
  const remaining = expiresAt - Date.now()
  if (remaining <= 0) {
    clearAuthSession()
    return
  }
  expiryTimer = window.setTimeout(() => {
    if (expiresAt <= Date.now()) clearAuthSession()
    else scheduleExpiry(expiresAt)
  }, Math.min(remaining, 2_147_000_000))
}

const setAuthToken = (rawToken, { remember = false } = {}) => {
  const normalizedToken = typeof rawToken === 'string' ? rawToken.trim().replace(/^Bearer\s+/i, '') : ''
  const details = inspectToken(normalizedToken)
  if (!details) throw new Error('服务器返回的登录凭证无效')

  removeStoredTokens()
  if (storageAvailable()) {
    const targetStorage = remember ? window.localStorage : window.sessionStorage
    try {
      targetStorage.setItem(TOKEN_KEY, normalizedToken)
    } catch {
      throw new Error('浏览器禁止保存登录凭证，请检查隐私设置')
    }
  }

  token.value = normalizedToken
  tokenClaims.value = details.claims
  persistent.value = remember
  currentMember.value = null
  scheduleExpiry(details.expiresAt)
  return details.claims
}

const restoreAuthSession = () => {
  if (!storageAvailable()) return false
  const candidates = []
  try { candidates.push({ value: window.sessionStorage.getItem(TOKEN_KEY), remember: false }) } catch { /* ignore */ }
  try { candidates.push({ value: window.localStorage.getItem(TOKEN_KEY), remember: true }) } catch { /* ignore */ }

  for (const candidate of candidates) {
    if (!candidate.value || !inspectToken(candidate.value)) continue
    try {
      setAuthToken(candidate.value, { remember: candidate.remember })
      return true
    } catch {
      // Try the other storage location before giving up.
    }
  }
  clearAuthSession()
  return false
}

const setCurrentMember = (member) => {
  currentMember.value = member && typeof member === 'object' ? member : null
}

const authFetch = async (input, init = {}) => {
  const details = token.value ? inspectToken(token.value) : null
  if (token.value && !details) clearAuthSession()

  const headers = new Headers(init.headers || {})
  if (details) headers.set('Authorization', `Bearer ${token.value}`)
  const response = await fetch(input, { ...init, headers })
  if (response.status === 401 && details) clearAuthSession()
  return response
}

const isAuthenticated = computed(() => Boolean(token.value && tokenClaims.value))
const currentUserType = computed(() => tokenClaims.value?.userType || '')
const currentUserId = computed(() => tokenClaims.value?.sub || '')
const currentDisplayName = computed(() => currentMember.value?.nickname
  || currentMember.value?.username
  || currentMember.value?.email
  || (currentUserId.value ? `用户${currentUserId.value}` : ''))

restoreAuthSession()

export const useAuthSession = () => ({
  token: readonly(token),
  tokenClaims: readonly(tokenClaims),
  currentMember: readonly(currentMember),
  persistent: readonly(persistent),
  isAuthenticated,
  currentUserType,
  currentUserId,
  currentDisplayName,
  setAuthToken,
  clearAuthSession,
  setCurrentMember,
  authFetch,
})
