import React, { useEffect, useState } from 'react'
import { Card, Tabs, List, Button, Tag, message, Popconfirm, Descriptions, Empty } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { orderApi } from '../../api'
import { dataOf } from '../../api/client'
import type { Order } from '../../types'

const statusTabs = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING_PAYMENT', label: '待支付' },
  { key: 'PAID', label: '已支付' },
  { key: 'SHIPPED', label: '已发货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
  { key: 'REFUNDING', label: '退款中' },
  { key: 'REFUNDED', label: '已退款' },
]

const statusColor: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', SHIPPED: 'purple', COMPLETED: 'green',
  CANCELLED: 'default', REFUNDING: 'red', REFUNDED: 'gray',
}

export default function UserOrders() {
  const nav = useNavigate()
  const [tab, setTab] = useState('ALL')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const load = (t: string) => {
    setLoading(true)
    const params: any = { page: 1, page_size: 50 }
    if (t !== 'ALL') params.status = t
    orderApi.list(params).then((r) => setOrders(dataOf(r).items)).finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  const cancel = async (id: number) => {
    await orderApi.cancel(id)
    message.success('订单已取消')
    load(tab)
  }

  const pay = (id: number) => nav(`/payment/${id}`)

  const renderActions = (o: Order) => {
    const btns: any[] = []
    if (o.status === 'PENDING_PAYMENT') {
      btns.push(<Button type="primary" size="small" onClick={() => pay(o.id)} key="pay">去支付</Button>)
      btns.push(<Popconfirm title="确认取消订单？" onConfirm={() => cancel(o.id)} key="cancel"><Button size="small">取消订单</Button></Popconfirm>)
    }
    if (o.status === 'SHIPPED') {
      btns.push(<Popconfirm title="确认已收到货物？" onConfirm={async () => { await orderApi.confirm(o.id); message.success('确认收货成功'); load(tab) }} key="confirm"><Button type="primary" size="small">确认收货</Button></Popconfirm>)
    }
    if (o.status === 'COMPLETED' && !o.items.some((i) => i.id === -1)) {
      btns.push(<Link to={`/user/orders/${o.id}`} key="review"><Button size="small" type="primary" ghost>写评价</Button></Link>)
    }
    btns.push(<Link to={`/user/orders/${o.id}`} key="detail"><Button size="small">查看详情</Button></Link>)
    if (['PAID', 'SHIPPED'].includes(o.status)) {
      btns.push(<Link to={`/user/orders/${o.id}?refund=1`} key="refund"><Button size="small" danger ghost>申请退款</Button></Link>)
    }
    return <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{btns}</div>
  }

  return (
    <Card title="我的订单">
      <Tabs items={statusTabs.map((t) => ({ key: t.key, label: t.label }))} onChange={setTab} activeKey={tab} />
      {orders.length === 0 ? <Empty description="暂无订单" style={{ padding: 40 }} /> : (
        <List
          loading={loading}
          dataSource={orders}
          renderItem={(o) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <Card size="small">
                  <Descriptions column={4} size="small" items={[
                    { key: 'no', label: '订单号', children: <Link to={`/user/orders/${o.id}`}>{o.order_no}</Link> },
                    { key: 'd', label: '创建时间', children: o.created_at },
                    { key: 'st', label: '状态', children: <Tag color={statusColor[o.status]}>{o.status_cn}</Tag> },
                    { key: 'amt', label: '实付', children: <span className="money">￥{o.pay_amount}</span> },
                  ]} />
                  <div style={{ margin: '8px 0' }}>
                    {o.items.slice(0, 3).map((i) => (
                      <span key={i.id} style={{ marginRight: 16 }}>
                        {i.product_name} ×{i.quantity}
                        {Object.entries(i.spec_values || {}).length > 0 && <span className="text-muted">({Object.values(i.spec_values || {}).join('/')})</span>}
                      </span>
                    ))}
                    {o.items.length > 3 && <span className="text-muted">…等{o.items.length}件</span>}
                  </div>
                  {renderActions(o)}
                </Card>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}