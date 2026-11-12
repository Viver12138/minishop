import React, { useEffect, useState } from 'react'
import { Layout, Input, Badge, Dropdown, Space, Avatar, Button, Tag } from 'antd'
import { ShoppingCartOutlined, UserOutlined, SearchOutlined, AppstoreOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { cartApi, messageApi } from '../api'
import { dataOf } from '../api/client'

const { Header, Content, Footer } = Layout

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [cartCount, setCartCount] = useState(0)
  const [unread, setUnread] = useState(0)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (user) {
      cartApi.list().then((r) => {
        const items = dataOf<any>(r)
        setCartCount(items.items.reduce((s: number, i: any) => s + i.quantity, 0))
      }).catch(() => {})
      messageApi.unreadCount().then((r) => setUnread(dataOf<any>(r).count)).catch(() => {})
    } else {
      setCartCount(0)
    }
  }, [user, loc.pathname])

  const onSearch = () => {
    nav(`/products?keyword=${encodeURIComponent(keyword)}`)
  }

  const userMenu = {
    items: user
      ? [
          { key: 'center', label: <Link to="/user">用户中心</Link>, icon: <UserOutlined /> },
          { key: 'orders', label: <Link to="/user/orders">我的订单</Link> },
          ...(user.role === 'ADMIN' ? [{ key: 'admin', label: <Link to="/admin">管理后台</Link>, icon: <AppstoreOutlined /> }] : []),
          { key: 'logout', label: '退出登录', icon: <LogoutOutlined /> },
        ]
      : [{ key: 'login', label: '登录 / 注册' }],
    onClick: ({ key }: any) => {
      if (key === 'logout') {
        logout()
        nav('/')
      } else if (key === 'login') {
        nav('/login')
      } else if (key === 'center' || key === 'orders' || key === 'admin') {
        // 交给 Link
      }
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginRight: 24, whiteSpace: 'nowrap' }}>
          🛍️ MiniShop
        </Link>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索商品"
          style={{ maxWidth: 320, background: '#fff' }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={onSearch}
        />
        <div style={{ flex: 1 }} />
        <Space size={20} style={{ color: '#fff' }}>
          <Link to="/products" style={{ color: '#fff' }}>全部商品</Link>
          <Link to="/cart" style={{ color: '#fff' }}>
            <Badge count={cartCount} size="small">
              <ShoppingCartOutlined style={{ fontSize: 20 }} />
            </Badge>
            购物车
          </Link>
          <Link to="/user/messages" style={{ color: '#fff' }}>
            <Badge count={unread} size="small">消息</Badge>
          </Link>
          <Dropdown menu={userMenu}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <span>{user ? user.nickname : '登录'}</span>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Content>
        <div className="page-container">{children}</div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#001529', color: '#888' }}>
        MiniShop 综合电商平台 Demo · 用于 WHartTest 自动化测试
      </Footer>
    </Layout>
  )
}