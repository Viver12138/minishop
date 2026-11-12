import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { AuthProvider, useAuth } from './store/auth'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

// 用户页
const Home = lazy(() => import('./pages/home/Home'))
const ProductList = lazy(() => import('./pages/product/ProductList'))
const ProductDetail = lazy(() => import('./pages/product/ProductDetail'))
const Cart = lazy(() => import('./pages/cart/Cart'))
const Login = lazy(() => import('./pages/login/Login'))
const OrderConfirm = lazy(() => import('./pages/order/OrderConfirm'))
const Payment = lazy(() => import('./pages/payment/Payment'))
const UserCenter = lazy(() => import('./pages/user/UserCenter'))
const UserOrders = lazy(() => import('./pages/user/UserOrders'))
const OrderDetail = lazy(() => import('./pages/user/OrderDetail'))
const Addresses = lazy(() => import('./pages/user/Addresses'))
const Favorites = lazy(() => import('./pages/user/Favorites'))
const MyCoupons = lazy(() => import('./pages/user/MyCoupons'))
const MyReviews = lazy(() => import('./pages/user/MyReviews'))
const MyRefunds = lazy(() => import('./pages/user/MyRefunds'))
const Messages = lazy(() => import('./pages/user/Messages'))

// 管理后台页
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'))
const AdminRefunds = lazy(() => import('./pages/admin/AdminRefunds'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))

const Page = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>}>
    {children}
  </Suspense>
)

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  )
}

function AppInner() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 用户端 */}
        <Route path="/login" element={<Page><Login /></Page>} />
        <Route path="/" element={<MainLayout><Page><Home /></Page></MainLayout>} />
        <Route path="/products" element={<MainLayout><Page><ProductList /></Page></MainLayout>} />
        <Route path="/products/:id" element={<MainLayout><Page><ProductDetail /></Page></MainLayout>} />
        <Route path="/cart" element={<RequireAuth><MainLayout><Page><Cart /></Page></MainLayout></RequireAuth>} />
        <Route path="/orders/confirm" element={<RequireAuth><MainLayout><Page><OrderConfirm /></Page></MainLayout></RequireAuth>} />
        <Route path="/payment/:orderId" element={<RequireAuth><MainLayout><Page><Payment /></Page></MainLayout></RequireAuth>} />

        {/* 用户中心 */}
        <Route path="/user" element={<RequireAuth><MainLayout><Page><UserCenter /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/orders" element={<RequireAuth><MainLayout><Page><UserOrders /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/orders/:id" element={<RequireAuth><MainLayout><Page><OrderDetail /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/addresses" element={<RequireAuth><MainLayout><Page><Addresses /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/favorites" element={<RequireAuth><MainLayout><Page><Favorites /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/coupons" element={<RequireAuth><MainLayout><Page><MyCoupons /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/reviews" element={<RequireAuth><MainLayout><Page><MyReviews /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/refunds" element={<RequireAuth><MainLayout><Page><MyRefunds /></Page></MainLayout></RequireAuth>} />
        <Route path="/user/messages" element={<RequireAuth><MainLayout><Page><Messages /></Page></MainLayout></RequireAuth>} />

        {/* 管理后台 */}
        <Route path="/admin" element={<RequireAdmin><Page><AdminDashboard /></Page></RequireAdmin>} />
        <Route path="/admin/orders" element={<RequireAdmin><Page><AdminOrders /></Page></RequireAdmin>} />
        <Route path="/admin/products" element={<RequireAdmin><Page><AdminProducts /></Page></RequireAdmin>} />
        <Route path="/admin/categories" element={<RequireAdmin><Page><AdminCategories /></Page></RequireAdmin>} />
        <Route path="/admin/inventory" element={<RequireAdmin><Page><AdminInventory /></Page></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><Page><AdminUsers /></Page></RequireAdmin>} />
        <Route path="/admin/coupons" element={<RequireAdmin><Page><AdminCoupons /></Page></RequireAdmin>} />
        <Route path="/admin/refunds" element={<RequireAdmin><Page><AdminRefunds /></Page></RequireAdmin>} />
        <Route path="/admin/reviews" element={<RequireAdmin><Page><AdminReviews /></Page></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}