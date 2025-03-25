import { request } from "@/utils/request";
/** 查 */
export function getListApi(params: any) {
    return request({
        url: "/CompanyImport/getList",
        method: "get",
        params
    })
}
export function getDetailsApi(params: any) {
    return request({
        url: "/CompanyImport/getDetails",
        method: "get",
        params
    })
}
export function generateDataForUserApi(params: any) {
    return request({
        url: "/CompanyImport/generateDataForUser",
        method: "get",
        params
    })
}
