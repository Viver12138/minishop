import React, { useEffect, useState } from 'react'
import { Card, Descriptions, Tag, Button, message, Timeline, Modal, Form, Input, Rate, InputNumber, Space, Steps, Empty, Row, Col } from 'antd'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { orderApi, reviewApi, refundApi, paymentApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Order } from '../../types'

const statusColor: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', SHIPPED: 'purple', COMPLETED: 'green',
  CANCELLED: 'default', REFUNDING: 'red', REFUNDED: 'gray',
}

export default function OrderDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [reviewTarget, setReviewTarget] = useState<any>(null)
  const [refundOpen, setRefundOpen] = useState(!!params.get('refund'))
  const [reviewForm] = Form.useForm()
  const [refundForm] = Form.useForm()

  const load = () => {
    orderApi.detail(Number(id)).then((r) => setOrder(dataOf(r))).catch(() => {})
  }
  useEffect(load, [id])

  const submitReview = async () => {
    const v = await reviewForm.validateFields()
    await reviewApi.create({ order_item_id: reviewTarget.id, rating: v.rating, content: v.content })
    message.success('评价成功')
    setReviewTarget(null)
    load()
  }

  const submitRefund = async () => {
    const v = await refundForm.validateFields()
    await refundApi.create({ order_id: order!.id, reason: v.reason, description: v.description || '' })
    message.success('退款申请已提交')
    setRefundOpen(false)
    load()
  }

  if (!order) return <Card loading />

  const stepMap: Record<string, number> = {
    PENDING_PAYMENT: 0, PAID: 1, SHIPPED: 2, COMPLETED: 3, REFUNDING: 1, REFUNDED: 1,
  }

  return (
    <div>
      <Card title={`订单详情 - ${order.order_no}`} style={{ marginBottom: 16 }}>
        <Steps
          current={stepMap[order.status] ?? 0}
          items={[{ title: '提交订单' }, { title: '支付' }, { title: '发货' }, { title: '完成' }]}
        />
        <div style={{ marginTop: 12 }}>
          <Tag color={statusColor[order.status]}>{order.status_cn}</Tag>
          {order.refund && <Tag color="red">售后：{order.refund.status_cn}</Tag>}
        </div>
      </Card>

      <Card title="商品信息" style={{ marginBottom: 16 }}>
        {order.items.map((i) => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div>{i.product_name}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{Object.entries(i.spec_values || {}).map(([k, v]) => `${k}:${v}`).join(' | ') || '默认规格'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>￥{i.price} × {i.quantity}</span>
              {order.status === 'COMPLETED' && (
                <Button size="small" onClick={() => setReviewTarget(i)}>写评价</Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="收货信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" items={[
              { key: 'r', label: '收货人', children: `${order.receiver_name} ${order.phone}` },
              { key: 'a', label: '地址', children: `${order.address_snapshot.province || ''}${order.address_snapshot.city || ''}${order.address_snapshot.district || ''}${order.address_snapshot.detail_address || ''}` },
            ]} />
          </Card>
          <Card title="金额信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" items={[
              { key: 't', label: '商品金额', children: <span>￥{order.total_amount}</span> },
              { key: 'd', label: '优惠金额', children: <span style={{ color: '#52c41a' }}>-￥{order.discount_amount}</span> },
              { key: 'p', label: '实付金额', children: <span className="money" style={{ fontSize: 20 }}>￥{order.pay_amount}</span> },
            ]} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="支付信息" style={{ marginBottom: 16 }}>
            {order.payment ? (
              <Descriptions column={1} size="small" items={[
                { key: 'p', label: '支付单号', children: order.payment.payment_no },
                { key: 'm', label: '支付方式', children: order.payment.method_cn },
                { key: 's', label: '支付状态', children: <Tag color={order.payment.status === 'SUCCESS' ? 'green' : 'orange'}>{order.payment.status_cn}</Tag> },
                { key: 'at', label: '支付时间', children: order.payment.paid_at || '-' },
              ]} />
            ) : <Empty description="尚未支付" />}
          </Card>
          <Card title="物流信息" style={{ marginBottom: 16 }}>
            {order.shipment ? (
              <Descriptions column={1} size="small" items={[
                { key: 'c', label: '物流公司', children: order.shipment.company },
                { key: 't', label: '运单号', children: order.shipment.tracking_number },
                { key: 's', label: '物流状态', children: <Tag color={order.shipment.status === 'DELIVERED' ? 'green' : 'purple'}>{order.shipment.status_cn}</Tag> },
                { key: 'at', label: '发货时间', children: order.shipment.shipped_at },
              ]} />
            ) : <Empty description="暂无物流信息" />}
          </Card>
        </Col>
      </Row>

      {order.refund && (
        <Card title="售后信息" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small" items={[
            { key: 's', label: '售后状态', children: <Tag color="red">{order.refund.status_cn}</Tag> },
            { key: 'a', label: '退款金额', children: <span className="money">￥{order.refund.amount}</span> },
            { key: 'r', label: '退款原因', children: order.refund.reason },
            { key: 'rr', label: '拒绝原因', children: order.refund.reject_reason || '-' },
          ]} />
        </Card>
      )}

      <Card>
        <Space size={12}>
          {order.status === 'PENDING_PAYMENT' && (
            <Button type="primary" onClick={() => nav(`/payment/${order.id}`)}>去支付</Button>
          )}
          {order.status === 'PENDING_PAYMENT' && (
            <Button onClick={async () => { await orderApi.cancel(order.id); message.success('已取消'); load() }}>取消订单</Button>
          )}
          {['PAID', 'SHIPPED'].includes(order.status) && !order.refund && (
            <Button danger onClick={() => setRefundOpen(true)}>申请退款</Button>
          )}
          {order.status === 'SHIPPED' && (
            <Button type="primary" onClick={async () => { await orderApi.confirm(order.id); message.success('确认收货成功'); load() }}>确认收货</Button>
          )}
          {order.status !== 'PENDING_PAYMENT' && <Button onClick={load}>刷新状态</Button>}
        </Space>
      </Card>

      {/* 评价弹窗 */}
      <Modal title="商品评价" open={!!reviewTarget} onCancel={() => setReviewTarget(null)} onOk={submitReview}>
        <Form form={reviewForm} layout="vertical">
          <Form.Item name="rating" label="评分" rules={[{ required: true }]} initialValue={5}>
            <Rate />
          </Form.Item>
          <Form.Item name="content" label="评价内容" rules={[{ required: true, message: '请填写评价内容' }]}>
            <Input.TextArea rows={4} placeholder="说说你的使用体验" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 退款弹窗 */}
      <Modal title="申请退款" open={refundOpen} onCancel={() => setRefundOpen(false)} onOk={submitRefund}>
        <Desc content={`退款金额：￥${order.pay_amount}`} />
        <Form form={refundForm} layout="vertical">
          <Form.Item name="reason" label="退款原因" rules={[{ required: true }]}>
            <Input placeholder="如：不想要了 / 质量问题" />
          </Form.Item>
          <Form.Item name="description" label="退款说明">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function Desc({ content }: { content: string }) {
  return <div style={{ marginBottom: 12, color: '#ff4d4f', fontWeight: 600 }}>{content}</div>
}