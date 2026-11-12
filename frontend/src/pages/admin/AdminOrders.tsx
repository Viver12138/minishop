import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Input, Select, Button, Space, Modal, Form, message, Popconfirm, Descriptions } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { adminApi } from '../../api'
import { dataOf } from '../../api/client'

const statusColor: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', SHIPPED: 'purple', COMPLETED: 'green',
  CANCELLED: 'default', REFUNDING: 'red', REFUNDED: 'gray',
}

export default function AdminOrders() {
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>()
  const [orderNo, setOrderNo] = useState<string>()
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.orders({ page, page_size: 10, status, order_no: orderNo }).then((r) => {
      const d = dataOf(r)
      setList(d.items)
      setTotal(d.total)
    }).finally(() => setLoading(false))
  }
  useEffect(load, [page, status])

  const openDetail = async (id: number) => {
    const r = await adminApi.orderDetail(id)
    setDetail(dataOf(r))
  }

  const ship = async (id: number) => {
    const v = shipForm.getFieldsValue()
    if (!v.company || !v.tracking_number) { message.warning('请填写物流公司和运单号'); return }
    await adminApi.ship(id, v)
    message.success('发货成功')
    closeShip()
    load()
  }

  const [shipOrder, setShipOrder] = useState<any>(null)
  const [shipForm] = Form.useForm()
  const closeShip = () => { setShipOrder(null); shipForm.resetFields() }

  const columns = [
    { title: '订单号', dataIndex: 'order_no', render: (v: string, r: any) => <a onClick={() => openDetail(r.id)}>{v}</a> },
    { title: '用户', dataIndex: 'username' },
    { title: '商品', render: (_: any, r: any) => r.items.map((i: any) => `${i.product_name}×${i.quantity}`).join('，') || '-' },
    { title: '实付', dataIndex: 'pay_amount', render: (v: number) => <span className="money">￥{v}</span> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v]}>{rStatus(v)}</Tag> },
    { title: '创建时间', dataIndex: 'created_at' },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => openDetail(r.id)}>详情</Button>
          {r.status === 'PAID' && <Button size="small" type="primary" onClick={() => setShipOrder(r)}>发货</Button>}
        </Space>
      ),
    },
  ]

  return (
    <Card title="订单管理">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input placeholder="按订单号查询" prefix={<SearchOutlined />} onChange={(e) => setOrderNo(e.target.value || undefined)} onPressEnter={() => { setPage(1); load() }} style={{ width: 200 }} />
          <Select placeholder="按状态筛选" allowClear style={{ width: 150 }} value={status} onChange={(v) => { setStatus(v); setPage(1) }}
            options={['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED'].map((s) => ({ value: s, label: rStatus(s) }))} />
          <Button type="primary" onClick={() => { setPage(1); load() }}>查询</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      {/* 订单详情 */}
      <Modal title="订单详情" open={!!detail} onCancel={() => setDetail(null)} footer={null} width={700}>
        {detail && (
          <div>
            <Descriptions column={2} size="small" items={[
              { key: 'no', label: '订单号', children: detail.order_no },
              { key: 's', label: '状态', children: <Tag color={statusColor[detail.status]}>{rStatus(detail.status)}</Tag> },
              { key: 'u', label: '收货人', children: `${detail.receiver_name} ${detail.phone}` },
              { key: 'pa', label: '支付', children: detail.payment ? `${detail.payment.method_cn} ${detail.payment.status_cn}` : '未支付' },
              { key: 'ship', label: '物流', children: detail.shipment ? `${detail.shipment.company} ${detail.shipment.tracking_number}` : '未发货' },
              { key: 'refund', label: '售后', children: detail.refund ? detail.refund.status_cn : '无' },
            ]} />
            <Table rowKey="id" size="small" pagination={false} dataSource={detail.items} columns={[
              { title: '商品', dataIndex: 'product_name' },
              { title: '单价', dataIndex: 'price' },
              { title: '数量', dataIndex: 'quantity' },
              { title: '小计', dataIndex: 'subtotal' },
            ]} />
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              商品金额 ￥{detail.total_amount} - 优惠 ￥{detail.discount_amount} = 实付 <span className="money">￥{detail.pay_amount}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* 发货弹窗 */}
      <Modal title={`发货 - ${shipOrder?.order_no || ''}`} open={!!shipOrder} onCancel={closeShip} onOk={() => ship(shipOrder.id)}>
        <Form form={shipForm} layout="vertical">
          <Form.Item name="company" label="物流公司" rules={[{ required: true }]}><Input placeholder="如：顺丰" /></Form.Item>
          <Form.Item name="tracking_number" label="物流单号" rules={[{ required: true }]}><Input placeholder="如：SF123456789" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

function rStatus(s: string) {
  return { PENDING_PAYMENT: '待支付', PAID: '已支付', PENDING_SHIPMENT: '待发货', SHIPPED: '已发货', COMPLETED: '已完成', CANCELLED: '已取消', REFUNDING: '退款中', REFUNDED: '已退款' }[s] || s
}