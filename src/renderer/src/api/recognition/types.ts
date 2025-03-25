// 识别相关接口的类型定义
import { ApiResponseData } from '../types'

/** 识别列表项接口 */
export interface RecognitionItem {
  id: number
  company_id: number
  bill_ids: string
  create_time: string
  delete_time: string | null
  update_time: string
  total_number: number
  total_amount: string
  is_finish: number
  admin_id: number
  admin_name: string
  company_name: string
  recognition_count: number
  think_count: number
  flawCount?: number
  is_flaw?: number // 是否为瑕疵票，1表示否，2表示是
  companyMale?: Array<{
    id: number
    company_id: number
    company_name: string
    card_number: string
    line_number: string
    create_time: string
    delete_time: string | null
  }>
}

/** 识别列表数据结构 */
export interface RecognitionListData {
  list: RecognitionItem[]
  total: number
}

/** 识别列表接口返回类型 */
export type RecognitionListResponse = ApiResponseData<RecognitionListData>
