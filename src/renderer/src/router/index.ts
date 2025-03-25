import { createRouter, createWebHashHistory } from 'vue-router'
import cacheUtils from '@/utils/cacheUtils'
// import recognitionView from "@/views/recognition/RecognitionView.vue"

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: '/',
      //重置到recognition
      redirect: '/companyBill'
    },
    // 设置login
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue')
    },
    // recognition
    {
      path: '/companyBill',
      name: 'companyBill',
      component: () => import('@/views/recognition/BillRecognitionView.vue')
      // component: recognitionView
    },
    {
      path: '/billDetail',
      name: 'billDetail',
      component: () => import('@/views/windows/BillView.vue')
    },
    {
      path: '/billFront',
      name: 'billFront',
      component: () => import('@/views/windows/BillFront.vue')
    },
    {
      path: '/billBack',
      name: 'billBack',
      component: () => import('@/views/windows/BillBack.vue')
    }
  ]
})

// 假设这是你的检查用户登录状态的函数
const checkLoginStatus = () => {
  // 这里应该是检查用户登录状态的逻辑
  // 例如，检查 localStorage 中的 token
  const userToken = cacheUtils.get('userToken')

  if (userToken !== null) {
    return true
  } else {
    console.log('用户未登录')
    return false
  }
}

// 路由守卫
router.beforeEach((to, _, next) => {
  const isAuthenticated = checkLoginStatus()

  if (to.path === '/login' && isAuthenticated) {
    // 如果用户尝试访问登录页面，但已经登录，则重定向到主页
    console.log('重定向到主页')
    next('/')
  } else if (to.path !== '/login' && !isAuthenticated) {
    // 如果用户尝试访问非登录页面，但未登录，则重定向到登录页面
    console.log('重定向到登录页面')
    next('/login')
  } else {
    // 其他情况，继续正常的导航
    console.log('继续导航')
    next()
  }
})

export default router
