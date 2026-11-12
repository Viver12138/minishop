import React, { useEffect, useState } from 'react'
import { Card, Button, Result, Descriptions, message, Space } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { orderApi, paymentApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Order } from '../../types'

export default function Payment() {
  const { orderId } = useParams()
  const nav = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    orderApi.detail(Number(orderId)).then((r) => setOrder(dataOf(r))).catch(() => {})
  }, [orderId])

  const doPay = async (success: boolean) => {
    setPaying(true)
    try {
      const p = await paymentApi.create(Number(orderId), 'WECHAT')
      const payment = dataOf(p)
      if (success) {
        await paymentApi.success(payment.id)
        message.success('支付成功！')
        nav(`/user/orders/${orderId}`)
      } else {
        await paymentApi.fail(payment.id)
        message.warning('支付失败，您可以在订单中重新支付')
        nav(`/user/orders/${orderId}`)
      }
    } catch { /* 已提示 */ } finally { setPaying(false) }
  }

  if (!order) return <Card loading />

  return (
    <Card title={`模拟支付 - 订单 ${order.order_no}`}>
      <Result
        icon={<div style={{ fontSize: 48 }}>💳</div>}
        title={`应付金额 ￥${Number(order.pay_amount).toFixed(2)}`}
        subTitle={
          <Descriptions column={2} size="small" style={{ maxWidth: 500, margin: '0 auto' }} items={[
            { key: 'o', label: '订单编号', children: order.order_no },
            { key: 't', label: '商品金额', children: `￥${order.total_amount}` },
            { key: 'd', label: '优惠金额', children: `-￥${order.discount_amount}` },
            { key: 'm', label: '支付方式', children: `微信支付（模拟）` },
          ]} />
        }
        extra={
          <Space size={16}>
            <Button type="primary" size="large" loading={paying} onClick={() => doPay(true)}>
              💚 模拟支付成功
            </Button>
            <Button danger size="large" loading={paying} onClick={() => doPay(false)}>
              💔 模拟支付失败
            </Button>
          </Space>
        }
      />
    </Card>
  )
}