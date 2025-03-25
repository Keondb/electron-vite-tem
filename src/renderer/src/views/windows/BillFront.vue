<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getBillDetailApi } from '@/api/recognition'

// 用于保存主进程发送过来的票据数据
const receivedData = ref<any>(null)
onMounted(() => {
  console.log('BillFront.vue - onMounted: 注册 bill-data 监听器')
  window.electron.ipcRenderer.on('bill-data', handleBillData)
  // 主动通知主进程，告知子窗口已就绪
  console.log('BillFront.vue - 通知主进程已就绪')
  window.electron.ipcRenderer.send('child-ready')
  // getBillDetail(1)
})
// 定义回调函数来处理 'bill-data' 消息
const handleBillData = (_event: any, data: any) => {
  console.log('接收到票据详情数据:', data)
  // 将接收到的JSON字符串转换为JSON数组
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (error) {
      console.error('JSON解析失败:', error)
      data = []
    }
  }
  receivedData.value = data
  console.log('receivedData:', receivedData.value)
  getBillDetail(data.bill_id)
}
// 在组件卸载时移除监听器，防止内存泄漏
onBeforeUnmount(() => {
  console.log('BillFront.vue - onBeforeUnmount: 移除 bill-data 监听器')
  receivedData.value = null
  window.electron.ipcRenderer.removeListener('bill-data', handleBillData)
})
// 获取指定ID之后的票据列表数据
const getBillDetail = async (id: number) => {
  try {
    // 调用API获取指定ID之后的数据
    const response = await getBillDetailApi({
      bill_id: id,
      type: 'front'
    })

    if (response && response.code === 200 && response.data) {
      // 处理后端返回的数据
      const backendData = response.data.front || []
      console.log('后端返回的数据:', backendData)
      // 如果有新数据
      frontlist.value = backendData
    }

    return null
  } catch (error) {
    console.error('获取票据列表数据失败:', error)
    showToast('获取票据列表数据失败')
    return null
  } finally {
    // 隐藏加载状态
  }
}
// 显示提示信息
const showToast = (message) => {
  // 先移除可能存在的旧toast
  const oldToast = document.querySelector('.mobile-toast')
  if (oldToast) {
    document.body.removeChild(oldToast)
  }

  const toast = document.createElement('div')
  toast.className = 'mobile-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast)
    }
  }, 2000)
}

const frontlist = ref<any>({})
</script>

