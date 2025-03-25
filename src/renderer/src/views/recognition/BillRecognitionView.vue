<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { copyToClipboard } from '@/utils/clipboard'
import {
  getListsApi,
  getBillIdsListsApi,
  removeBillIdApi,
  confirmFinishApi,
  cancelFinishApi,
  getStatisticsApi
} from '@/api/recognition'
import PendingBillList from './components/PendingBillList.vue'
import CompletedBillList from './components/CompletedBillList.vue'

// 状态和数据
const loading = ref(false)
const activeStatus = ref('待处理')
const stats = ref({
  companyCount: 0,
  billCount: 0,
  totalAmount: 0
})

// 后端返回的总数据量
const totalDataCount = ref(0)
// 表格数据
interface BillRecord {
  time: string
  admin: string
  company: string
  billNumber: string
  amount: number
  status: string
  id?: string | number
  acceptor?: string // 添加承兑人字段
  is_flaw?: number // 是否为瑕疵票，1表示否，2表示是
  expirationDate?: string // 到期日期
  billRangeLower?: string // 子票开始区间
  billRangeUpper?: string // 子票结束区间
  bankCardNumber?: string // 银行账号
  bankName?: string // 银行名称
  bankCode?: string // 银行行号
  total_number?: number // 票据数量
  bill_id?: number
  companyMale?: Array<{
    id: number
    company_id: number
    company_name: string
    card_number: string
    line_number: string
    create_time: string
    delete_time: string | null
  }> // 添加companyMale字段
  flaws?: Array<{
    name: string // 瑕疵名
    count: number // 出现次数
    hitInfo: string // 瑕疵命中信息
  }>
}

const tableData = ref<BillRecord[]>([])

// 记录最后一条数据的时间戳或 id，后端只返回最新的数据，所以需要记录最后一条数据的时间戳或 id，以便下次请求时传递给后端
const lastTimestampOrId = ref<number | null>(null)

// 分页
const currentPage = ref(1)

// 弹窗状态
const showBillModal = ref(false)
const showFlawModal = ref(false) // 添加瑕疵票弹窗状态
const currentFlawBill = ref<BillRecord | null>(null) // 当前显示的瑕疵票

const showBillDetails = async (company: string) => {
  showBillModal.value = true

  try {
    // 查找当前公司的ID
    const companyItem = tableData.value.find((item) => item.company === company)
    if (companyItem && companyItem.id) {
      // 调用API获取票据详情
      const response = await getBillIdsListsApi({
        id: companyItem.id
      })

      if (response && response.code === 200 && response.data) {
        // 处理API返回的数据，将billFlaw映射到flaws字段
        currentCompanyBills.value = response.data.list
          ? response.data.list.map((item: any) => {
              return {
                ...item,
                billNumber: item.billNo ? item.billNo : '-',
                amount: parseFloat(item.billAmount || '0'),
                acceptor: item.acceptor || '-',
                expirationDate: item.expirationDate || '-',
                billRangeLower: item.billRangeLower || '-',
                billRangeUpper: item.billRangeUpper || '-',
                is_flaw: item.is_flaw,
                // 将billFlaw或bill_flaw映射到flaws字段
                flaws: (item.billFlaw || item.bill_flaw || []).map((flaw: any) => ({
                  name: flaw.flawName,
                  count: flaw.counts,
                  hitInfo: flaw.remark
                }))
              }
            })
          : []
      } else {
        showToast('获取票据详情失败')
      }
    }
  } catch (error) {
    showToast('获取票据详情失败')
  }
}

