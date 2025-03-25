// src\api\auth\index.ts
import { request } from '@/utils/request'
import type * as auth from "./types"

/**
 * 登录API
 *
 * @returns
 */
export function loginApi(data: auth.LoginRequestDatas) {
  return request<auth.LoginResult>({
    url: '/auth/login',
    method: 'post',
    params: data
  })
}

/**
 * 获取用户信息
 *
 * @returns
 */
export function getUserInfoApi() {
  return request<auth.UserInfoResponseData>({
    url: '/auth/userInfo',
    method: 'get'
  })
}
