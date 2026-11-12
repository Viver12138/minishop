import React, { useState } from 'react'
import { Card, Form, Input, Button, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined, MobileOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth'

export default function Login() {
  const { login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [loading, setLoading] = useState(false)

  const from = (loc.state as any)?.from || '/'

  const onLogin = async (values: any) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success('登录成功')
      nav(from, { replace: true })
    } catch { /* 已提示 */ } finally { setLoading(false) }
  }

  const onRegister = async (values: any) => {
    setLoading(true)
    try {
      await register(values)
      message.success('注册成功，已自动登录')
      nav(from, { replace: true })
    } catch { /* 已提示 */ } finally { setLoading(false) }
  }

  const loginForm = (
    <Form onFinish={onLogin} size="large">
      <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>登 录</Button>
      </Form.Item>
      <div className="text-muted" style={{ textAlign: 'center' }}>
        测试账号：user / 123456 &nbsp;·&nbsp; 管理员：admin / admin123
      </div>
    </Form>
  )

  const registerForm = (
    <Form onFinish={onRegister} size="large">
      <Form.Item name="username" rules={[{ required: true, min: 3, message: '用户名至少3位' }]}>
        <Input prefix={<UserOutlined />} placeholder="用户名（≥3位）" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="密码（≥6位）" />
      </Form.Item>
      <Form.Item name="nickname">
        <Input prefix={<MobileOutlined />} placeholder="昵称（可选）" />
      </Form.Item>
      <Form.Item name="phone">
        <Input placeholder="手机号（可选）" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>注 册</Button>
      </Form.Item>
    </Form>
  )

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <Card style={{ width: 400 }}>
        <h2 style={{ textAlign: 'center' }}>🛍️ MiniShop</h2>
        <Tabs items={[{ key: 'login', label: '登录', children: loginForm }, { key: 'register', label: '注册', children: registerForm }]} />
      </Card>
    </div>
  )
}