// 显示所有票据详情
const showAllBillDetails = async () => {
  showBillModal.value = true

  try {
    // 调用API获取所有票据详情
    const response = await getBillIdsListsApi({
      all: 1 // 获取所有票据
    })

    if (response && response.code === 200 && response.data) {
      // 处理API返回的数据，将billFlaw映射到flaws字段
      currentCompanyBills.value = response.data.list
        ? response.data.list.map((item: any) => {
            return {
              ...item,
              billNumber: item.bill_id ? `BILL${item.bill_id.toString().padStart(3, '0')}` : '-',
              amount: parseFloat(item.billAmount || '0'),
              acceptor: item.acceptor || '-',
              expirationDate: item.expirationDate || '-',
              billRangeLower: item.billRangeLower || '-',
              billRangeUpper: item.billRangeUpper || '-',
              is_flaw: item.is_flaw,
              // 将billFlaw或bill_flaw映射到flaws字段
              flaws: (item.billFlaw || item.bill_flaw || []).map((flaw: any) => ({
                name: flaw.flawName,
                count: flaw.counts,
                hitInfo: flaw.remark
              }))
            }
          })
        : []
    } else {
      showToast('获取票据详情失败')
    }
  } catch (error) {
    showToast('获取票据详情失败')
  }
}

// 复制公司名称函数
const copyCompanyName = async (company: string, id: number) => {
  if (company) {
    await copyToClipboard(company, {
      successMessage: '公司名称已复制'
    })
    updateActiveItem(id)
  }
}

// 复制银行账号函数

// 复制银行行号函数

// 复制瑕疵名函数
// const copyFlawName = async (flawName: string) => {
//   await copyToClipboard(flawName, {
//     successMessage: '瑕疵名已复制'
//   })
// }

// 复制金额函数
const copyAmount = async (amount: string) => {
  if (amount) {
    await copyToClipboard(amount, {
      successMessage: '金额已复制'
    })
  }
}

// 删除票据函数
const deleteBill = async (row: BillRecord) => {
  // 使用原生confirm进行确认
  if (!window.confirm(`确定要删除票号为 ${row.billNumber} 的票据吗？`)) {
    return
  }
  console.log(row)
  // 检查bill_id是否存在
  if (!row.bill_id) {
    showToast('票据ID不存在，无法删除')
    return
  }
  try {
    // 调用API删除票据
    const response = await removeBillIdApi({
      bill_id: row.bill_id,
      id: row.id
    })

    if (response && response.code === 200) {
      showToast('删除成功')
      // 从当前列表中移除该票据
      currentCompanyBills.value = currentCompanyBills.value.filter(
        (item) => item.bill_id !== row.bill_id
      )
    } else {
      showToast('删除失败')
    }
  } catch (error) {
    showToast('删除失败')
  }
}

// 切换状态为待处理
const setStatusPending = () => {
  activeStatus.value = '待处理'
}

// 切换状态为已完成
const setStatusCompleted = () => {
  activeStatus.value = '已完成'
}

const showFlawDetails = (row: BillRecord) => {
  currentFlawBill.value = row
  showFlawModal.value = true
}

// 当前显示的公司票据
const currentCompanyBills = ref<BillRecord[]>([])

// 搜索相关
const searchQuery = ref('')
const searchTimeout = ref<NodeJS.Timeout | null>(null)

