<template>
  <div class="bill-detail">
    <div class="bill-details-header">
      <h3>票据详情</h3>
    </div>
    <div class="search-container">
      <input
        type="text"
        v-model="searchQuery"
        class="search-input"
        placeholder="请输入搜索内容"
        @input="handleSearch"
      />
      <button v-if="searchQuery" class="clear-button" @click="clearSearch">×</button>
    </div>
    <div class="bill-details-body">
      <div class="bill-cards">
        <div
          v-for="row in currentCompanyBills"
          :key="row.billNumber"
          :class="['bill-card', row.is_flaw === 2 ? 'flaw-card' : '']"
        >
          <div class="bill-card-header">
            <div class="bill-card-info">
              <span class="bank-name">{{ row.bankName }}</span>
              <span class="divider">|</span>
              <span class="bill-date">{{ row.recognizerDate }}</span>
            </div>
            <div class="bill-card-actions">
              <button class="delete-button" @click.stop="deleteBill(row)">删除</button>
            </div>
          </div>
          <div class="bill-card-item bill-number-row">
            <div class="bill-number-info">
              <div class="bill-card-label">票号</div>
              <div
                class="bill-card-value bill-card-number copyable"
                @click="copyBillNumber(row.billNumber)"
              >
                {{ row.billNumber }}
              </div>
            </div>
            <div class="bill-buttons">
              <button class="front-button" @click="showModal(row)">正面</button>
              <span
                style="display: flex; justify-content: center; align-items: center"
                @click="showCopyModal(row)"
              >
                <el-icon>
                  <DocumentCopy />
                </el-icon>
              </span>
            </div>
          </div>
          <div class="bill-card-item bill-number-row">
            <div class="bill-number-info">
              <div class="bill-card-label">承兑人</div>
              <div
                class="bill-card-value bill-card-acceptance copyable"
                @click="copyAcceptor(row.acceptor)"
              >
                {{ row.acceptor || '-' }}
              </div>
            </div>
            <div class="bill-buttons">
              <button class="front-button" @click="showBackModal(row)">反面</button>
              <span
                @click="showCopyBackModal(row)"
                style="display: flex; justify-content: center; align-items: center"
                ><el-icon><DocumentCopy /></el-icon
              ></span>
            </div>
          </div>
          <div class="bill-card-item">
            <div class="bill-card-label">金额</div>
            <div
              class="bill-card-value copyable"
              @click="copyAmount(row.amount ? formatAmount(row.amount) : '-')"
            >
              {{ row.amount ? formatAmount(row.amount) : '-' }} 万元
            </div>
          </div>
          <div class="bill-card-item">
            <div class="bill-card-label">到期日期</div>
            <div class="bill-card-value">
              {{ row.expirationDate || '-' }}
              <span v-if="row.expirationDate" class="remaining-days">
                (剩余{{ calculateRemainingDays(row.expirationDate) }}天)
              </span>
            </div>
          </div>
          <div class="bill-card-item">
            <div class="bill-card-label">子票区间</div>
            <div class="bill-card-value">{{ row.billRangeLower }}</div>
            <div style="margin: 0 5px">-</div>
            <div class="bill-card-value">{{ row.billRangeUpper }}</div>
          </div>
          <div class="bill-card-item">
            <div class="bill-card-label">背书手数</div>
            <div class="bill-card-value">
              {{ row.endorsementCount || '0' }}手({{ receivedBillData.company }})
            </div>
          </div>
          <div class="bill-card-footer">
            <div v-if="row.is_flaw === 2" class="bill-card-value flaw-value">
              <div v-if="row.flaws && row.flaws.length > 0" class="flaw-tags">
                <span
                  v-for="(flaw, index) in row.flaws"
                  :key="index"
                  class="flaw-tag"
                  @click.stop="copyFlawName(flaw.flawName)"
                >
                  {{ flaw.flawName }} <span v-if="flaw.counts > 0">({{ flaw.counts }})</span>
                </span>
              </div>
              <div v-else>无瑕疵信息</div>
            </div>
            <div
              v-else
              style="margin-left: 5px; margin-right: 15px; font-size: 12px; color: #bebebe"
            >
              未检测到瑕疵情况
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 瑕疵票详情弹窗 -->
    <!-- <div v-if="showFlawModal" class="bill-details-modal">
      <div class="bill-details-content flaw-modal-content">
        <div class="bill-details-header">
          <h3>瑕疵票详情</h3>
          <span class="close-button" style="cursor: pointer" @click="showFlawModal = false">×</span>
        </div>
        <div v-if="currentFlawBill" class="bill-details-body">
          <div class="flaw-details">
            <div class="bill-table">
              <div class="bill-table-header">
                <div class="header-cell">票号</div>
                <div class="header-cell">瑕疵名</div>
              </div>
              <div
                v-if="currentFlawBill && currentFlawBill.flaws"
                v-for="(flaw, index) in currentFlawBill.flaws"
                :key="index"
                class="bill-table-row"
              >
                <div class="table-cell">{{ currentFlawBill.billNumber }}</div>
                <div
                  class="table-cell copyable"
                  style="cursor: pointer"
                  @click="copyFlawName(flaw.name)"
                >
                  {{ flaw.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { copyToClipboard } from '@/utils/clipboard'
import { getBillIdsListsApi, removeBillIdApi } from '@/api/recognition'
import { ElMessage, ElLoading } from 'element-plus'

// 用于保存主进程发送过来的票据数据
const receivedBillData = ref<any>(null)

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
  receivedBillData.value = data
  console.log('receivedBillData:', receivedBillData.value)
  // flaws
  // 判断瑕疵状态,不等于2时设为1 为空也是1
  if (!data.flaws || data.flaws !== 2) {
    data.flaws = 1
  }
  getBillIdsLists(data.id, 0, data.flaws)
}

// 在组件加载时注册 IPC 监听器
onMounted(() => {
  // 主动通知主进程，告知子窗口已就绪
  console.log('BillView.vue - 通知主进程已就绪')
  window.electron.ipcRenderer.send('child-ready')

  console.log('BillView.vue - onMounted: 注册 bill-data 监听器')
  window.electron.ipcRenderer.on('bill-data', handleBillData)
})

// 在组件卸载时移除监听器，防止内存泄漏
onBeforeUnmount(() => {
  console.log('BillView.vue - onBeforeUnmount: 移除 bill-data 监听器')
  receivedBillData.value = null
  window.electron.ipcRenderer.removeListener('bill-data', handleBillData)
})

// 获取指定ID之后的票据列表数据
const getBillIdsLists = async (id: number, isFinish = 0, is_flaw = 0) => {
  try {
    // 调用API获取指定ID之后的数据
    const response = await getBillIdsListsApi({
      id: id,
      is_finish: isFinish, // 0表示待处理状态，1表示已完成状态
      is_flaw: is_flaw // 0表示正常票据，1表示瑕疵票据
    })

    if (response && response.code === 200 && response.data) {
      // 处理后端返回的数据
      const backendData = response.data.list || []
      console.log('后端返回的数据:', backendData)
      // 如果有新数据
      if (backendData.length > 0) {
        // 将新数据转换为前端需要的格式并更新到当前票据列表中
        const newBills = backendData.map((item) => ({
          billNumber: item.billNo || '',
          acceptor: item.acceptor || '',
          amount: item.billAmount || 0,
          expirationDate: item.expirationDate || '',
          billRangeLower: item.billRangeLower || '',
          billRangeUpper: item.billRangeUpper || '',
          bankName: item.bankName || '',
          is_flaw: item.is_flaw || 1,
          bill_id: item.bill_id,
          flaws: item.bill_flaw || [],
          endorseCount: item.bill.endorseCount || 0,
          recognizerDate: item.bill.recognizerDate ? item.bill.recognizerDate.split(' ')[0] : ''
        }))

        // 更新票据列表
        currentCompanyBills.value = newBills

        // 返回最后一条数据的ID，用于下次请求
        return backendData[backendData.length - 1].id
      }
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

// 票据数据
const currentCompanyBills = ref<any>([])

// 瑕疵票相关
// const showFlawModal = ref(false)
// const currentFlawBill = ref(null)

// 搜索相关
const searchQuery = ref('')
const searchTimeout = ref<NodeJS.Timeout | null>(null)

// 显示瑕疵票详情
// const showFlawDetails = (row) => {
//   currentFlawBill.value = row
//   showFlawModal.value = true
// }

// 处理搜索
const handleSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = setTimeout(() => {
    if (!searchQuery.value) {
      // 如果搜索框为空，不做任何操作
      return
    }

    // 在本地进行搜索过滤
    const keyword = searchQuery.value.toLowerCase()
    const filteredBills = currentCompanyBills.value.filter((bill) => {
      return (
        bill.billNumber.toLowerCase().includes(keyword) ||
        (bill.acceptor && bill.acceptor.toLowerCase().includes(keyword)) ||
        (bill.expirationDate && bill.expirationDate.toLowerCase().includes(keyword))
      )
    })

    // 更新显示结果
    currentCompanyBills.value = filteredBills
  }, 300) // 300ms防抖
}

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
  // 恢复原始数据 (在实际应用中，这里应该重新加载数据)
  currentCompanyBills.value = []
}

// 复制瑕疵名函数
const copyFlawName = async (flawName) => {
  await copyToClipboard(flawName, {
    successMessage: '瑕疵名已复制'
  })
}

// 复制票号函数
const copyBillNumber = async (billNumber) => {
  if (billNumber) {
    await copyToClipboard(billNumber, {
      successMessage: '票号已复制'
    })
  }
}

// 复制承兑人函数
const copyAcceptor = async (acceptor) => {
  if (acceptor && acceptor !== '-') {
    await copyToClipboard(acceptor, {
      successMessage: '承兑人已复制'
    })
  }
}

// 复制金额函数
const copyAmount = async (amount) => {
  if (amount && amount !== '-') {
    await copyToClipboard(amount, {
      successMessage: '金额已复制'
    })
  }
}

// 删除票据函数
const deleteBill = async (row) => {
  // 使用原生confirm进行确认
  if (!window.confirm(`确定要删除票号为 ${row.billNumber} 的票据吗？`)) {
    return
  }

  try {
    // 调用API删除后端数据
    const response = await removeBillIdApi({
      bill_id: row.bill_id,
      id: receivedBillData.value.id
    })

    if (response && response.code === 200) {
      // 从当前列表中移除该票据
      currentCompanyBills.value = currentCompanyBills.value.filter(
        (item) => item.bill_id !== row.bill_id
      )

      // 显示提示信息
      showToast('删除成功')

      // 通知主进程，告知票据已删除，需要刷新主页面
      window.electron.ipcRenderer.send('bill-deleted', row.bill_id)
    } else {
      showToast(response?.message || '删除失败，请重试')
    }
  } catch (error) {
    console.error('删除票据失败:', error)
    showToast('删除失败，请重试')
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

// 计算剩余天数
const calculateRemainingDays = (expirationDate) => {
  if (!expirationDate) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expDate = new Date(expirationDate)
  expDate.setHours(0, 0, 0, 0)

  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : 0
}

// 格式化金额
const formatAmount = (amount) => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const showModal = (row: any) => {
  console.log(row)
  try {
    console.log(JSON.stringify(row)) // 检查是否可序列化
  } catch (error) {
    console.error('row 不能被序列化:', error)
  }
  window.electron.ipcRenderer.invoke('create-bill-front-details-window', JSON.stringify(row))
}
const showBackModal = (row: any) => {
  console.log(row)
  try {
    console.log(JSON.stringify(row)) // 检查是否可序列化
  } catch (error) {
    console.error('row 不能被序列化:', error)
  }
  window.electron.ipcRenderer.invoke('create-bill-back-details-window', JSON.stringify(row))
}

// 通用的票据复制函数，处理正面和反面票据的复制操作
const handleBillCopy = async (row: any, eventName: string) => {
  console.log(row)
  const loading = ElLoading.service({
    lock: true,
    text: 'Loading',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    const result = await window.electron.ipcRenderer.invoke(eventName, JSON.stringify(row))

    if (result.success) {
      console.log('复制成功')
      ElMessage({
        message: '复制成功',
        type: 'success'
      })
    } else {
      ElMessage({
        message: '复制失败',
        type: 'error'
      })
      console.log('复制失败')
    }

    console.log('replyMessage', result)
    return result
  } finally {
    loading.close()
  }
}

// 复制票据反面
const showCopyBackModal = async (row: any) => {
  await handleBillCopy(row, 'create-bill-back-copy-window')
}

// 复制票据正面
const showCopyModal = async (row: any) => {
  await handleBillCopy(row, 'create-bill-copy-window')
}
</script>

<style scoped>
.bill-detail {
  /* padding: 20px; */
  background-color: #f5f5f5;
}

.bill-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  background-color: white;
  border-radius: 8px 8px 0 0;
}

.bill-details-header h3 {
  margin: 0;
  font-size: 18px;
}

.search-container {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #409eff;
}

.clear-button {
  padding: 4px 8px;
  background: none;
  border: none;
  color: #909399;
  cursor: pointer;
  font-size: 16px;
}

.clear-button:hover {
  color: #409eff;
}

.bill-details-body {
  padding: 16px;
  background-color: #fff;
  border-radius: 0 0 8px 8px;
}

.bill-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: flex-start;
}

.bill-card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  width: 400px;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.bill-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.bill-card.flaw-card {
  background-color: #fff0f0;
  border: 1px solid #ff0000;
}

.bill-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eaeaea;
}

.bill-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #eaeaea;
}
.bill-card-info {
  display: flex;
  align-items: center;
}

.bank-name {
  font-weight: 600;
  color: #1a73e8;
  font-size: 14px;
}

.divider {
  margin: 0 8px;
  color: #ddd;
}

.bill-date {
  color: #666;
  font-size: 13px;
}

.bill-card-item {
  display: flex;
  margin-bottom: 8px;
  padding: 4px 0;
  /* border-bottom: 1px solid #f0f0f0; */
}

.bill-card-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.bill-card-label {
  color: #666;
  font-size: 14px;
  min-width: 64px;
  flex-shrink: 0;
  text-align: left;
}
.bill-card-number {
  width: 224px;
}
.bill-card-acceptance {
  width: 224px;
}

.bill-card-value {
  color: #333;
  font-weight: 500;
  font-size: 14px;
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  line-height: 1.4;
}

.remaining-days {
  margin-left: 8px;
  font-size: 12px;
  color: #ff9800;
  font-weight: normal;
}

.flaw-value {
  color: #f56c6c !important;
}

.view-more {
  margin-left: 8px;
  color: #409eff;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;
}

.bill-card-actions {
  display: flex;
  justify-content: flex-end;
}

.delete-button {
  background-color: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-button:hover {
  background-color: #e64242;
}

.view .delete-button {
  background-color: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-button:hover {
  background-color: #e64242;
}

.flaw-warning {
  color: #ff0000;
  font-weight: bold;
}

/* 瑕疵票详情弹窗样式 */
.bill-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.bill-details-content {
  background-color: white;
  border-radius: 8px;
  width: clamp(350px, 90%, 600px);
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.flaw-modal-content {
  background-color: #fff9f0;
  border: 1px solid #ffecd1;
}

.close-button {
  font-size: 20px;
  color: #909399;
  cursor: pointer;
}

.close-button:hover {
  color: #409eff;
}

/* 表格样式 */
.bill-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.bill-table-header {
  display: flex;
  background-color: #f5f7fa;
  font-weight: bold;
  border-bottom: 1px solid #ebeef5;
}

.header-cell {
  flex: 1;
  padding: 12px 8px;
  text-align: left;
  font-size: 14px;
  color: #606266;
}

.bill-table-row {
  display: flex;
  border-bottom: 1px solid #ebeef5;
}

.bill-table-row:hover {
  background-color: #f5f7fa;
}

.table-cell {
  flex: 1;
  padding: 12px 8px;
  text-align: left;
  font-size: 14px;
  color: #606266;
}

.table-cell.copyable:hover,
.bill-card-value.copyable:hover {
  color: #409eff;
  cursor: pointer;
}

/* 移动端提示样式 */
.mobile-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 2000;
  max-width: 80%;
  text-align: center;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.flaw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flaw-tag {
  display: inline-flex;
  align-items: center;
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
}

.flaw-tag:hover {
  background-color: #f56c6c;
  color: white;
}

.flaw-tag-info {
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.8;
}
.bill-number-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bill-number-info {
  display: flex;
  align-items: center;
}

.bill-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.front-button {
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.front-button:hover {
  background-color: #66b1ff;
}
</style>
