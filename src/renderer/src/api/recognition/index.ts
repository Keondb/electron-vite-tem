import { request } from '@/utils/request'
import type { RecognitionListResponse } from './types'

/** 查询识别列表 */
export function getListsApi(params: any): Promise<RecognitionListResponse> {
  return request({
    url: '/CompanyBillRecognition/getLists',
    method: 'get',
    params
  })
}

/** 查询公司列表 */
export function getCompanyMaleListsApi(params: any): Promise<any> {
  return request({
    url: '/CompanyMale/getLists',
    method: 'get',
    params
  })
}

/** 获取公司票据ID列表 */
export function getBillIdsListsApi(params: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/getBillIdsLists',
    method: 'get',
    params
  })
}

/** 获取票据正面详情 */
export function getBillFrontDetailApi(params: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/getBillFrontDetail',
    method: 'get',
    params
  })
}

/** 获取票据瑕疵列表 */
export function getBillFlawListApi(params: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/getBillFlawList',
    method: 'get',
    params
  })
}

/** 获取票据背面列表 */
export function getBillBackListApi(params: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/getBillBackList',
    method: 'get',
    params
  })
}

/** 确认完成 */
export function confirmFinishApi(data: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/confirmFinish',
    method: 'post',
    data
  })
}

/** 撤回确认 */
export function cancelFinishApi(data: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/cancelFinish',
    method: 'post',
    data
  })
}

/** 删除指定的bill_id */
export function removeBillIdApi(data: any): Promise<any> {
  console.log(data)
  return request({
    url: '/CompanyBillRecognition/removeBillId',
    method: 'post',
    data
  })
}

/** 获取统计数据 */
export function getStatisticsApi(params: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/getStatistics',
    method: 'get',
    params
  })
}

/** 获取指定ID之后的数据列表 */
export function getListsAfterIdApi(params: any): Promise<RecognitionListResponse> {
  return request({
    url: '/CompanyBillRecognition/getListsAfterId',
    method: 'get',
    params
  })
}

/** 根据传参返回票据正反面数据 */
export function getBillDetailApi(params: any): Promise<any> {
  return request({
    url: '/CompanyBillRecognition/getBillDetail',
    method: 'get',
    params
  })
}