// 处理搜索
const handleSearch = async () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = setTimeout(async () => {
    try {
      if (!searchQuery.value) {
        // 如果搜索框为空，恢复原始数据
        // 获取当前显示的公司ID
        const companyId = currentCompanyBills.value[0]?.id
        if (companyId) {
          const response = await getBillIdsListsApi({
            id: companyId
          })

          if (response && response.code === 200 && response.data) {
            // 处理API返回的数据，将billFlaw映射到flaws字段
            currentCompanyBills.value = response.data.list
              ? response.data.list.map((item: any) => {
                  return {
                    ...item,
                    billNumber: item.billNo ? item.billNo : '-',
                    amount: parseFloat(item.billAmount || '0'),
                    acceptor: item.acceptor || '-',
                    expirationDate: item.expirationDate || '-',
                    billRangeLower: item.billRangeLower || '-',
                    billRangeUpper: item.billRangeUpper || '-',
                    is_flaw: item.is_flaw,
                    // 将billFlaw或bill_flaw映射到flaws字段
                    flaws: (item.billFlaw || item.bill_flaw || []).map((flaw: any) => ({
                      name: flaw.flawName,
                      count: flaw.counts,
                      hitInfo: flaw.remark
                    }))
                  }
                })
              : []
          }
        }
        return
      }

      // 调用API进行搜索
      const response = await getBillIdsListsApi({
        keyword: searchQuery.value
      })

      if (response && response.code === 200 && response.data) {
        // 处理API返回的数据，将billFlaw映射到flaws字段
        currentCompanyBills.value = response.data.list
          ? response.data.list.map((item: any) => {
              return {
                ...item,
                billNumber: item.bill_id ? `BILL${item.bill_id.toString().padStart(3, '0')}` : '-',
                amount: parseFloat(item.billAmount || '0'),
                acceptor: item.acceptor || '-',
                expirationDate: item.expirationDate || '-',
                billRangeLower: item.billRangeLower || '-',
                billRangeUpper: item.billRangeUpper || '-',
                is_flaw: item.is_flaw,
                // 将billFlaw或bill_flaw映射到flaws字段
                flaws: (item.billFlaw || item.bill_flaw || []).map((flaw: any) => ({
                  name: flaw.flawName,
                  count: flaw.counts,
                  hitInfo: flaw.remark
                }))
              }
            })
          : []
      } else {
        showToast('搜索失败')
      }
    } catch (error) {
      showToast('搜索失败')
    }
  }, 300) // 300ms防抖
}

// 清空搜索
const clearSearch = async () => {
  searchQuery.value = ''
  // 恢复原始数据
  try {
    // 获取当前显示的公司ID
    const companyId = currentCompanyBills.value[0]?.id
    if (companyId) {
      const response = await getBillIdsListsApi({
        id: companyId
      })

      if (response && response.code === 200 && response.data) {
        // 处理API返回的数据，将billFlaw映射到flaws字段
        currentCompanyBills.value = response.data.list
          ? response.data.list.map((item: any) => {
              return {
                ...item,
                billNumber: item.bill_id ? `BILL${item.bill_id.toString().padStart(3, '0')}` : '-',
                amount: parseFloat(item.billAmount || '0'),
                acceptor: item.acceptor || '-',
                expirationDate: item.expirationDate || '-',
                billRangeLower: item.billRangeLower || '-',
                billRangeUpper: item.billRangeUpper || '-',
                is_flaw: item.is_flaw,
                // 将billFlaw或bill_flaw映射到flaws字段
                flaws: (item.billFlaw || item.bill_flaw || []).map((flaw: any) => ({
                  name: flaw.flawName,
                  count: flaw.counts,
                  hitInfo: flaw.remark
                }))
              }
            })
          : []
      }
    } else {
      // 如果没有公司ID，则获取所有票据
      const response = await getBillIdsListsApi({
        all: 1
      })

      if (response && response.code === 200 && response.data) {
        // 处理API返回的数据，将billFlaw映射到flaws字段
        currentCompanyBills.value = response.data.list
          ? response.data.list.map((item: any) => {
              return {
                ...item,
                billNumber: item.bill_id ? `BILL${item.bill_id.toString().padStart(3, '0')}` : '-',
                amount: parseFloat(item.billAmount || '0'),
                acceptor: item.acceptor || '-',
                expirationDate: item.expirationDate || '-',
                billRangeLower: item.billRangeLower || '-',
                billRangeUpper: item.billRangeUpper || '-',
                is_flaw: item.is_flaw,
                // 将billFlaw或bill_flaw映射到flaws字段
                flaws: (item.billFlaw || item.bill_flaw || []).map((flaw: any) => ({
                  name: flaw.flawName,
                  count: flaw.counts,
                  hitInfo: flaw.remark
                }))
              }
            })
          : []
      }
    }
  } catch (error) {
    showToast('获取票据详情失败')
  }
}

