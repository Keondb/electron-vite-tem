<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElEmpty } from 'element-plus'
import { getListsApi } from '@/api/recognition'

// 只接收activeItem作为props
const props = defineProps({
  activeItem: [String, Number],
  // 添加刷新触发属性
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'copyCompanyName',
  'showBillDetails',
  'copyAmount',
  'showFlawDetails',
  'handleConfirm'
])

// 状态和数据
const loading = ref(false)
const tableData = ref<BillRecord[]>([])
const lastTimestampOrId = ref<number | null>(null)
const totalDataCount = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 计算分页数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return tableData.value.slice(start, end)
})

// 定义票据记录接口
interface BillRecord {
  time: string
  admin: string
  company: string
  billNumber: string
  amount: number
  status: string
  id?: string | number
  acceptor?: string
  is_flaw?: number
  flawCount?: number
  expirationDate?: string
  billRangeLower?: string
  billRangeUpper?: string
  bankCardNumber?: string
  bankName?: string
  bankCode?: string
  total_number?: number
  bill_id?: number
  companyMale?: Array<{
    id: number
    company_id: number
    company_name: string
    card_number: string
    line_number: string
    create_time: string
    delete_time: string | null
  }>
  flaws?: Array<{
    name: string
    count: number
    hitInfo: string
  }>
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 调用API获取数据，固定查询已完成状态
    const response = await getListsApi({
      is_finish: 1 // 已完成状态
    })

    if (response && response.code === 200 && response.data) {
      // 处理后端返回的数据
      const backendData = response.data.list || []
      // 获取最后一条数据的id
      if (backendData.length > 0) {
        lastTimestampOrId.value = backendData[backendData.length - 1].id
      } else {
        lastTimestampOrId.value = null
      }

      // 保存总数据量，用于判断是否还有更多数据
      totalDataCount.value = response.data.total || 0

      // 将后端数据转换为前端需要的格式
      tableData.value = backendData.map((item) => ({
        time: item.create_time, // 使用创建时间
        admin: item.admin_name,
        company: item.company_name,
        is_flaw: item.is_flaw,
        billNumber: `BILL${item.id.toString().padStart(3, '0')}`, // 生成票据编号
        amount: parseFloat(item.total_amount),
        status: item.is_finish === 0 ? '待处理' : '已完成',
        id: item.id,
        flawCount: item.flawCount,
        acceptor: '', // 后端数据中没有承兑人信息，设为空
        total_number: item.total_number, // 保存票据数量信息
        companyMale: item.companyMale || [] // 保存companyMale数据
      }))
    } else {
      showToast('获取数据失败')
    }
  } catch (error) {
    showToast('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 显示提示信息
const showToast = (message: string) => {
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

// 格式化时间函数
const formatTime = (dateString: string): string => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  // 判断是否为今天
  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (isToday) {
    return `今天 ${hours}:${minutes}`
  } else {
    return `${month}-${day} ${hours}:${minutes}`
  }
}

// 监听refreshTrigger变化，触发刷新
watch(
  () => props.refreshTrigger,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      // 重置页码并重新加载数据
      currentPage.value = 1
      loadData()
    }
  }
)

onMounted(() => {
  loadData()
})

const showModal = (row: any) => {
  console.log(row)
  row.flaws = 1
  try {
    console.log(JSON.stringify(row)) // 检查是否可序列化
  } catch (error) {
    console.error('row 不能被序列化:', error)
  }
  window.electron.ipcRenderer.invoke('create-bill-details-window', JSON.stringify(row))
}
const showFlawModal = (row: any) => {
  console.log(row)
  row.flaws = 2
  try {
    console.log(JSON.stringify(row)) // 检查是否可序列化
  } catch (error) {
    console.error('row 不能被序列化:', error)
  }
  window.electron.ipcRenderer.invoke('create-bill-details-window', JSON.stringify(row))
}
</script>

