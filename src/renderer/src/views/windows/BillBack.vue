<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getBillDetailApi } from '@/api/recognition'

const backlist = ref<any>([])
const inventory_id = ref<any>(0)

// 用于保存主进程发送过来的票据数据
const receivedData = ref<any>(null)
onMounted(() => {
  console.log('BillBack.vue - onMounted: 注册 bill-data 监听器')
  window.electron.ipcRenderer.on('bill-data', handleBillData)
  // 主动通知主进程，告知子窗口已就绪
  console.log('BillBack.vue - 通知主进程已就绪')
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
  inventory_id.value = data.billNumber
  getBillDetail(data.bill_id)
}
// 在组件卸载时移除监听器，防止内存泄漏
onBeforeUnmount(() => {
  console.log('BillBack.vue - onBeforeUnmount: 移除 bill-data 监听器')
  receivedData.value = null
  window.electron.ipcRenderer.removeListener('bill-data', handleBillData)
})
// 获取指定ID之后的票据列表数据
const getBillDetail = async (id: number) => {
  try {
    // 调用API获取指定ID之后的数据
    const response = await getBillDetailApi({
      bill_id: id,
      type: 'back'
    })

    if (response && response.code === 200 && response.data) {
      // 处理后端返回的数据
      const backendData = response.data.back || []
      console.log('后端返回的数据:', backendData)
      // 如果有新数据
      backlist.value = backendData
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

</script>

<template>
  <div class="back">
    <div class="connt">
      <div class="log">
        <img src="@/assets/bill/face/front_log.png" alt="" />
      </div>
      <div class="title">电子银行承兑汇票</div>
      <div>票据号码：{{ inventory_id }}</div>
      <div class="back_box">
        <div class="box" v-for="(item, index) in backlist" :key="index">
          <div class="box_title">转让背书</div>
          <div class="row">
            <div class="label">&nbsp;书人名称</div>
            <div>&nbsp;{{ item.endorseFirColumn }}</div>
          </div>
          <div class="row">
            <div class="label">&nbsp;被背书人名称</div>
            <div>&nbsp;{{ item.endorseSecColumn }}</div>
          </div>
          <div class="row">
            <div class="label">&nbsp;不得转让标记</div>
            <div>&nbsp;{{ item.endorseThrColumn }}</div>
          </div>
          <div class="row">
            <div class="label">&nbsp;背书日期</div>
            <div>&nbsp;{{ item.endorseForColumn }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.back {
  width: 100%;
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
    .back_box {
      width: 100%;
      .box {
        width: 100%;
        border: 1px solid #000;
        margin-bottom: 10px;
        .box_title {
          display: flex;
          justify-content: center;
          align-items: center;
          border-bottom: 1px solid #000;
        }
        .row {
          width: 100%;
          display: flex;
          border-bottom: 1px solid #000;

          .label {
            width: 20%;
            border-right: 1px solid #000;
          }
        }
      }
    }
  }
}
</style>
