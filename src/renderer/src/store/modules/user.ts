import { defineStore } from 'pinia'
import { ref } from 'vue'
import store from '@/store'
import { loginApi, getUserInfoApi } from '@/api/auth'
import cacheUtils from '@/utils/cacheUtils'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(cacheUtils.get('lang') || '')
  const username = ref<string>('')
  const nickname = ref<string>('')
  /** 登录 */
  const login = async ({ username, password }: any) => {
    const { data } = await loginApi({ username, password })
    cacheUtils.set('userToken', data.token)
    token.value = data.token
  }
  /** 获取用户详情 */
  const getInfo = async () => {
    const { data } = await getUserInfoApi()
    // console.log(data)
    username.value = data.username
    nickname.value = data.nickname
  }
  /** 重置 Token */
  const removeToken = () => {
    // deleteData('userToken')
    cacheUtils.remove('userToken')
  }
  /** 登出 */
  const logout = () => {
    removeToken()
    token.value = ''
  }

  return {
    token,
    username,
    nickname,
    login,
    getInfo,
    logout
  }
})

/** 在 setup 外使用 */
export function useUserStoreHook() {
  return useUserStore(store)
}
