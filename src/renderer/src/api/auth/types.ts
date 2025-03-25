// src\api\auth\types.ts
import { ApiResponseData } from '../types'

/**
 * 登录请求参数
 */
export interface LoginRequestDatas {
    /**
     * 用户名
     */
    username?: string
    /**
     * 密码
     */
    password?: string
  }

  /**
   * 登录响应
   */
  export type LoginResult = ApiResponseData<{
    token: string
  }>



  // /**
  //  * 登录响应
  //  */
  // export interface LoginResult {
  //   /**
  //    * 访问token
  //    */
  //   token: string
  // }

  /**
   * 用户信息
   */

  export type UserInfoResponseData = ApiResponseData<{
    username: string
    nickname: string
    id: string
  }>
  // export interface UserInfo {
  //   /**
  //    * 用户名
  //    */
  //   nickName: string
  //   /**
  //    * 用户名
  //    */
  //   nickname: string
  //   /**
  //    * 用户名
  //    */
  //   username: string

  //   /**
  //    * 用户id
  //    */
  //   userId: string

  //   /**
  //    * 年龄
  //    */
  //   age: number
  // }