<template>
  <div class="mobile-list" :class="{ loading: loading }">
    <div v-if="loading" class="loading-spinner"></div>
    <div v-else>
      <div
        v-for="row in paginatedData"
        :key="row.time"
        :class="['list-item', activeItem === row.id ? 'list-item-active' : '']"
      >
        <div class="item-header">
          <div class="time-admin">
            <span class="time">{{ formatTime(row.time) }}</span>
            <span class="admin">{{ row.admin }}</span>
          </div>
          <span
            :class="['status', row.status === '已完成' ? 'status-success' : 'status-warning']"
            >{{ row.status }}</span
          >
        </div>
        <div class="company-info">
          <span
            class="company-name"
            style="cursor: pointer"
            @click="() => emit('copyCompanyName', row.company, row.id)"
            >{{ row.company }}</span
          >
        </div>
        <div class="company-info">
          <div class="company-stats">
            <span
              class="company-stat-item"
              style="cursor: pointer"
              @click="showModal(row)"
            >
              张数：<span style="color: #333">{{ row.total_number || 0 }}</span
              >张
            </span>
          </div>
        </div>
        <div class="company-info">
          <div class="company-stats">
            <div class="company-stats">
              <span
                class="company-stat-item"
                style="cursor: pointer"
                @click="() => emit('copyAmount', row.amount.toString())"
                >金额：{{ row.amount }} 元</span
              >
            </div>
          </div>
        </div>
        <div class="collapse-wrapper">
          <!-- 折叠面板内容已注释，保持与原组件一致 -->
        </div>
        <div class="item-footer">
          <div class="action-wrapper">
            <span
              v-if="row.is_flaw === 2"
              class="flaw-warning"
              style="
                margin-left: 5px;
                margin-right: 15px;
                cursor: pointer;
                background-color: #fef0f0;
                color: #f56c6c;
                border: 1px solid #fbc4c4;
                border-radius: 4px;
                padding: 6px;
              "
              @click.stop="showFlawModal(row)"
            >
            背书瑕疵 ({{ row.flawCount }})
            </span>
            <span v-else class="flaw-warningNo" style="margin-left: 5px; margin-right: 15px"
              >未检测到瑕疵情况</span
            >
            <button
              class="confirm-button"
              style="cursor: pointer"
              @click="emit('handleConfirm', row)"
            >
              {{ row.status === '待处理' ? '确认' : '撤回' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据时显示提示 -->
    <div v-if="!loading && paginatedData.length === 0" class="empty-state">
      <el-empty :image-size="200" />
    </div>
  </div>
</template>

<style scoped>
.bill-recognition-container {
  padding: 12px;
  background-color: #f5f5f5;

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
  /* height: 800px; 修改为固定高度800px，替换min-height: 100vh */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 添加overflow: hidden防止内容溢出 */
}

.top-info-panel {
  background-color: #e8f0fe;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* margin-bottom: 12px; */
  background-color: transparent;
}

.stats-panel {
  background-color: transparent;
  padding: 8px 0;
  margin-bottom: 0;
}

.bill-header,
.stats-panel {
  border-radius: 0;
  box-shadow: none;
  position: relative;
}

.status-tabs {
  display: flex;
  /* background-color: #f0f0f0; */
  /* border-radius: 20px; */
  overflow: hidden;
  color: #adadad;
}

.status-tab {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.status-tab.active {
  /* background-color: #007aff; */
  /* color: white; */
  color: #007aff;
  border-bottom: 2px solid #007aff;
  padding-bottom: 6px;
}

.refresh-button {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  /* background-color: #007aff; */
  /* color: white; */
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.refresh-icon {
  /* margin-right: 4px; */
  font-size: 16px;
}

.stats-panel {
  display: flex;
  justify-content: space-between;
  background-color: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 33.33%;
  text-align: center;
}

.stat-item .label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  width: 100%;
  text-align: center;
}

.stat-item .value {
  font-size: 16px;
  font-weight: bold;
  color: #007aff;
  width: 100%;
  text-align: center;
}

.scroll-container {
  position: relative;
  flex: 1;
  margin: 0 -12px;
  padding: 12px 12px 0;
  background-color: #f5f5f5;
  /* margin-top: 8px; */
  overflow: hidden; /* 添加overflow: hidden */
}

.mobile-list {
  position: relative;
  width: 100%;
  height: 620px; /* 固定高度计算 */
  overflow-y: auto; /* 保留滚动属性 */

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background-color: #f5f5f5;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #f5f5f5;
    border-radius: 3px;
    transition: background-color 0.3s;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #f5f5f5;
  }
}

.list-item {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}
.list-item-active {
  background-color: #e8f0fe !important;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.time-admin {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin {
  font-size: 12px;
  color: #666;
  padding-left: 8px;
  border-left: 1px solid #ddd;
}
.time {
  font-size: 12px;
  color: #666;
}

.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.status-success {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-warning {
  background-color: #fff3e0;
  color: #ff9800;
}

.company-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  text-indent: 2em;
}

.company-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-top: 10px;
  margin-right: 12px;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.company-name:hover {
  color: #007aff;
}

.company-stats {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 16px;
}

.company-stat-item {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  /* font-weight: bold; */
  transition: color 0.2s;
}

.company-stat-item[style*='cursor: pointer'] {
  cursor: pointer;
}

.item-details {
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  margin-bottom: 4px;
  font-size: 14px;
}

.label {
  color: #666;
  width: 60px;
}

.value {
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-footer {
  display: flex;
  /* justify-content: flex-end; */
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid #ddd;
  width: 100%;
}

.action-wrapper {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.confirm-button {
  background: none;
  border: none;
  color: #f0f0f0;
  font-size: 14px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  background-color: #007aff;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-spinner::after {
  content: '';
  width: 30px;
  height: 30px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.load-more {
  text-align: center;
  margin-top: 16px;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.load-more-button {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.3s ease;
}

.load-more-button:hover {
  background-color: #007aff;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-spinner::after {
  content: '';
  width: 30px;
  height: 30px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.load-more {
  text-align: center;
  margin-top: 16px;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.load-more-button {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  cursor: pointer;
}

.mobile-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
}

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
  max-height: 70vh; /* 减小最大高度 */
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  /* 隐藏滚动条但保留滚动功能 */
  &::-webkit-scrollbar {
    width: 0;
    display: none;
  }

  /* 兼容Firefox */
  scrollbar-width: none;

  /* 兼容IE */
  -ms-overflow-style: none;
}

.flaw-modal-content {
  background-color: #fff9f0;
  border: 1px solid #ffecd1;
}

.bill-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px; /* 减小上下内边距 */
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
}

.bill-details-header h3 {
  margin: 0; /* 移除标题的默认外边距 */
  font-size: 16px; /* 稍微减小标题字体大小 */
}

.bill-details-body {
  padding: 16px;
  background-color: #fff9f0;
  border-radius: 8px;
  border: 1px solid #ffecd1;
  margin-bottom: 16px;
}

.flaw-details .bill-table {
  border: 1px solid #ffecd1;
  background-color: #fff;
}

.flaw-details .bill-table-header {
  background-color: #fff3e0;
}

.flaw-details .header-cell:last-child {
  flex: 2;
  text-align: left;
}

.flaw-details .table-cell:last-child {
  flex: 2;
  text-align: left;
  white-space: normal;
  word-break: break-word;
}

.bill-cards {
  display: flex;
  flex-direction: column;
  gap: 12px; /* 减小卡片之间的间距 */
}

.bill-card {
  background-color: white;
  border-radius: 8px;
  padding: 12px; /* 减小内边距 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bill-card.flaw-card {
  background-color: #fff0f0; /* 浅红色背景 */
  border: 1px solid #ff0000; /* 大红色边框 */
}

.bill-card-item {
  display: flex;
  margin-bottom: 4px; /* 减小底部外边距 */
  padding: 4px 0; /* 减小上下内边距 */
  border-bottom: 1px solid #eee;
}

.bill-card-item:last-child {
  border-bottom: none;
}

.bill-card-label {
  color: #666;
  font-size: 14px;
  min-width: 90px;
  flex-shrink: 0;
}

.bill-card-value {
  color: #333;
  font-weight: 500;
  font-size: 14px;
  flex: 1;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.delete-button {
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
  /* font-weight: bold; */
  font-size: 12px;
  color: #c5c5c5;
}
.flaw-warningNo {
  color: #bebebe;
  font-size: 12px;
}

.flaw-item {
  background-color: #fff0f0; /* 浅红色背景 */
  border: 1px solid #ff0000; /* 大红色边框 */
  position: relative;
}

.flaw-item::before {
  content: '⚠️';
  position: absolute;
  top: -8px;
  right: -8px;
  background: #fff9f0;
  border: 1px solid #ffecd1;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.bill-table-row:last-child {
  border-bottom: none;
}

.bill-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
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
  text-align: center;
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

.bill-table-row .table-cell {
  flex: 1;
  padding: 10px 8px;
  text-align: center;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-table-row .table-cell.copyable {
  cursor: pointer;
  position: relative;
}

.bill-table-row .table-cell.copyable:hover {
  color: #409eff;
}

.bill-table-row .table-cell.copyable:hover::after {
  content: '复制';
  position: absolute;
  top: -18px;
  right: 5px;
  font-size: 12px;
  color: #007aff;
  opacity: 0.8;
  background-color: #f0f7ff;
  padding: 2px 4px;
  border-radius: 2px;
}

.bill-table-row {
  display: flex;
  border-bottom: 1px solid #eee;
}

.bill-table-row .table-cell {
  flex: 1;
  padding: 8px;
  text-align: center;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-collapse {
  margin-bottom: 10px;
  border: none;
}

.collapse-title {
  font-size: 14px;
  color: #666;
  transition: color 0.2s;
}

.collapse-title:hover {
  color: #007aff;
}

.collapse-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.collapse-content {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.collapse-content-primary {
  background-color: #f0f7ff;
  border: 1px solid #d0e3ff;
  padding: 16px;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
}

.collapse-content-secondary {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 16px;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
}

.content-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.detail-row {
  display: flex;
  margin-bottom: 6px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.detail-label {
  color: #666;
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.flaw-details {
  padding: 12px;
  background-color: #fff9f0;
  border-radius: 8px;
  border: 1px solid #ffecd1;
}

.flaw-details .detail-row {
  margin-bottom: 12px;
}

.flaw-details .detail-label {
  font-weight: bold;
  color: #666;
  min-width: 80px;
}

.flaw-details .detail-value {
  color: #333;
}

.flaw-details .flaw-warning {
  color: #f56c6c;
  font-weight: bold;
}

.flaw-item {
  background-color: #fff9f0;
  border: 1px solid #ffecd1;
}
</style>
