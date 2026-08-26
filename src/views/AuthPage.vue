<script setup>
import AuthShaderCanvas from '../components/AuthShaderCanvas.vue'
import { useMallAppContext } from '../composables/mallContext'

const {
  authMode,
  authForm,
  authEmail,
  authSubmitting,
  authMessage,
  authError,
  rememberLogin,
  emailCodeSending,
  emailCountdown,
  wechatQrUrl,
  wechatQrImage,
  wechatLoading,
  navigate,
  submitAuth,
  sendEmailCode,
  showToast,
  loadWeixinQr,
} = useMallAppContext()
</script>

<template>
  <main class="auth-page">
    <AuthShaderCanvas />
    <div class="auth-wrap page-width">
      <div class="auth-intro">
        <span class="auth-kicker">TENHUB · QUALITY SHOPPING</span>
        <h1>拾汇商城，<br /><b>把喜欢的生活带回家</b></h1>
        <p>精选品质好物，安全便捷的购物体验。</p>
        <div class="auth-intro-points"><span>✓ 正品保障</span><span>✓ 极速配送</span><span>✓ 会员专享</span></div>
      </div>
      <section class="auth-card" :aria-label="authMode === 'login' ? '登录' : '注册'">
        <div class="auth-card-head">
          <div><h2>{{ authMode === 'login' ? '欢迎登录' : '创建拾汇账号' }}</h2><p>{{ authMode === 'login' ? '登录后享受更多会员权益' : '注册即可领取新人专享礼包' }}</p></div>
          <button class="auth-switch" @click="navigate(authMode === 'login' ? '/register' : '/login')">{{ authMode === 'login' ? '立即注册' : '已有账号，去登录' }}</button>
        </div>
        <form class="auth-form" @submit.prevent="submitAuth">
          <label v-if="authMode === 'register'" class="auth-field"><span class="field-icon">♙</span><input v-model="authForm.userName" autocomplete="username" placeholder="请输入用户名（3-18个字符）" maxlength="18" /></label>
          <label class="auth-field"><span class="field-icon">@</span><input v-model="authEmail" autocomplete="email" type="email" placeholder="请输入邮箱地址" /></label>
          <label class="auth-field"><span class="field-icon">▣</span><input v-model="authForm.password" :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'" type="password" placeholder="请输入密码（8-21个字符）" minlength="8" maxlength="21" /></label>
          <div v-if="authMode === 'register'" class="auth-code-row"><label class="auth-field"><span class="field-icon">◇</span><input v-model="authForm.code" inputmode="numeric" maxlength="6" placeholder="请输入邮箱验证码" /></label><button type="button" class="code-button" :disabled="emailCodeSending || emailCountdown > 0" @click="sendEmailCode">{{ emailCountdown > 0 ? `${emailCountdown}s 后重发` : (emailCodeSending ? '发送中…' : '获取验证码') }}</button></div>
          <div v-if="authMode === 'login'" class="auth-options"><label><input v-model="rememberLogin" type="checkbox" /> 保持登录</label><a @click="showToast('请联系客户服务重置密码')">忘记密码？</a></div>
          <p v-if="authError" class="auth-feedback error">{{ authError }}</p><p v-if="authMessage" class="auth-feedback success">{{ authMessage }}</p>
          <button class="auth-submit" type="submit" :disabled="authSubmitting">{{ authSubmitting ? '提交中…' : (authMode === 'login' ? '登 录' : '同意协议并注册') }}</button>
        </form>
        <div class="auth-divider"><span>或使用其他方式</span></div>
        <button class="wechat-button" type="button" @click="loadWeixinQr"><span>◉</span>{{ wechatLoading ? '正在生成微信二维码…' : '微信登录 / 注册' }}</button>
        <div v-if="wechatQrUrl" class="wechat-qr-panel"><img :src="wechatQrImage" alt="微信登录二维码" /><div><b>微信扫码登录</b><p>请使用微信扫一扫，授权后即可登录或自动注册。</p><a :href="wechatQrUrl" target="_blank" rel="noreferrer">在微信中打开授权链接 ↗</a></div></div>
        <p class="auth-agreement">登录即代表你同意《拾汇商城用户协议》和《隐私政策》</p>
      </section>
    </div>
  </main>
</template>
