import { request } from "@/utils/request";
/** 查 */
export function getBillListApi(params: any) {
    return request({
        url: "/Bill/getList",
        method: "get",
        params
    })
}
