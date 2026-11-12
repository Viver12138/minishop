import React from 'react'
import { Layout, Menu, Typography } from 'antd'
import {
  DashboardOutlined, UserOutlined, AppstoreOutlined, ShoppingOutlined,
  InboxOutlined, GiftOutlined, FileProtectOutlined, StarOutlined, TagsOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">数据看板</Link> },
  { key: '/admin/orders', icon: <ShoppingOutlined />, label: <Link to="/admin/orders">订单管理</Link> },
  { key: '/admin/products', icon: <AppstoreOutlined />, label: <Link to="/admin/products">商品管理</Link> },
  { key: '/admin/categories', icon: <TagsOutlined />, label: <Link to="/admin/categories">分类管理</Link> },
  { key: '/admin/inventory', icon: <InboxOutlined />, label: <Link to="/admin/inventory">库存管理</Link> },
  { key: '/admin/users', icon: <UserOutlined />, label: <Link to="/admin/users">用户管理</Link> },
  { key: '/admin/coupons', icon: <GiftOutlined />, label: <Link to="/admin/coupons">优惠券管理</Link> },
  { key: '/admin/refunds', icon: <FileProtectOutlined />, label: <Link to="/admin/refunds">售后管理</Link> },
  { key: '/admin/reviews', icon: <StarOutlined />, label: <Link to="/admin/reviews">评价管理</Link> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" width={220}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', padding: 16 }}>
          MiniShop 后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[loc.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Link onClick={() => nav('/')}>← 返回商城</Typography.Link>
          <div style={{ flex: 1 }} />
          <Typography.Text type="secondary">管理后台</Typography.Text>
        </Header>
        <Content style={{ margin: 16 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}