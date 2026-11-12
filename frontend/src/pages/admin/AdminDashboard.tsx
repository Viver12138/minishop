import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

export default function AdminDashboard() {
  const [d, setData] = useState<any>(null)
  useEffect(() => {
    adminApi.dashboard().then((r) => setData(dataOf(r)))
  }, [])

  if (!d) return <Card loading />

  const cards = [
    { title: '用户数量', value: d.user_count, color: '#1677ff' },
    { title: '商品数量', value: d.product_count, color: '#722ed1' },
    { title: '订单数量', value: d.order_count, color: '#13c2c2' },
    { title: '待处理订单', value: d.pending_orders, color: '#fa8c16' },
    { title: '销售金额', value: '￥' + Number(d.sales_amount).toFixed(2), color: '#52c41a' },
    { title: '退款金额', value: '￥' + Number(d.refund_amount).toFixed(2), color: '#ff4d4f' },
    { title: '库存预警商品', value: d.low_stock_count, color: '#eb2f96' },
    { title: '待审核售后', value: d.pending_refunds, color: '#fa541c' },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col span={6} key={c.title}>
            <Card>
              <Statistic title={c.title} value={c.value} valueStyle={{ color: c.color }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}