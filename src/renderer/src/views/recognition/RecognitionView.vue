<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getListsApi } from '@/api/recognition'
import type { RecognitionItem } from '@/api/recognition/types'
import { ElMessage } from 'element-plus'
import { ElPagination } from 'element-plus'

const loading = ref(false)
// const searchQuery = ref('') // 注释掉未使用的变量
const currentPage = ref(1)
const pageSize = ref(10)

const quotelistApis = async () => {
  loading.value = true
  try {
    const res = await getListsApi({})
    // 将 RecognitionItem 转换为 TableData
    tableData.value = res.data.list.map((item: RecognitionItem) => ({
      time: item.create_time,
      company: item.company_name,
      count: item.total_number,
      amount: parseFloat(item.total_amount),
      status: item.is_finish === 1 ? '完成' : '处理中',
      reject: item.think_count > 0,
      admin_name: item.admin_name || '-' // 映射业务员字段
    }))
  } catch (error) {
    ElMessage.error('获取数据失败，请稍后重试')
    console.error('获取数据失败：', error)
  } finally {
    loading.value = false
  }
}

interface TableData {
  time: string
  company: string
  count: number
  amount: number
  status: string
  reject?: boolean
  admin_name?: string // 添加业务员字段
}

const tableData = ref<TableData[]>([])

const filteredData = computed(() => {
  return tableData.value
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})
const totalCount = computed(() => filteredData.value.length)
const handleView = (row: TableData) => {
  console.log('查看详情：', row)
  // TODO: 实现查看详情的逻辑
}

const handleRefresh = () => {
  currentPage.value = 1
  quotelistApis()
}
const handleSizeChange = (val: number) => {
  pageSize.value = val
  quotelistApis()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  quotelistApis()
}

// 格式化时间的函数
const formatTime = (dateString: string): string => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')

  return `${month}-${day} ${hour}:${minute}`
}

onMounted(() => {
  quotelistApis()
})
</script>

<template>
  <div class="recognition-container">
    <div class="recognition-header">
      <div class="header-left">
        <!-- <el-input
          v-model="searchQuery"
          placeholder="搜索公司名称或状态"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input> -->
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedData"
      style="width: 100%"
      class="recognition-table"
      border
    >
      <el-table-column prop="time" label="时间" width="100" align="center">
        <template #default="{ row }">
          {{ formatTime(row.time) }}
        </template>
      </el-table-column>
      <el-table-column prop="company" label="公司名称" align="center">
        <template #default="{ row }">
          <span>{{ row.company }}</span>
          <el-tag v-if="row.reject" type="danger" size="small" style="margin-left: 5px"
            >(扣)</el-tag
          >
        </template>
      </el-table-column>
      <el-table-column prop="count" label="张数" width="100" align="center" />
      <el-table-column prop="amount" label="总金额" width="150" align="center">
        <template #default="{ row }">
          {{ row.amount.toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '完成' ? 'success' : 'warning'" effect="plain">{{
            row.status
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="admin_name" label="业务员" width="120" align="center" />
      <el-table-column label="详情" width="100" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleView(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="recognition-footer">
      <el-pagination
        :total="totalCount"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<style scoped>
.recognition-container {
  padding: 20px;
}

.recognition-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-input {
  width: 300px;
}

.recognition-table {
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.recognition-footer {
  display: flex;
  justify-content: flex-end;
}

.pagination {
  margin-top: 20px;
}
</style>
