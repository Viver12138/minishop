import axios from 'axios'
import { message } from 'antd'

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截：附加 token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('minishop_token')
  if (token) {
    config.headers!.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一错误提示
client.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const msg = error?.response?.data?.message || error?.message || '请求失败'
    // 401 时清除 token
    if (error?.response?.status === 401) {
      localStorage.removeItem('minishop_token')
      localStorage.removeItem('minishop_user')
      if (!window.location.pathname.startsWith('/login')) {
        message.error('请先登录')
        window.location.href = '/login'
      }
    } else {
      message.error(msg)
    }
    return Promise.reject(error)
  },
)

export default client

// 统一的业务响应解析
export function dataOf<T = any>(resp: { data: { data: T } }): T {
  return resp.data.data
}