<template>
  <div class="front">
    <div class="connt">
      <div class="log">
        <img src="@/assets/bill/face/front_log.png" alt="" />
      </div>
      <div class="title">电子银行承兑汇票</div>
      <div class="row">
        <div class="piece">出票日期：{{ frontlist.billOutDate }}</div>
        <div class="piece">票据状态：{{ frontlist.billState }}</div>
      </div>
      <div class="row">
        <div class="piece">汇票到期日：{{ frontlist.expirationDate }}</div>
        <div class="piece">票据号码：{{ frontlist.billNo }}</div>
      </div>
      <div class="table">
        <table>
          <tr>
            <td rowspan="4" class="width10 text-align-center">出票人</td>
            <td class="width10 text-align-center">账户</td>
            <td>{{ frontlist.drawerAccount }}</td>
            <td rowspan="4" class="width10 text-align-center">收款人</td>
            <td class="width10 text-align-center">账户</td>
            <td>{{ frontlist.takerAccount }}</td>
          </tr>
          <tr>
            <td class="width10 text-align-center">全称</td>
            <td>{{ frontlist.drawerName }}</td>
            <td class="width10 text-align-center">全称</td>
            <td>{{ frontlist.takerName }}</td>
          </tr>
          <tr>
            <td class="width10 text-align-center">开户行</td>
            <td>{{ frontlist.drawerOpenAccBankName }}</td>
            <td class="width10 text-align-center">开户行</td>
            <td>{{ frontlist.takerOpenAccBankName }}</td>
          </tr>
          <tr>
            <td class="width10 text-align-center">开户行号</td>
            <td>{{ frontlist.drawerOpenAccBankNo }}</td>
            <td class="width10 text-align-center">开户行号</td>
            <td>{{ frontlist.takerOpenAccBankNo }}</td>
          </tr>
          <tr>
            <td colspan="2" class="text-align-center">出票人保证信息</td>
            <td>
              <div>&nbsp;保证人账号：{{ frontlist.drawerGuarantorAccount }}</div>
              <div>&nbsp;保证人名称：{{ frontlist.drawerGuarantorName }}</div>
            </td>
            <td colspan="3">
              <div style="display: flex">
                <div style="text-align: right">
                  <div>&nbsp;保证人开户行：</div>
                  <div>&nbsp;保证人开户行号：</div>
                </div>
                <div>
                  <div>{{ frontlist.drawerOpenAccBankName }}</div>
                  <div>{{ frontlist.drawerOpenAccBankNo }}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="text-align-center">票据金额</td>
            <td>&nbsp;小写：¥{{ frontlist.billAmount }}</td>
            <td colspan="3">&nbsp;人民币（大写）：{{ frontlist.bigCnBillAmount }}</td>
          </tr>
          <tr>
            <td colspan="2" class="text-align-center">承兑人</td>
            <td>
              <div>&nbsp;承兑人账号：{{ frontlist.acceptorAccount }}</div>
              <div>&nbsp;承兑人名称：{{ frontlist.acceptorName }}</div>
            </td>
            <td colspan="3">
              <div style="display: flex">
                <div style="text-align: right">
                  <div>&nbsp;承兑人开户行：</div>
                  <div>&nbsp;承兑人开户行号：</div>
                </div>
                <div>
                  <div>{{ frontlist.acceptorBankName }}</div>
                  <div>{{ frontlist.acceptorBankNo }}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="width10 text-align-center">交易合同号</td>
            <td>&nbsp;{{ frontlist.businessContractNo }}</td>
            <td rowspan="3">承兑信息</td>
            <td colspan="2">&nbsp;出票人承诺：{{ frontlist.drawerPromise }}</td>
          </tr>
          <tr>
            <td rowspan="2" colspan="2" class="width10 text-align-center">是否可转让</td>
            <td rowspan="2">&nbsp;{{ frontlist.transferStatus }}</td>
            <td colspan="2">&nbsp;承兑人承兑：{{ frontlist.acceptorPromise }}</td>
          </tr>
          <tr>
            <td colspan="2">&nbsp;承兑日期：{{ frontlist.acceptorDate }}</td>
          </tr>
          <tr>
            <td colspan="2" class="text-align-center">承兑人保证信息</td>
            <td>
              <div>&nbsp;保证人账号：{{ frontlist.acceptorGuarantorAccount }}</div>
              <div>&nbsp;保证人名称：{{ frontlist.acceptorGuarantorName }}</div>
            </td>
            <td colspan="3">
              <div style="display: flex">
                <div style="text-align: right">
                  <div>&nbsp;保证人开户行：</div>
                  <div>&nbsp;保证人开户行号：</div>
                </div>
                <div>
                  <div>{{ frontlist.acceptorGuarantorBankName }}</div>
                  <div>{{ frontlist.acceptorGuarantorBankNo }}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="width10 text-align-center">评级信息</td>
            <td colspan="4" style="padding: 0 !important; margin: 0 !important">
              <div style="display: flex">
                <div style="border-right: 1px solid #000; padding: 6px">出票人</div>
                <div
                  style="
                    width: 80%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  "
                >
                  <div>评级主体：{{ frontlist.drawerMainBody }}</div>
                  <div>信用等级：{{ frontlist.drawerCreditRating }}</div>
                  <div>评级到期日：{{ frontlist.drawerCommentDate }}</div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="width10 text-align-center">备注</td>
            <td colspan="4">&nbsp;</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.front {
  width: 100%;
  // 背景渐变色中间向两边渐变
  background: linear-gradient(to right, #ddf1f8 0%, #fdebdd 50%, #ddf1f8 100%);
  .connt {
    width: 98%;
    margin: 0 auto;
    .log {
      width: 100%;
      height: 100px;
      img {
        width: 25%;
      }
    }
    .title {
      font-size: 32px;
      font-weight: bold;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .row {
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      .piece {
        width: 50%;
      }
    }
    .table {
      width: 100%;
      table {
        width: 100%;
        border: 1px solid #000;
        border-spacing: 0 !important; /* 使用 !important 强制应用样式 */
        border-collapse: collapse; /* 合并边框 */
        tr {
          border-top: 1px solid #000;
          td {
            padding: 8px;
            border-right: 1px solid #000;
            box-sizing: border-box; /* 让 padding 和 border 包含在总宽度和高度中 */
          }
        }
      }
    }
  }
}

.width10 {
  width: 10%;
}
.text-align-center {
  text-align: center;
}
</style>
