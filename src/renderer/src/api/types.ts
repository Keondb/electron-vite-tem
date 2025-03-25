/** 所有 api 接口的响应数据都应该准守该格式 */
export interface ApiResponseData<T> {
  code: number
  data: T
  message: string
}