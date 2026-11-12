import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, List, Button } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/auth'

export default function UserCenter() {
  const { user } = useAuth()
  const nav = useNavigate()

  const items = [
    { title: '我的订单', desc: '查看和管理订单', link: '/user/orders', icon: '📦' },
    { title: '收货地址', desc: '管理收货地址', link: '/user/addresses', icon: '📍' },
    { title: '我的收藏', desc: '收藏的商品', link: '/user/favorites', icon: '❤️' },
    { title: '我的优惠券', desc: '领取和使用优惠券', link: '/user/coupons', icon: '🎟️' },
    { title: '我的评价', desc: '发表过的评价', link: '/user/reviews', icon: '⭐' },
    { title: '售后记录', desc: '退款和售后申请', link: '/user/refunds', icon: '🔁' },
    { title: '我的消息', desc: '站内消息通知', link: '/user/messages', icon: '🔔' },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle">
          <Col span={2}>
            <div style={{ fontSize: 48, textAlign: 'center' }}>👤</div>
          </Col>
          <Col span={22}>
            <h2 style={{ margin: 0 }}>{user?.nickname}</h2>
            <div className="text-muted">用户名：{user?.username} · 手机：{user?.phone || '未绑定'}</div>
            <Button onClick={() => nav('/user/orders')} type="primary" style={{ marginTop: 8 }}>我的订单</Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {items.map((it) => (
          <Col span={6} key={it.title}>
            <Link to={it.link}>
              <Card hoverable>
                <Statistic title={it.title} value={it.desc} />
                <div style={{ textAlign: 'center', fontSize: 36 }}>{it.icon}</div>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  )
}