import client from './client'
import type { Product, CartItem, Address, UserCoupon, Order, Review, Refund, Category, User, Sku } from '../types'

// ---------- 认证 ----------
export const authApi = {
  login: (username: string, password: string) => client.post('/auth/login', { username, password }),
  register: (data: any) => client.post('/auth/register', data),
  me: () => client.get('/auth/me'),
  logout: () => client.post('/auth/logout'),
}

// ---------- 商品 / 分类 ----------
export const productApi = {
  list: (params: any) => client.get('/products', { params }),
  detail: (id: number) => client.get(`/products/${id}`),
  categories: () => client.get('/categories'),
  reviews: (id: number) => client.get(`/products/${id}/reviews`),
}

// ---------- 购物车 ----------
export const cartApi = {
  list: () => client.get('/cart'),
  add: (sku_id: number, quantity: number) => client.post('/cart/items', { sku_id, quantity }),
  update: (id: number, quantity: number) => client.put(`/cart/items/${id}`, { quantity }),
  remove: (id: number) => client.delete(`/cart/items/${id}`),
}

// ---------- 地址 ----------
export const addressApi = {
  list: () => client.get('/addresses'),
  create: (data: any) => client.post('/addresses', data),
  update: (id: number, data: any) => client.put(`/addresses/${id}`, data),
  remove: (id: number) => client.delete(`/addresses/${id}`),
  setDefault: (id: number) => client.post(`/addresses/${id}/default`),
}

// ---------- 收藏 ----------
export const favoriteApi = {
  list: () => client.get('/favorites'),
  add: (product_id: number) => client.post(`/favorites/${product_id}`),
  remove: (product_id: number) => client.delete(`/favorites/${product_id}`),
}

// ---------- 优惠券 ----------
export const couponApi = {
  available: () => client.get('/coupons/available'),
  my: () => client.get('/coupons/my'),
  claim: (id: number) => client.post(`/coupons/${id}/claim`),
}

// ---------- 订单 ----------
export const orderApi = {
  preview: (data: any) => client.post('/orders/preview', data),
  create: (data: any) => client.post('/orders', data),
  list: (params: any) => client.get('/orders', { params }),
  detail: (id: number) => client.get(`/orders/${id}`),
  cancel: (id: number) => client.post(`/orders/${id}/cancel`),
  confirm: (id: number) => client.post(`/orders/${id}/confirm`),
}

// ---------- 支付 ----------
export const paymentApi = {
  create: (order_id: number, method: string) => client.post('/payments', { order_id, method }),
  success: (id: number) => client.post(`/payments/${id}/success`),
  fail: (id: number) => client.post(`/payments/${id}/fail`),
}

// ---------- 售后 ----------
export const refundApi = {
  create: (data: any) => client.post('/refunds', data),
  my: () => client.get('/refunds/my'),
}

// ---------- 评价 ----------
export const reviewApi = {
  create: (data: any) => client.post('/reviews', data),
  my: () => client.get('/reviews/my'),
}

// ---------- 消息 ----------
export const messageApi = {
  list: () => client.get('/messages'),
  unreadCount: () => client.get('/messages/unread-count'),
  markRead: (id: number) => client.post(`/messages/${id}/read`),
  markAllRead: () => client.post('/messages/read-all'),
}

// ---------- 管理后台 ----------
export const adminApi = {
  dashboard: () => client.get('/admin/dashboard'),
  users: (params: any) => client.get('/admin/users', { params }),
  userDetail: (id: number) => client.get(`/admin/users/${id}`),
  userStatus: (id: number, status: string) => client.put(`/admin/users/${id}/status`, { status }),
  userOrders: (id: number) => client.get(`/admin/users/${id}/orders`),
  categories: () => client.get('/admin/categories'),
  categoryCreate: (data: any) => client.post('/admin/categories', data),
  categoryUpdate: (id: number, data: any) => client.put(`/admin/categories/${id}`, data),
  products: (params: any) => client.get('/admin/products', { params }),
  productCreate: (data: any) => client.post('/admin/products', data),
  productUpdate: (id: number, data: any) => client.put(`/admin/products/${id}`, data),
  productDelete: (id: number) => client.delete(`/admin/products/${id}`),
  productPublish: (id: number) => client.post(`/admin/products/${id}/publish`),
  productUnpublish: (id: number) => client.post(`/admin/products/${id}/unpublish`),
  orders: (params: any) => client.get('/admin/orders', { params }),
  orderDetail: (id: number) => client.get(`/admin/orders/${id}`),
  ship: (id: number, data: any) => client.post(`/admin/orders/${id}/ship`, data),
  refunds: (params: any) => client.get('/admin/refunds', { params }),
  refundApprove: (id: number) => client.post(`/admin/refunds/${id}/approve`),
  refundReject: (id: number, reason: string) => client.post(`/admin/refunds/${id}/reject`, { reject_reason: reason }),
  inventory: () => client.get('/admin/inventory'),
  inventoryAdjust: (data: any) => client.post('/admin/inventory/adjust', data),
  coupons: () => client.get('/admin/coupons'),
  couponCreate: (data: any) => client.post('/admin/coupons', data),
  couponUpdate: (id: number, data: any) => client.put(`/admin/coupons/${id}`, data),
  reviews: () => client.get('/admin/reviews'),
  reviewDelete: (id: number) => client.delete(`/admin/reviews/${id}`),
}