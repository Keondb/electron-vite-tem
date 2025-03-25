<script setup lang="ts">
import { ref, reactive } from 'vue'
import { type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

/** 登录表单元素的引用 */
const loginFormRef = ref<FormInstance | null>(null)

/** 登录按钮 Loading */
const loading = ref(false)

/** 登录表单数据 */
const loginFormData: any = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 4, max: 16, message: '长度在 4 到 16 个字符', trigger: 'blur' }
  ]
}

/** 登录逻辑 */
const handleLogin = () => {
  console.log(loginFormData)
  /** 表单校验 */
  loginFormRef.value?.validate((valid: boolean, fields) => {
    if (valid) {
      loading.value = true
      userStore
        .login(loginFormData)
        .then(() => {
          console.log('登录成功')
          // 跳转到首页
          router.push({ path: '/' })
        })
        .catch(() => {
          loginFormData.password = ''
        })
        .finally(() => {
          loading.value = false
        })
    } else {
      console.error('表单校验不通过', fields)
    }
  })
}
</script>

<template>
  <div class="login">
    <el-card style="max-width: 480px">
      <div class="title">登录</div>
      <el-form ref="loginFormRef" :model="loginFormData" :rules="rules" label-position="top">
        <el-form-item prop="username">
          <el-input v-model="loginFormData.username" placeholder="用户名" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginFormData.password" type="password" placeholder="密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin()"> 登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login {
  width: 100%;
  height: 750px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.title {
  padding-bottom: 10px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
}
</style>
