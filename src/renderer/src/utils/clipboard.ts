import { ElMessage } from 'element-plus'

export interface ClipboardOptions {
  successMessage?: string
  errorMessage?: string
  showMessage?: boolean
}

export async function copyToClipboard(text: string, options: ClipboardOptions = {}) {
  const { successMessage = '复制成功', errorMessage = '复制失败', showMessage = true } = options

  try {
    await navigator.clipboard.writeText(text)
    if (showMessage) {
      ElMessage.success(successMessage)
    }
    return true
  } catch (error) {
    console.error('复制失败:', error)
    if (showMessage) {
      ElMessage.error(errorMessage)
    }
    return false
  }
}