// 撤回/确认处理
const handleConfirm = async (row: BillRecord) => {
  if (!row.id) {
    showToast('无效的票据ID')
    return
  }

  loading.value = true
  try {
    // 根据当前状态决定调用哪个API
    if (row.status === '待处理') {
      // 调用确认完成API
      const response = await confirmFinishApi({
        id: row.id
      })

      if (response && response.code === 200) {
        // 更新状态
        const index = tableData.value.findIndex((item) => item.id === row.id)
        if (index !== -1) {
          tableData.value[index].status = '已完成'
          showToast('确认成功')

          // 更新统计信息
          await updateStats()

          // 触发刷新列表
          refreshTrigger.value++
        }
      } else {
        showToast(response?.message || '确认失败')
      }
    } else {
      // 调用撤回确认API
      const response = await cancelFinishApi({
        id: row.id
      })

      if (response && response.code === 200) {
        // 更新状态
        const index = tableData.value.findIndex((item) => item.id === row.id)
        if (index !== -1) {
          tableData.value[index].status = '待处理'
          showToast('撤回成功')

          // 更新统计信息
          await updateStats()

          // 触发刷新列表
          refreshTrigger.value++
        }
      } else {
        showToast(response?.message || '撤回失败')
      }
    }
  } catch (error) {
    console.error('操作失败:', error)
    showToast('操作失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 更新统计信息
const updateStats = async () => {
  try {
    // 调用API获取统计数据，根据当前状态传递参数
    const response = await getStatisticsApi({
      is_finish: activeStatus.value === '已完成' ? 1 : 0
    })

    if (response && response.code === 200 && response.data) {
      // 使用API返回的统计数据更新stats对象
      stats.value = {
        companyCount: response.data.company_count || 0,
        billCount: response.data.bill_count || 0,
        totalAmount: parseFloat(response.data.total_amount) || 0
      }
    } else {
      console.error('获取统计数据失败:', response?.message)
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 监听状态变化
watch(activeStatus, () => {
  currentPage.value = 1
  loadData() // 重新加载数据，使用新的is_finish参数
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 调用API获取数据，根据activeStatus.value添加is_finish查询条件
    const response = await getListsApi({
      is_finish: activeStatus.value === '已完成' ? 1 : 0
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
        acceptor: '', // 后端数据中没有承兑人信息，设为空
        total_number: item.total_number, // 保存票据数量信息
        companyMale: item.companyMale || [] // 保存companyMale数据
      }))
    } else {
      showToast('获取数据失败')
    }

    // 更新统计信息
    await updateStats()
  } catch (error) {
    showToast('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 刷新触发器，用于触发子组件刷新
const refreshTrigger = ref(0)

// 刷新方法
const handleRefresh = () => {
  // 立即设置加载状态，提供即时视觉反馈
  loading.value = true
  // 重置当前页码
  currentPage.value = 1
  // 立即更新刷新触发器，触发子组件刷新
  refreshTrigger.value++

  // 使用Promise.all并行执行数据加载和统计更新
  Promise.all([loadData(), updateStats()])
    .catch((error) => {
      console.error('刷新数据失败:', error)
      showToast('刷新数据失败')
    })
    .finally(() => {
      loading.value = false
    })
}

// 在组件卸载时清理
onBeforeUnmount(() => {
  // 移除IPC监听器，防止内存泄漏
  window.electron.ipcRenderer.removeAllListeners('refresh-bill-list')
})

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

onMounted(() => {
  loadData()

  // 添加IPC监听器，用于接收票据删除事件并刷新列表
  window.electron.ipcRenderer.on('refresh-bill-list', (_event, billId) => {
    console.log('收到票据删除事件，票据ID:', billId)
    // 调用刷新方法
    handleRefresh()
  })
})

// const showModal = () => {
//   window.electron.ipcRenderer.invoke('create-bill-details-window')
// }

// 定义activeItem，用于接收传入的数字值
const activeItem = ref<number>(0)

// 更新activeItem的方法
const updateActiveItem = (value: number) => {
  activeItem.value = value
}
</script>

<template>
  <div class="bill-recognition-container">
    <!-- <div>
      <button class="add-button" @click="showModal">查看</button>
    </div> -->
    <!-- 顶部状态和统计信息 -->
    <div class="top-info-panel">
      <!-- 统计信息 -->
      <div class="stats-panel">
        <div class="stat-item">
          <span class="label">公司数量</span>
          <span class="value">{{ stats.companyCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">张数</span>
          <span class="value" style="cursor: pointer" @click="showAllBillDetails">{{
            stats.billCount
          }}</span>
        </div>
        <div class="stat-item">
          <span class="label">总金额(万)</span>
          <span class="value">{{ stats.totalAmount.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    <div class="bill-header">
      <!-- 状态切换 -->
      <div class="status-tabs">
        <div
          class="status-tab"
          :class="{ active: activeStatus === '待处理' }"
          style="cursor: pointer"
          @click="setStatusPending"
        >
          待处理
        </div>
        <div
          class="status-tab"
          :class="{ active: activeStatus === '已完成' }"
          style="cursor: pointer"
          @click="setStatusCompleted"
        >
          已完成
        </div>
      </div>

      <div
        class="refresh-button"
        :class="{ refreshing: loading }"
        style="cursor: pointer"
        @click="handleRefresh"
      >
        <span class="refresh-icon">↻</span>
      </div>
    </div>
    <!-- 票据列表 -->
    <div class="scroll-container">
      <!-- 待处理列表 -->
      <PendingBillList
        v-if="activeStatus === '待处理'"
        :activeItem="activeItem"
        :refreshTrigger="refreshTrigger"
        @copyCompanyName="copyCompanyName"
        @showBillDetails="showBillDetails"
        @copyAmount="copyAmount"
        @showFlawDetails="showFlawDetails"
        @handleConfirm="handleConfirm"
      />

      <!-- 已完成列表 -->
      <CompletedBillList
        v-else
        :activeItem="activeItem"
        :refreshTrigger="refreshTrigger"
        @copyCompanyName="copyCompanyName"
        @showBillDetails="showBillDetails"
        @copyAmount="copyAmount"
        @showFlawDetails="showFlawDetails"
        @handleConfirm="handleConfirm"
      />
    </div>

    <!-- 票据详情弹窗 -->
    <div v-if="showBillModal" class="bill-details-modal">
      <div class="bill-details-content">
        <div class="bill-details-header">
          <h3>票据详情</h3>
          <span class="close-button" style="cursor: pointer" @click="showBillModal = false">×</span>
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
              <div class="bill-card-item">
                <div class="bill-card-label">票号</div>
                <div class="bill-card-value">
                  {{ row.billNumber }}
                  <span
                    v-if="row.is_flaw === 2"
                    class="flaw-warning"
                    style="margin-left: 5px; color: #ff0000; cursor: pointer"
                    @click.stop="showFlawDetails(row)"
                    >⚠️</span
                  >
                </div>
              </div>
              <div class="bill-card-item">
                <div class="bill-card-label">承兑人</div>
                <div class="bill-card-value">{{ row.acceptor || '-' }}</div>
              </div>
              <div class="bill-card-item">
                <div class="bill-card-label">金额</div>
                <div class="bill-card-value">{{ row.amount ? row.amount.toFixed(2) : '-' }}</div>
              </div>
              <div class="bill-card-item">
                <div class="bill-card-label">到期日期</div>
                <div class="bill-card-value">{{ row.expirationDate || '-' }}</div>
              </div>
              <div class="bill-card-item">
                <div class="bill-card-label">子票开始区间</div>
                <div class="bill-card-value">{{ row.billRangeLower || '-' }}</div>
              </div>
              <div class="bill-card-item">
                <div class="bill-card-label">子票结束区间</div>
                <div class="bill-card-value">{{ row.billRangeUpper || '-' }}</div>
              </div>
              <div class="bill-card-actions">
                <button class="delete-button" @click.stop="deleteBill(row)">删除</button>
              </div>
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
  transition: transform 0.2s ease;
}

.refresh-icon {
  /* margin-right: 4px; */
  font-size: 16px;
}

.refresh-button.refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
