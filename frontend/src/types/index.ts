// 全局类型定义

export interface User {
  id: number
  username: string
  nickname: string
  phone: string
  email: string
  role: 'USER' | 'ADMIN'
  status: string
  created_at?: string
}

export interface Category {
  id: number
  name: string
  parent_id: number
  status: string
}

export interface Sku {
  id: number
  product_id: number
  sku_code: string
  spec_values: Record<string, string>
  price: number
  stock: number
  status: string
}

export interface Product {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  original_price: number
  stock: number
  status: string
  sales: number
  images: string[]
  skus: Sku[]
  is_favorite?: boolean
}

export interface CartItem {
  id: number
  sku_id: number
  quantity: number
  product_id: number
  product_name: string
  product_image: string
  spec_values: Record<string, string>
  price: number
  stock: number
  product_status: string
  subtotal: number
  available: boolean
}

export interface Address {
  id: number
  receiver_name: string
  phone: string
  province: string
  city: string
  district: string
  detail_address: string
  is_default: boolean
  full_address: string
}

export interface UserCoupon {
  id: number
  coupon_id: number
  name: string
  threshold: number
  discount_amount: number
  status: string
  status_cn: string
  end_time?: string
}

export interface OrderItem {
  id: number
  product_id: number
  sku_id: number
  product_name: string
  spec_values: Record<string, string>
  price: number
  quantity: number
  subtotal: number
}

export interface Shipment {
  id: number
  company: string
  tracking_number: string
  status: string
  status_cn: string
  shipped_at?: string
}

export interface Order {
  id: number
  order_no: string
  user_id: number
  status: string
  status_cn: string
  total_amount: number
  discount_amount: number
  pay_amount: number
  receiver_name: string
  phone: string
  address_snapshot: Record<string, string>
  user_coupon_id: number
  created_at?: string
  paid_at?: string
  shipped_at?: string
  completed_at?: string
  cancelled_at?: string
  items: OrderItem[]
  shipment?: Shipment
  payment?: {
    id: number
    payment_no: string
    method: string
    method_cn: string
    amount: number
    status: string
    status_cn: string
    paid_at?: string
  }
  refund?: { id: number; status: string; status_cn: string; amount: number; reason: string; reject_reason?: string }
}

export interface Review {
  id: number
  product_id: number
  product_name?: string
  nickname?: string
  rating: number
  content: string
  created_at: string
}

export interface Refund {
  id: number
  order_id: number
  order_no?: string
  amount: number
  reason: string
  description: string
  status: string
  status_cn: string
  reject_reason?: string
  created_at?: string
}

export interface ApiResp<T = any> {
  code: string
  message: string
  data: T
}