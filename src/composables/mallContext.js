import { inject } from 'vue'

export const mallAppKey = Symbol('mallApp')

export const useMallAppContext = () => {
  const mallApp = inject(mallAppKey)

  if (!mallApp) {
    throw new Error('商城应用上下文未初始化')
  }

  return mallApp
}
